/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import "dotenv/config";
import AppError from "../../errorHelpers/appError";
import status from "http-status";
import { sendEmail } from "../../utils/email";
import { envVars } from "../../../config/env";

const createCheckoutSession = async (viewingId: string) => {
  const viewing = await prisma.viewing.findUnique({
    where: { id: viewingId },
    include: {
      property: true,
      buyer: true,
      agent: true,
    },
  });

  if (!viewing) {
    throw new AppError(status.NOT_FOUND, "Viewing not found");
  }

  // For real estate, perhaps a fixed viewing fee or property price
  // For now, let's assume a fixed viewing fee of $50
  const viewingFee = 50; // $50 viewing fee
  const totalAmountInCents = viewingFee * 100;

  if (viewing.paymentStatus === "PAID") {
    throw new AppError(status.BAD_REQUEST, "This viewing has already been paid.");
  }

  // Generate a unique transaction ID
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: viewing.agent 
              ? `Property Viewing with ${viewing.agent.name}`
              : `Property Viewing and Consultation`,
            description: `Viewing scheduled for ${viewing.viewingDate.toLocaleString()} at ${viewing.property.title}`,
          },
          unit_amount: totalAmountInCents,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    customer_email: viewing.buyer.email,
    client_reference_id: viewing.id,
    metadata: {
      viewingId: viewing.id,
      transactionId: transactionId,
    },
  });

  // Create or Update initial payment record using upsert
  await prisma.payment.upsert({
    where: { viewingId: viewing.id },
    create: {
      viewingId: viewing.id,
      amount: totalAmountInCents / 100,
      transactionId: transactionId,
      status: "UNPAID",
    },
    update: {
      amount: totalAmountInCents / 100,
      transactionId: transactionId,
      status: "UNPAID",
    },
  });

  return session.url;
};

