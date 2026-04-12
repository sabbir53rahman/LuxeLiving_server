import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/appError";
import status from "http-status";
import { IRequestUser } from "../../interfaces/requestUser.interface";

const getAdminOverviewStats = async () => {
  const [totalUsers, totalAgents, totalBuyers, totalSellers, totalViewings, totalRevenue] =
    await Promise.all([
      prisma.user.count({ where: { isDeleted: false } }),
      prisma.agent.count({ where: { isDeleted: false } }),
      prisma.buyer.count({ where: { isDeleted: false } }),
      prisma.seller.count({ where: { isDeleted: false } }),
      prisma.viewing.count(),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "PAID",
        },
      }),
    ]);

  const recentViewings = await prisma.viewing.findMany({
    take: 5,
    orderBy: {
      createdAt: "desc",
    },
    include: {
      buyer: {
        select: {
          name: true,
          email: true,
        },
      },
      agent: {
        select: {
          name: true,
          email: true,
        },
      },
      property: {
        select: {
          title: true,
        },
      },
    },
  });

  return {
    totalUsers,
    totalAgents,
    totalBuyers,
    totalSellers,
    totalViewings,
    totalRevenue: totalRevenue._sum.amount || 0,
    recentViewings,
  };
};

const getAgentOverviewStats = async (userId: string) => {
  const agent = await prisma.agent.findUnique({
    where: {
      userId,
    },
  });

  if (!agent) {
    throw new AppError(status.NOT_FOUND, "Agent not found");
  }

  const agentId = agent.id;

  const [totalViewings, totalReviews, totalEarnings] = await Promise.all([
    prisma.viewing.count({
      where: {
        agentId,
      },
    }),
    prisma.review.count({
      where: {
        agentId,
      },
    }),
    prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        viewing: {
          agentId,
        },
        status: "PAID",
      },
    }),
  ]);

  const upcomingViewings = await prisma.viewing.findMany({
    where: {
      agentId,
      viewingDate: {
        gte: new Date(),
      },
      status: "SCHEDULED",
    },
    include: {
      buyer: {
        select: {
          name: true,
          email: true,
        },
      },
      property: {
        select: {
          title: true,
        },
      },
    },
    take: 5,
    orderBy: {
      viewingDate: "asc",
    },
  });

  return {
    totalViewings,
    totalReviews,
    totalEarnings: totalEarnings._sum.amount || 0,
    averageRating: agent.averageRating,
    upcomingViewings,
  };
};

const getBuyerOverviewStats = async (userId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: {
      userId,
    },
  });

  if (!buyer) {
    throw new AppError(status.NOT_FOUND, "Buyer not found");
  }

  const buyerId = buyer.id;

  const [totalViewings, totalReviews, totalSpent] = await Promise.all([
    prisma.viewing.count({
      where: {
        buyerId,
      },
    }),
    prisma.review.count({
      where: {
        buyerId,
      },
    }),
    prisma.payment.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        viewing: {
          buyerId,
        },
        status: "PAID",
      },
    }),
  ]);

  const upcomingViewings = await prisma.viewing.findMany({
    where: {
      buyerId,
      viewingDate: {
        gte: new Date(),
      },
      status: "SCHEDULED",
    },
    include: {
      agent: {
        select: {
          name: true,
          email: true,
        },
      },
      property: {
        select: {
          title: true,
        },
      },
    },
    take: 5,
    orderBy: {
      viewingDate: "asc",
    },
  });

  return {
    totalViewings,
    totalReviews,
    totalSpent: totalSpent._sum.amount || 0,
    upcomingViewings,
  };
};

const getSellerOverviewStats = async (userId: string) => {
  const seller = await prisma.seller.findUnique({
    where: {
      userId,
    },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller not found");
  }

  // const sellerId = seller.id;

  const [totalProperties] = await Promise.all([
    prisma.property.count(),
  ]);

  return {
    totalProperties,
  };
};

const getDashboardStats = async (user: IRequestUser) => {
  if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
    return getAdminDashboardStats();
  } else if (user.role === "AGENT") {
    return getAgentDashboardStats(user.userId);
  } else if (user.role === "BUYER") {
    return getBuyerDashboardStats(user.userId);
  } else if (user.role === "SELLER") {
    return getSellerDashboardStats(user.userId);
  } else {
    throw new AppError(status.FORBIDDEN, "Invalid user role for dashboard");
  }
};

const getAdminDashboardStats = async () => {
  const [
    totalUsers,
    totalAgents,
    totalBuyers,
    totalSellers,
    totalProperties,
    totalViewings,
    totalRevenue,
    recentPayments,
    monthlyRevenue,
    propertyStats,
  ] = await Promise.all([
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.agent.count({ where: { isDeleted: false } }),
    prisma.buyer.count({ where: { isDeleted: false } }),
    prisma.seller.count({ where: { isDeleted: false } }),
    prisma.property.count({ where: { isDeleted: false } }),
    prisma.viewing.count(),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: "PAID" },
    }),
    prisma.payment.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        viewing: {
          include: {
            property: { select: { title: true } },
            buyer: { select: { name: true } },
            agent: { select: { name: true } },
          },
        },
      },
    }),
    getMonthlyRevenueData(),
    getPropertyStats(),
  ]);

  return {
    overview: {
      totalUsers,
      totalAgents,
      totalBuyers,
      totalSellers,
      totalProperties,
      totalViewings,
      totalRevenue: totalRevenue._sum.amount || 0,
    },
    recentPayments,
    monthlyRevenue,
    propertyStats,
  };
};

