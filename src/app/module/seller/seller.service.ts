import status from "http-status";
import AppError from "../../errorHelpers/appError";
import { prisma } from "../../lib/prisma";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import {
  ICreatePropertyPayload,
  IUpdatePropertyPayload,
  ISellerStats,
  IUpdateViewingStatusPayload,
  IAgentRequestPayload,
  IUpdateSellerProfilePayload,
} from "./seller.interface";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { propertySearchableFields } from "./seller.constants";
import { Property, Prisma } from "../../../generated/prisma/client";
import { UploadService } from "../upload/upload.service";

// Property Management
const createProperty = async (
  user: IRequestUser,
  payload: ICreatePropertyPayload,
  files?: Express.Multer.File[],
) => {
  if (!payload) {
    throw new AppError(status.BAD_REQUEST, "Property data is required");
  }

  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  // Upload images to Cloudinary if files are provided
  let imageUrls: string[] = [];
  if (files && files.length > 0) {
    const uploadResults = await UploadService.uploadMultipleImages(files);
    imageUrls = uploadResults.map((result) => result.url);
  }

  // Use uploaded URLs or provided URLs from payload
  const images = imageUrls.length > 0 ? imageUrls : payload.images || [];

  const {
    agentId,
    title,
    description,
    price,
    location,
    bedrooms,
    bathrooms,
    area,
    type,
  } = payload;
  const property = await prisma.property.create({
    data: {
      title,
      description,
      price,
      location,
      images,
      bedrooms,
      bathrooms,
      area,
      type,
      sellerId: seller.id,
      ...(agentId && { agentId }),
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
    },
  });

  // Update seller property count
  await prisma.seller.update({
    where: { id: seller.id },
    data: {
      propertyCount: {
        increment: 1,
      },
    },
  });

  return property;
};

const getMyProperties = async (
  user: IRequestUser,
  queryParams: IQueryParams,
) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const queryBuilder = new QueryBuilder<Property>(
    prisma.property,
    queryParams,
    {
      searchableFields: propertySearchableFields,
    },
  )
    .search()
    .filter()
    .paginate()
    .sort()
    .where({ sellerId: seller.id, isDeleted: false })
    .include({
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
      viewings: {
        where: { status: { not: "CANCELLED" } },
        select: {
          id: true,
          viewingDate: true,
          status: true,
        },
        orderBy: { viewingDate: "desc" },
        take: 3,
      },
    });

  const result = await queryBuilder.execute();
  return result;
};

const updateProperty = async (
  id: string,
  user: IRequestUser,
  payload: IUpdatePropertyPayload,
) => {
  const property = await prisma.property.findUnique({
    where: { id, isDeleted: false },
  });

  if (!property) {
    throw new AppError(status.NOT_FOUND, "Property not found");
  }

  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller || property.sellerId !== seller.id) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only update your own properties",
    );
  }

  const {
    title,
    description,
    price,
    location,
    images,
    bedrooms,
    bathrooms,
    area,
    type,
    status: propertyStatus,
    agentId,
  } = payload;
  const updatedProperty = await prisma.property.update({
    where: { id },
    data: {
      title,
      description,
      price,
      location,
      images,
      bedrooms,
      bathrooms,
      area,
      type,
      status: propertyStatus as string,
      agentId,
    },
    include: {
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
    },
  });

  return updatedProperty;
};

const deleteProperty = async (id: string, user: IRequestUser) => {
  const property = await prisma.property.findUnique({
    where: { id, isDeleted: false },
  });

  if (!property) {
    throw new AppError(status.NOT_FOUND, "Property not found");
  }

  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller || property.sellerId !== seller.id) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own properties",
    );
  }

  await prisma.property.update({
    where: { id },
    data: { isDeleted: true },
  });

  // Update seller property count
  await prisma.seller.update({
    where: { id: seller.id },
    data: {
      propertyCount: {
        decrement: 1,
      },
    },
  });

  return { message: "Property deleted successfully" };
};