const handleWebhook = async (payload: string, signature: string) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    throw new AppError(status.BAD_REQUEST, `Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const viewingId = session.client_reference_id;
    const stripeEventId = event.id;
    const paymentIntentId = session.payment_intent;
    const paymentGatewayData = JSON.parse(JSON.stringify(session));

    await prisma.$transaction(async (tx) => {
      // 1. Update Viewing status
      await tx.viewing.update({
        where: { id: viewingId },
        data: {
          paymentStatus: "PAID",
          status: "SCHEDULED", // In case it was PENDING or something
        },
      });

      // 2. Update Payment record
      await tx.payment.update({
        where: { viewingId: viewingId },
        data: {
          status: "PAID",
          stripeEventId: stripeEventId,
          paymentIntentId: paymentIntentId,
          paymentGatewayData: paymentGatewayData,
        },
      });
    });

    // 3. Send Confirmation Email
    const viewingDetails = await prisma.viewing.findUnique({
      where: { id: viewingId },
      include: {
        buyer: true,
        agent: true,
        property: true,
      },
    });

    if (viewingDetails) {
      await sendEmail({
        to: viewingDetails.buyer.email,
        subject: "LuxeLiving - Viewing Confirmation",
        templateName: "viewing_confirmation",
        templateData: {
          buyerName: viewingDetails.buyer.name,
          agentName: viewingDetails.agent?.name || "the LuxeLiving Team",
          propertyTitle: viewingDetails.property.title,
          viewingDate: viewingDetails.viewingDate.toLocaleString(),
          dashboardUrl: `${envVars.FRONTEND_URL}/dashboard/buyer`,
        },
      });
    }
  }

  return { received: true };
};

const refundPayment = async (viewingId: string) => {
  const payment = await prisma.payment.findUnique({
    where: { viewingId },
  });

  if (!payment || payment.status !== "PAID" || !payment.paymentIntentId) {
    return null; // Nothing to refund or not paid
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.paymentIntentId,
    });

    await prisma.payment.update({
      where: { viewingId },
      data: {
        status: "UNPAID", // Or add Refunded status
        paymentGatewayData: JSON.parse(JSON.stringify(refund)),
      },
    });

    return refund;
  } catch (error: any) {
    console.error("Stripe Refund Error:", error.message);
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to process refund");
  }
};

const verifyPayment = async (sessionId: string) => {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status === "paid") {
    const viewingId = session.client_reference_id;
    const paymentIntentId = session.payment_intent;
    const stripeEventId = session.id;

    const viewing = await prisma.viewing.findUnique({
      where: { id: viewingId as string },
    });

    if (viewing && viewing.paymentStatus !== "PAID") {
      await prisma.$transaction(async (tx) => {
        // 1. Update Viewing
        await tx.viewing.update({
          where: { id: viewingId as string },
          data: {
            paymentStatus: "PAID",
            status: "SCHEDULED",
          },
        });

        // 2. Update Payment
        await tx.payment.update({
          where: { viewingId: viewingId as string },
          data: {
            status: "PAID",
            paymentIntentId: paymentIntentId as string,
            stripeEventId: stripeEventId,
            paymentGatewayData: JSON.parse(JSON.stringify(session)),
          },
        });
      });

      // 3. Send Confirmation Email
      const viewingDetails = await prisma.viewing.findUnique({
        where: { id: viewingId as string },
        include: {
          buyer: true,
          agent: true,
          property: true,
        },
      });

      if (viewingDetails) {
        await sendEmail({
          to: viewingDetails.buyer.email,
          subject: "LuxeLiving - Viewing Confirmation",
          templateName: "viewing_confirmation",
          templateData: {
            buyerName: viewingDetails.buyer.name,
            agentName: viewingDetails.agent?.name || "the LuxeLiving Team",
            propertyTitle: viewingDetails.property.title,
            viewingDate: viewingDetails.viewingDate.toLocaleString(),
            dashboardUrl: `${envVars.FRONTEND_URL}/dashboard/buyer`,
          },
        });
      }
    }
    return { success: true };
  }
  return { success: false };
};

const getPaymentAnalytics = async (startDate?: Date, endDate?: Date) => {
  const dateFilter = startDate && endDate ? {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  } : {};

  const [
    totalRevenue,
    totalTransactions,
    successfulPayments,
    failedPayments,
    monthlyRevenue,
    paymentMethods,
  ] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        ...dateFilter,
      },
    }),
    prisma.payment.count({
      where: dateFilter,
    }),
    prisma.payment.count({
      where: {
        status: "PAID",
        ...dateFilter,
      },
    }),
    prisma.payment.count({
      where: {
        status: "FAILED",
        ...dateFilter,
      },
    }),
    getMonthlyPaymentData(startDate, endDate),
    getPaymentMethodStats(dateFilter),
  ]);

  return {
    overview: {
      totalRevenue: totalRevenue._sum.amount || 0,
      totalTransactions,
      successfulPayments,
      failedPayments,
      successRate: totalTransactions > 0 ? (successfulPayments / totalTransactions) * 100 : 0,
    },
    monthlyRevenue,
    paymentMethods,
  };
};

const getMonthlyPaymentData = async (startDate?: Date, endDate?: Date) => {
  const currentDate = endDate || new Date();
  const start = startDate || new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);

  const monthlyData = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const revenue = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        createdAt: {
          gte: date,
          lt: nextMonth,
        },
      },
    });

    monthlyData.push({
      month: date.toLocaleString("default", { month: "long" }),
      year: date.getFullYear(),
      revenue: revenue._sum.amount || 0,
    });
  }

  return monthlyData;
};

const getPaymentMethodStats = async (dateFilter: any) => {
  // Since we're using Stripe, most payments are card payments
  // This can be extended when more payment methods are added
  const cardPayments = await prisma.payment.count({
    where: {
      status: "PAID",
      ...dateFilter,
    },
  });

  return {
    card: cardPayments,
  };
};

const getAgentPaymentAnalytics = async (agentId: string, startDate?: Date, endDate?: Date) => {
  const dateFilter = startDate && endDate ? {
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  } : {};

  const [
    totalEarnings,
    totalViewings,
    monthlyEarnings,
  ] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        viewing: { agentId },
        ...dateFilter,
      },
    }),
    prisma.viewing.count({
      where: {
        agentId,
        paymentStatus: "PAID",
        ...dateFilter,
      },
    }),
    getAgentMonthlyEarnings(agentId, startDate, endDate),
  ]);

  return {
    totalEarnings: totalEarnings._sum.amount || 0,
    totalViewings,
    monthlyEarnings,
  };
};

const getAgentMonthlyEarnings = async (agentId: string, startDate?: Date, endDate?: Date) => {
  const currentDate = endDate || new Date();
  const start = startDate || new Date(currentDate.getFullYear(), currentDate.getMonth() - 11, 1);

  const monthlyData = [];

  for (let i = 0; i < 12; i++) {
    const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const earnings = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        viewing: { agentId },
        createdAt: {
          gte: date,
          lt: nextMonth,
        },
      },
    });

    monthlyData.push({
      month: date.toLocaleString("default", { month: "long" }),
      year: date.getFullYear(),
      earnings: earnings._sum.amount || 0,
    });
  }

  return monthlyData;
};

export const PaymentService = {
  createCheckoutSession,
  handleWebhook,
  refundPayment,
  verifyPayment,
  getPaymentAnalytics,
  getAgentPaymentAnalytics,
};
