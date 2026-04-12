import { prisma } from "../../lib/prisma";
import AppError from "../../errorHelpers/appError";
import status from "http-status";
import {
  ICreatePropertyPayload,
  IUpdatePropertyPayload,
} from "./property.interface";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { propertySearchableFields } from "./property.constants";
import { Property } from "../../../generated/prisma/client";

const createProperty = async (
  user: IRequestUser,
  payload: ICreatePropertyPayload,
) => {
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
  } = payload;

  let agentId: string | null = null;
  let sellerId: string | null = null;

  if (user.role === "AGENT") {
    const agent = await prisma.agent.findUnique({
      where: { userId: user.userId },
    });
    if (!agent) {
      throw new AppError(status.NOT_FOUND, "Agent profile not found");
    }
    agentId = agent.id;
  } else if (user.role === "SELLER") {
    const seller = await prisma.seller.findUnique({
      where: { userId: user.userId },
    });
    if (!seller) {
      throw new AppError(status.NOT_FOUND, "Seller profile not found");
    }
    sellerId = seller.id;
  }

  const property = await prisma.property.create({
    data: {
      title,
      description,
      price,
      location,
      images: images || [],
      bedrooms,
      bathrooms,
      area,
      type,
      ...(agentId && { agentId }),
      ...(sellerId && { sellerId }),
    },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
    },
  });

  return property;
};

const getAllProperties = async (queryParams: IQueryParams) => {
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
    .sort();

  // Add custom filtering for min/max price and location
  const { minPrice, maxPrice, location } = queryParams;

  const customWhere: {
    price?: {
      gte?: number;
      lte?: number;
    };
    location?: {
      contains: string;
      mode: "insensitive";
    };
  } = {};

  if (minPrice !== undefined) {
    customWhere.price = {
      ...customWhere.price,
      gte: Number(minPrice),
    };
  }

  if (maxPrice !== undefined) {
    customWhere.price = {
      ...customWhere.price,
      lte: Number(maxPrice),
    };
  }

  if (location) {
    customWhere.location = {
      contains: location,
      mode: "insensitive",
    };
  }

  if (Object.keys(customWhere).length > 0) {
    queryBuilder.where(customWhere);
  }

  queryBuilder.include({
    agent: {
      select: {
        id: true,
        name: true,
        email: true,
        contactNumber: true,
        averageRating: true,
      },
    },
  });

  const result = await queryBuilder.execute();
  return result;
};

const getPropertyById = async (id: string) => {
  const property = await prisma.property.findUnique({
    where: { id, isDeleted: false },
    include: {
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
          bio: true,
          specialization: true,
          averageRating: true,
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
            },
          },
        },
        orderBy: { viewingDate: "desc" },
        take: 5,
      },
      reviews: {
        include: {
          buyer: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!property) {
    throw new AppError(status.NOT_FOUND, "Property not found");
  }

  // Calculate average rating
  const reviews = property.reviews;
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return {
    ...property,
    averageRating: parseFloat(averageRating.toFixed(1)),
    totalReviews: reviews.length,
  };
};

const getMyProperties = async (
  user: IRequestUser,
  queryParams: IQueryParams,
) => {
  let agentId: string | null = null;
  let sellerId: string | null = null;

  if (user.role === "AGENT") {
    const agent = await prisma.agent.findUnique({
      where: { userId: user.userId },
    });
    if (!agent) {
      throw new AppError(status.NOT_FOUND, "Agent profile not found");
    }
    agentId = agent.id;
  } else if (user.role === "SELLER") {
    const seller = await prisma.seller.findUnique({
      where: { userId: user.userId },
    });
    if (!seller) {
      throw new AppError(status.NOT_FOUND, "Seller profile not found");
    }
    sellerId = seller.id;
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
    .where({
      ...(agentId && { agentId }),
      ...(sellerId && { sellerId }),
      isDeleted: false,
    })
    .include({
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          contactNumber: true,
        },
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
    where: { id },
  });

  if (!property) {
    throw new AppError(status.NOT_FOUND, "Property not found");
  }

  // Check if user is the agent who owns the property or an admin
  const agent = await prisma.agent.findUnique({
    where: { userId: user.userId },
  });

  if (
    !agent ||
    (property.agentId !== agent.id &&
      !["ADMIN", "SUPER_ADMIN"].includes(user.role))
  ) {
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
    },
    include: {
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
    where: { id },
  });

  if (!property) {
    throw new AppError(status.NOT_FOUND, "Property not found");
  }

  // Check if user is the agent who owns the property or an admin
  const agent = await prisma.agent.findUnique({
    where: { userId: user.userId },
  });

  if (
    !agent ||
    (property.agentId !== agent.id &&
      !["ADMIN", "SUPER_ADMIN"].includes(user.role))
  ) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only delete your own properties",
    );
  }

  await prisma.property.update({
    where: { id },
    data: { isDeleted: true },
  });

  return { message: "Property deleted successfully" };
};

export const PropertyService = {
  createProperty,
  getAllProperties,
  getPropertyById,
  getMyProperties,
  updateProperty,
  deleteProperty,
};