// Inquiry Management (through viewings)
const getPropertyInquiries = async (
  user: IRequestUser,
  propertyId: string,
  queryParams: IQueryParams,
) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId, sellerId: seller.id },
  });

  if (!property) {
    throw new AppError(
      status.NOT_FOUND,
      "Property not found or you don't own it",
    );
  }

  const queryBuilder = new QueryBuilder(prisma.viewing, queryParams, {
    searchableFields: ["notes"],
  })
    .filter()
    .paginate()
    .sort()
    .where({ propertyId, status: { not: "CANCELLED" } })
    .include({
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
          profilePhoto: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          price: true,
        },
      },
    });

  const result = await queryBuilder.execute();
  return result;
};

// Viewing Management
const getPropertyViewings = async (
  user: IRequestUser,
  propertyId: string,
  queryParams: IQueryParams,
) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId, sellerId: seller.id },
  });

  if (!property) {
    throw new AppError(
      status.NOT_FOUND,
      "Property not found or you don't own it",
    );
  }

  const queryBuilder = new QueryBuilder(prisma.viewing, queryParams, {
    searchableFields: ["notes"],
  })
    .filter()
    .paginate()
    .sort()
    .where({ propertyId })
    .include({
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
          profilePhoto: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
          price: true,
        },
      },
    });

  const result = await queryBuilder.execute();
  return result;
};

const updateViewingStatus = async (
  viewingId: string,
  user: IRequestUser,
  payload: IUpdateViewingStatusPayload,
) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const viewing = await prisma.viewing.findUnique({
    where: { id: viewingId },
    include: {
      property: true,
    },
  });

  if (!viewing) {
    throw new AppError(status.NOT_FOUND, "Viewing not found");
  }

  if (viewing.property.sellerId !== seller.id) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only update viewings for your properties",
    );
  }

  const updatedViewing = await prisma.viewing.update({
    where: { id: viewingId },
    data: { status: payload.status },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      property: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return updatedViewing;
};

// Sales Tracking
const getSellerStats = async (user: IRequestUser): Promise<ISellerStats> => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const properties = await prisma.property.findMany({
    where: { sellerId: seller.id, isDeleted: false },
  });

  const totalProperties = properties.length;
  const availableProperties = properties.filter(
    (p) => p.status === "available",
  ).length;
  const soldProperties = properties.filter((p) => p.status === "sold").length;
  const rentedProperties = properties.filter(
    (p) => p.status === "rented",
  ).length;

  const viewings = await prisma.viewing.findMany({
    where: {
      property: { sellerId: seller.id },
      status: { not: "CANCELLED" },
    },
  });

  const totalViewings = viewings.length;
  const completedViewings = viewings.filter(
    (v) => v.status === "COMPLETED",
  ).length;

  const soldPropertiesData = properties.filter((p) => p.status === "sold");
  const totalRevenue = soldPropertiesData.reduce((sum, p) => sum + p.price, 0);
  const averagePropertyValue =
    totalProperties > 0
      ? properties.reduce((sum, p) => sum + p.price, 0) / totalProperties
      : 0;

  return {
    totalProperties,
    availableProperties,
    soldProperties,
    rentedProperties,
    totalViewings,
    completedViewings,
    totalRevenue,
    averagePropertyValue,
  };
};