const getAgentDashboardStats = async (userId: string) => {
  const agent = await prisma.agent.findUnique({
    where: { userId },
  });

  if (!agent) {
    throw new AppError(status.NOT_FOUND, "Agent not found");
  }

  const [
    totalProperties,
    totalViewings,
    totalEarnings,
    recentViewings,
    propertyStats,
  ] = await Promise.all([
    prisma.property.count({ where: { agentId: agent.id, isDeleted: false } }),
    prisma.viewing.count({ where: { agentId: agent.id } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        viewing: { agentId: agent.id },
        status: "PAID",
      },
    }),
    prisma.viewing.findMany({
      where: { agentId: agent.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { title: true } },
        buyer: { select: { name: true } },
      },
    }),
    getAgentPropertyStats(agent.id),
  ]);

  return {
    overview: {
      totalProperties,
      totalViewings,
      totalEarnings: totalEarnings._sum.amount || 0,
      averageRating: agent.averageRating,
    },
    recentViewings,
    propertyStats,
  };
};

const getBuyerDashboardStats = async (userId: string) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId },
  });

  if (!buyer) {
    throw new AppError(status.NOT_FOUND, "Buyer not found");
  }

  const [
    totalViewings,
    totalSpent,
    upcomingViewings,
    recentReviews,
  ] = await Promise.all([
    prisma.viewing.count({ where: { buyerId: buyer.id } }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        viewing: { buyerId: buyer.id },
        status: "PAID",
      },
    }),
    prisma.viewing.findMany({
      where: {
        buyerId: buyer.id,
        viewingDate: { gte: new Date() },
        status: "SCHEDULED",
      },
      take: 5,
      orderBy: { viewingDate: "asc" },
      include: {
        property: { select: { title: true, images: true } },
        agent: { select: { name: true, contactNumber: true } },
      },
    }),
    prisma.review.findMany({
      where: { buyerId: buyer.id },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { title: true } },
        agent: { select: { name: true } },
      },
    }),
  ]);

  return {
    overview: {
      totalViewings,
      totalSpent: totalSpent._sum.amount || 0,
    },
    upcomingViewings,
    recentReviews,
  };
};

const getSellerDashboardStats = async (userId: string) => {
  const { prisma } = await import("../../lib/prisma");
  
  // Find the agent associated with this user
  const agent = await prisma.agent.findUnique({
    where: { userId },
  });

  if (!agent) {
    return {
      overview: {
        totalProperties: 0,
      },
    };
  }

  // Count properties for this agent
  const totalProperties = await prisma.property.count({
    where: {
      agentId: agent.id,
      isDeleted: false,
    },
  });

  return {
    overview: {
      totalProperties,
    },
  };
};

const getMonthlyRevenueData = async () => {
  const currentDate = new Date();
  const monthlyData = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const revenue = await prisma.payment.aggregate({
      _sum: { amount: true },
      where: {
        status: "PAID",
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
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

const getPropertyStats = async () => {
  const [
    availableProperties,
    soldProperties,
    rentedProperties,
    propertiesByType,
  ] = await Promise.all([
    prisma.property.count({ where: { status: "available", isDeleted: false } }),
    prisma.property.count({ where: { status: "sold", isDeleted: false } }),
    prisma.property.count({ where: { status: "rented", isDeleted: false } }),
    prisma.property.groupBy({
      by: ["type"],
      _count: { type: true },
      where: { isDeleted: false },
    }),
  ]);

  return {
    status: {
      available: availableProperties,
      sold: soldProperties,
      rented: rentedProperties,
    },
    byType: propertiesByType,
  };
};

const getAgentPropertyStats = async (agentId: string) => {
  const [
    totalViews,
    activeListings,
    completedViewings,
    averageRating,
  ] = await Promise.all([
    prisma.viewing.count({ where: { agentId } }),
    prisma.property.count({ where: { agentId, isDeleted: false } }),
    prisma.viewing.count({ where: { agentId, status: "COMPLETED" } }),
    prisma.agent.findUnique({
      where: { id: agentId },
      select: { averageRating: true },
    }),
  ]);

  return {
    totalViews,
    activeListings,
    completedViewings,
    averageRating: averageRating?.averageRating || 0,
  };
};

export const metaService = {
  getAdminOverviewStats,
  getAgentOverviewStats,
  getBuyerOverviewStats,
  getSellerOverviewStats,
  getDashboardStats,
};
