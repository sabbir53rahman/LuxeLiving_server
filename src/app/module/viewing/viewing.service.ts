import status from "http-status";
import AppError from "../../errorHelpers/appError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import {
  ICreateViewingPayload,
  IUpdateViewingPayload,
} from "./viewing.interface";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { viewingSearchableFields } from "./viewing.constants";
import { PaymentService } from "../payment/payment.service";
import { Viewing } from "../../../generated/prisma/client";

const createViewing = async (
  user: IRequestUser,
  payload: ICreateViewingPayload,
) => {
  // Validate required fields
  if (!payload.propertyId) {
    throw new AppError(status.BAD_REQUEST, "Property ID is required");
  }

  // Handle both combined viewingDate or separate date and time fields
  let viewingDate: Date;
  
  // Debug: Log the payload to see what's being sent
  console.log("Viewing payload:", payload);
  
  if (payload.viewingDate) {
    // Combined datetime field
    viewingDate = new Date(payload.viewingDate);
  } else if (payload.date && payload.time) {
    // Separate date and time fields (from frontend form)
    viewingDate = new Date(`${payload.date} ${payload.time}`);
  } else if (payload.preferredDate && payload.preferredTime) {
    // Alternative field names from frontend form
    // Handle both ISO date strings and regular date strings
    const dateStr = payload.preferredDate.includes('T') 
      ? payload.preferredDate.split('T')[0] // Extract date part from ISO string
      : payload.preferredDate;
    viewingDate = new Date(`${dateStr} ${payload.preferredTime}`);
  } else if (payload.date && payload.preferredTime) {
    // Mixed field names
    const dateStr = payload.date.includes('T') 
      ? payload.date.split('T')[0] 
      : payload.date;
    viewingDate = new Date(`${dateStr} ${payload.preferredTime}`);
  } else if (payload.preferredDate && payload.time) {
    // Mixed field names
    const dateStr = payload.preferredDate.includes('T') 
      ? payload.preferredDate.split('T')[0] 
      : payload.preferredDate;
    viewingDate = new Date(`${dateStr} ${payload.time}`);
  } else {
    // Provide more detailed error message
    const availableFields = Object.keys(payload);
    throw new AppError(
      status.BAD_REQUEST, 
      `Viewing date and time are required. Available fields: ${availableFields.join(', ')}`
    );
  }

  const buyer = await prisma.buyer.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!buyer) {
    throw new AppError(status.NOT_FOUND, "Buyer not found with this user");
  }

  const property = await prisma.property.findUnique({
    where: {
      id: payload.propertyId,
      isDeleted: false,
    },
  });

  if (!property) {
    throw new AppError(status.NOT_FOUND, "Property not found");
  }

  // Validate viewingDate is a valid date
  if (isNaN(viewingDate.getTime())) {
    throw new AppError(
      status.BAD_REQUEST,
      "Invalid viewing date format. Please provide a valid date.",
    );
  }

  // Determine agent assignment
  let assignedAgentId = payload.agentId;

  // If no agentId provided but property is assigned to an agent, auto-assign
  if (!assignedAgentId && property.agentId) {
    assignedAgentId = property.agentId;
  }

  // Validate agent if agentId is determined
  if (assignedAgentId) {
    const agent = await prisma.agent.findFirst({
      where: {
        id: assignedAgentId,
        isDeleted: false,
      },
    });

    if (!agent) {
      throw new AppError(status.NOT_FOUND, "Agent not found");
    }

    if (!agent.isAvailable) {
      throw new AppError(
        status.FORBIDDEN,
        "This agent is not currently available.",
      );
    }

    // Check for conflicting viewings for the agent at the same time
    const conflictingViewing = await prisma.viewing.findFirst({
      where: {
        agentId: assignedAgentId,
        viewingDate: viewingDate,
        status: { not: "CANCELLED" },
      },
    });

    if (conflictingViewing) {
      throw new AppError(
        status.CONFLICT,
        "Agent has another viewing scheduled at this time.",
      );
    }
  }

  const now = new Date();
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

  if (viewingDate < oneHourFromNow) {
    throw new AppError(
      status.BAD_REQUEST,
      "Viewing must be scheduled at least 1 hour in advance.",
    );
  }

  // Create the viewing
  const viewing = await prisma.viewing.create({
    data: {
      buyerId: buyer.id,
      propertyId: payload.propertyId,
      agentId: assignedAgentId,
      viewingDate: viewingDate,
      notes: payload.notes,
    },
    include: {
      buyer: true,
      property: true,
      agent: true,
    },
  });

  return viewing;
};

