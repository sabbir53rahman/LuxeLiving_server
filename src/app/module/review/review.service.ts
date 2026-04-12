import status from "http-status";
import AppError from "../../errorHelpers/appError";
import { IRequestUser } from "../../interfaces/requestUser.interface";
import { prisma } from "../../lib/prisma";
import { ICreateReviewPayload } from "./review.interface";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { reviewSearchableFields } from "./review.constants";
import { Review } from "../../../generated/prisma/client";

const createReview = async (
  user: IRequestUser,
  payload: ICreateReviewPayload,
) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: user.userId },
  });

  if (!buyer) {
    throw new AppError(status.NOT_FOUND, "Buyer profile not found");
  }

  // 1. Validate viewing exists and belongs to buyer
  const viewing = await prisma.viewing.findUnique({
    where: {
      id: payload.viewingId,
      buyerId: buyer.id,
      status: "COMPLETED",
    },
  });

  if (!viewing) {
    throw new AppError(
      status.FORBIDDEN,
      "You can only review after completing a verified viewing",
    );
  }

  // 2. Validate rating
  if (payload.rating < 1 || payload.rating > 5) {
    throw new AppError(status.BAD_REQUEST, "Rating must be between 1 and 5");
  }

  // 3. Check if review already exists for this viewing
  const existingReview = await prisma.review.findUnique({
    where: { viewingId: payload.viewingId },
  });

  if (existingReview) {
    throw new AppError(status.CONFLICT, "Review already exists for this viewing");
  }

  // 4. Validate that either propertyId or agentId is provided and matches the viewing
  if (payload.propertyId && payload.propertyId !== viewing.propertyId) {
    throw new AppError(status.BAD_REQUEST, "Property ID does not match the viewing");
  }

  if (payload.agentId && payload.agentId !== viewing.agentId) {
    throw new AppError(status.BAD_REQUEST, "Agent ID does not match the viewing");
  }

  if (!payload.propertyId && !payload.agentId) {
    throw new AppError(status.BAD_REQUEST, "Either propertyId or agentId must be provided");
  }

  // 5. Create the review
  const review = await prisma.review.create({
    data: {
      buyerId: buyer.id,
      propertyId: payload.propertyId,
      agentId: payload.agentId,
      viewingId: payload.viewingId,
      rating: payload.rating,
      comment: payload.comment,
    },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      property: payload.propertyId ? {
        select: {
          id: true,
          title: true,
        },
      } : false,
      agent: payload.agentId ? {
        select: {
          id: true,
          name: true,
          email: true,
        },
      } : false,
      viewing: {
        select: {
          id: true,
          viewingDate: true,
        },
      },
    },
  });

  // Update average rating for agent or property
  if (payload.agentId) {
    await updateAgentAverageRating(payload.agentId);
  }
  if (payload.propertyId) {
    // Properties don't have average rating in our schema, but could be added
  }

  return review;
};

// Helper function to update agent's average rating
const updateAgentAverageRating = async (agentId: string) => {
  const reviews = await prisma.review.findMany({
    where: { agentId },
    select: { rating: true },
  });

  if (reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await prisma.agent.update({
      where: { id: agentId },
      data: { averageRating },
    });
  }
};

const getAllReviews = async (queryParams: IQueryParams) => {
  const queryBuilder = new QueryBuilder<Review>(prisma.review, queryParams, {
    searchableFields: reviewSearchableFields,
  })
    .search()
    .filter()
    .paginate()
    .sort();

  // Add custom search by reviewer user name
  const { searchTerm } = queryParams;
  
  if (searchTerm) {
    queryBuilder.where({ 
      ...queryBuilder['query']['where'], 
      buyer: {
        name: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      }
    });
  }

  queryBuilder.include({
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
    agent: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    viewing: {
      select: {
        id: true,
        viewingDate: true,
      },
    },
  });

  const result = await queryBuilder.execute();
  return result;
};

const getMyReviews = async (user: IRequestUser, queryParams: IQueryParams) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId: user.userId },
  });

  if (!buyer) {
    throw new AppError(status.NOT_FOUND, "Buyer profile not found");
  }

  const queryBuilder = new QueryBuilder<Review>(prisma.review, queryParams, {
    searchableFields: reviewSearchableFields,
  })
    .search()
    .filter()
    .paginate()
    .sort()
    .where({ buyerId: buyer.id })
    .include({
      property: {
        select: {
          id: true,
          title: true,
        },
      },
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      viewing: {
        select: {
          id: true,
          viewingDate: true,
        },
      },
    });

  const result = await queryBuilder.execute();
  return result;
};

const moderateReview = async (reviewId: string, action: "approve" | "reject" | "flag", reason?: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  const updateData: {
    moderationStatus: "APPROVED" | "REJECTED" | "FLAGGED";
    moderatedAt: Date;
    moderationReason?: string;
  } = {
    moderationStatus: action.toUpperCase() as "APPROVED" | "REJECTED" | "FLAGGED",
    moderatedAt: new Date(),
  };

  if (reason) {
    updateData.moderationReason = reason;
  }

  const updatedReview = await prisma.review.update({
    where: { id: reviewId },
    data: updateData,
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
      agent: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      viewing: {
        select: {
          id: true,
          viewingDate: true,
        },
      },
    },
  });

  return updatedReview;
};

const deleteReview = async (reviewId: string) => {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    throw new AppError(status.NOT_FOUND, "Review not found");
  }

  await prisma.review.delete({
    where: { id: reviewId },
  });

  return { message: "Review deleted successfully" };
};

export const ReviewService = {
  createReview,
  getAllReviews,
  getMyReviews,
  moderateReview,
  deleteReview,
};