const getSalesHistory = async (
  user: IRequestUser,
  queryParams: IQueryParams,
) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const queryBuilder = new QueryBuilder(prisma.property, queryParams, {
    searchableFields: propertySearchableFields,
  })
    .filter()
    .paginate()
    .sort()
    .where({ sellerId: seller.id, status: "sold", isDeleted: false })
    .include({
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      viewings: {
        where: { status: "COMPLETED" },
        select: {
          id: true,
          viewingDate: true,
          buyer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    });

  const result = await queryBuilder.execute();
  return result;
};

// Agent Collaboration
const requestAgent = async (
  user: IRequestUser,
  payload: IAgentRequestPayload,
) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const agent = await prisma.agent.findUnique({
    where: { id: payload.agentId, isDeleted: false },
  });

  if (!agent) {
    throw new AppError(status.NOT_FOUND, "Agent not found");
  }

  if (!agent.isAvailable) {
    throw new AppError(
      status.BAD_REQUEST,
      "This agent is not currently available",
    );
  }

  // Update properties to assign this agent
  const updatedProperties = await prisma.property.updateMany({
    where: { sellerId: seller.id, agentId: null },
    data: { agentId: agent.id },
  });

  return {
    message: "Agent assigned successfully",
    assignedPropertiesCount: updatedProperties.count,
    agent: {
      id: agent.id,
      name: agent.name,
      email: agent.email,
      contactNumber: agent.contactNumber,
    },
  };
};

const getAssignedAgents = async (user: IRequestUser) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const properties = await prisma.property.findMany({
    where: { sellerId: seller.id, agentId: { not: null }, isDeleted: false },
    select: {
      agentId: true,
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
          specialization: true,
          averageRating: true,
          isAvailable: true,
        },
      },
    },
  });

  const uniqueAgents = new Map();
  properties.forEach((property) => {
    if (property.agent) {
      uniqueAgents.set(property.agent.id, property.agent);
    }
  });

  return {
    agents: Array.from(uniqueAgents.values()),
    totalAgents: uniqueAgents.size,
  };
};

const removeAgentFromProperty = async (
  user: IRequestUser,
  propertyId: string,
) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId, sellerId: seller.id },
  });

  if (!property) {
    throw new AppError(
      status.NOT_FOUND,
      "Property not found or you don't own it",
    );
  }

  const updatedProperty = await prisma.property.update({
    where: { id: propertyId },
    data: { agentId: null },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    message: "Agent removed from property successfully",
    property: {
      id: updatedProperty.id,
      title: updatedProperty.title,
    },
  };
};