const getAllViewings = async (queryParams: IQueryParams) => {
  const queryBuilder = new QueryBuilder<Viewing>(prisma.viewing, queryParams, {
    searchableFields: viewingSearchableFields,
  })
    .search()
    .filter()
    .paginate()
    .sort()
    .include({
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          specialization: true,
          commissionRate: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          price: true,
          location: true,
          images: true,
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          transactionId: true,
          status: true,
        },
      },
      review: true,
    });

  const result = await queryBuilder.execute();
  return result;
};

const getMyViewings = async (user: IRequestUser, queryParams: IQueryParams) => {
  const buyer = await prisma.buyer.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!buyer) {
    throw new AppError(status.NOT_FOUND, "Buyer not found with this user");
  }

  const condition = { buyerId: buyer.id };

  const queryBuilder = new QueryBuilder<Viewing>(prisma.viewing, queryParams, {
    searchableFields: viewingSearchableFields,
  })
    .search()
    .filter()
    .paginate()
    .sort()
    .where(condition)
    .include({
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          specialization: true,
          commissionRate: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          price: true,
          location: true,
          images: true,
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          transactionId: true,
          status: true,
        },
      },
      review: true,
    });

  const result = await queryBuilder.execute();
  return result;
};

const getViewingById = async (id: string) => {
  const viewing = await prisma.viewing.findUnique({
    where: { id },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          specialization: true,
          commissionRate: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          price: true,
          location: true,
          images: true,
        },
      },
      payment: true,
      review: true,
    },
  });

  if (!viewing) {
    throw new AppError(status.NOT_FOUND, "Viewing not found");
  }

  return viewing;
};

const updateViewing = async (id: string, payload: IUpdateViewingPayload) => {
  const isViewingExist = await prisma.viewing.findUnique({
    where: {
      id,
    },
  });

  if (!isViewingExist) {
    throw new AppError(status.NOT_FOUND, "Viewing not found");
  }

  const updatedViewing = await prisma.viewing.update({
    where: {
      id,
    },
    data: {
      ...payload,
      viewingDate: payload.viewingDate ? new Date(payload.viewingDate) : undefined,
    },
  });

  return updatedViewing;
};

const deleteViewing = async (id: string) => {
  const viewing = await prisma.viewing.findUnique({
    where: { id },
  });

  if (!viewing) {
    throw new AppError(status.NOT_FOUND, "Viewing not found");
  }

  await prisma.payment.deleteMany({
    where: { viewingId: id },
  });

  const deletedViewing = await prisma.viewing.delete({
    where: { id },
  });

  return deletedViewing;
};

const cancelViewing = async (id: string) => {
  const viewing = await prisma.viewing.findUnique({
    where: { id },
  });

  if (!viewing) {
    throw new AppError(status.NOT_FOUND, "Viewing not found");
  }

  // 1. Trigger Refund if PAID
  if (viewing.paymentStatus === "PAID") {
    await PaymentService.refundPayment(id);
  }

  // 2. Delete payment record first (to satisfy Prisma relation constraints)
  await prisma.payment.deleteMany({
    where: { viewingId: id },
  });

  // 3. Delete the viewing completely from the database
  const result = await prisma.viewing.delete({
    where: { id },
  });

  return result;
};

export const ViewingService = {
  createViewing,
  getAllViewings,
  getMyViewings,
  getViewingById,
  updateViewing,
  deleteViewing,
  cancelViewing,
};