// Seller Profile
const getSellerEarnings = async (userId: string, queryParams: IQueryParams) => {
  const seller = await prisma.seller.findUnique({
    where: { userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller not found");
  }

  const { startDate, endDate } = queryParams;

  const dateFilter: {
    createdAt?: {
      gte?: Date;
      lte?: Date;
    };
  } = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.lte = new Date(endDate);
  }

  // Get seller's properties with completed viewings
  const properties = await prisma.property.findMany({
    where: {
      sellerId: seller.id,
      isDeleted: false,
      ...dateFilter,
    },
    include: {
      viewings: {
        where: {
          status: "COMPLETED",
          payment: {
            status: "PAID",
          },
        },
        include: {
          payment: {
            select: {
              id: true,
              amount: true,
              createdAt: true,
              status: true,
            },
          },
          property: {
            select: {
              id: true,
              title: true,
              price: true,
            },
          },
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          commissionRate: true,
        },
      },
    },
  });

  // Calculate earnings
  let totalSales = 0;
  let totalCommissionPaid = 0;
  let totalEarnings = 0;
  let completedViewings = 0;

  properties.forEach((property) => {
    property.viewings.forEach((viewing) => {
      if (
        viewing.status === "COMPLETED" &&
        viewing.payment?.status === "PAID"
      ) {
        const propertyPrice = property.price;
        const agentCommission = property.agent
          ? propertyPrice * (property.agent.commissionRate / 100)
          : 0;

        totalSales += propertyPrice;
        totalCommissionPaid += agentCommission;
        totalEarnings += propertyPrice - agentCommission; // Seller gets property price minus agent commission
        completedViewings += 1;
      }
    });
  });

  // Calculate monthly breakdown
  const monthlyData = properties.reduce(
    (acc, property) => {
      property.viewings.forEach((viewing) => {
        if (
          viewing.status === "COMPLETED" &&
          viewing.payment?.status === "PAID"
        ) {
          const month = viewing.createdAt.toISOString().slice(0, 7); // YYYY-MM
          if (!acc[month]) {
            acc[month] = { sales: 0, earnings: 0, properties: 0 };
          }
          const propertyPrice = property.price;
          const agentCommission = property.agent
            ? propertyPrice * (property.agent.commissionRate / 100)
            : 0;
          const sellerEarning = propertyPrice - agentCommission;

          acc[month].sales += propertyPrice;
          acc[month].earnings += sellerEarning;
          acc[month].properties += 1;
        }
      });
      return acc;
    },
    {} as Record<
      string,
      { sales: number; earnings: number; properties: number }
    >,
  );

  return {
    totalSales,
    totalCommissionPaid,
    totalEarnings,
    completedViewings,
    averageSalePrice:
      completedViewings > 0 ? totalSales / completedViewings : 0,
    monthlyData,
    topPerformingMonths: Object.entries(monthlyData)
      .sort(([, a], [, b]) => b.earnings - a.earnings)
      .slice(0, 6)
      .map(([month, data]) => ({ month, ...data })),
    recentSales: properties.flatMap((property) =>
      property.viewings
        .filter((v) => v.status === "COMPLETED" && v.payment?.status === "PAID")
        .map((v) => ({
          propertyId: property.id,
          propertyTitle: property.title,
          salePrice: property.price,
          agentCommission: property.agent
            ? property.price * (property.agent.commissionRate / 100)
            : 0,
          sellerEarning:
            property.price -
            (property.agent
              ? property.price * (property.agent.commissionRate / 100)
              : 0),
          date: v.createdAt,
        }))
        .slice(0, 10),
    ),
  };
};

const getMySellerProfile = async (user: IRequestUser) => {
  const seller = await prisma.seller.findUnique({
    where: {
      userId: user.userId,
      isDeleted: false,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          needsPasswordChange: true,
          isDeleted: true,
          image: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  return seller;
};

const updateSellerProfile = async (
  user: IRequestUser,
  payload: IUpdateSellerProfilePayload,
) => {
  const seller = await prisma.seller.findUnique({
    where: { userId: user.userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update user profile
    const userUpdate: Prisma.UserUpdateInput = {};
    if (payload.name) userUpdate.name = payload.name;
    if (payload.profilePhoto) userUpdate.image = payload.profilePhoto;
    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: user.userId },
        data: userUpdate,
      });
    }

    // Update seller profile
    const sellerUpdate: Prisma.SellerUpdateInput = {};
    if (payload.name) sellerUpdate.name = payload.name;
    if (payload.email) sellerUpdate.email = payload.email;
    if (payload.profilePhoto) sellerUpdate.profilePhoto = payload.profilePhoto;
    if (payload.contactNumber)
      sellerUpdate.contactNumber = payload.contactNumber;
    if (payload.address) sellerUpdate.address = payload.address;
    if (payload.propertyCount !== undefined)
      sellerUpdate.propertyCount = payload.propertyCount;
    if (payload.averagePropertyValue !== undefined)
      sellerUpdate.averagePropertyValue = payload.averagePropertyValue;
    if (payload.isProfessionalSeller !== undefined)
      sellerUpdate.isProfessionalSeller = payload.isProfessionalSeller;
    if (payload.companyName) sellerUpdate.companyName = payload.companyName;

    if (Object.keys(sellerUpdate).length > 0) {
      await tx.seller.update({
        where: { userId: user.userId },
        data: sellerUpdate,
      });
    }

    // Return updated profile
    return tx.seller.findUnique({
      where: { userId: user.userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
          },
        },
      },
    });
  });

  return result;
};

export const SellerService = {
  // Property Management
  createProperty,
  getMyProperties,
  updateProperty,
  deleteProperty,

  // Inquiry Management
  getPropertyInquiries,
  getSellerEarnings,

  // Viewing Management
  getPropertyViewings,
  updateViewingStatus,

  // Sales Tracking
  getSellerStats,
  getSalesHistory,

  // Agent Collaboration
  requestAgent,
  getAssignedAgents,
  removeAgentFromProperty,

  // Seller Profile
  getMySellerProfile,
  updateSellerProfile,
};
