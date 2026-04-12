import { prisma } from "../../lib/prisma";
import { userSafeSelect } from "./user.constants";
import { IUpdateProfilePayload, IUpdateAgentProfilePayload, IUpdateBuyerProfilePayload, IUpdateSellerProfilePayload } from "./user.interface";
import AppError from "../../errorHelpers/appError";
import status from "http-status";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { User } from "../../../generated/prisma/client";

const getMyProfile = async (userId: string) => {
  const result = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...userSafeSelect,
      agent: true,
      buyer: true,
      seller: true,
      admin: true,
    },
  });
  return result;
};

const updateMyProfile = async (userId: string, payload: IUpdateProfilePayload) => {
  const result = await prisma.user.update({
    where: { id: userId },
    data: payload,
    select: {
      ...userSafeSelect,
      agent: true,
      buyer: true,
      seller: true,
      admin: true,
    },
  });
  return result;
};

const updateAgentProfile = async (userId: string, payload: IUpdateAgentProfilePayload) => {
  const agent = await prisma.agent.findUnique({
    where: { userId },
  });

  if (!agent) {
    throw new AppError(status.NOT_FOUND, "Agent profile not found");
  }

  // Update both user and agent profile
  const result = await prisma.$transaction(async (tx) => {
    // Update user profile
    const userUpdate: Partial<IUpdateProfilePayload> = {};
    if (payload.name) userUpdate.name = payload.name;
    if (payload.profilePhoto) userUpdate.profilePhoto = payload.profilePhoto;
    if (payload.contactNumber) userUpdate.contactNumber = payload.contactNumber;
    if (payload.address) userUpdate.address = payload.address;

    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userUpdate,
      });
    }

    // Update agent profile
    const agentUpdate: {
      licenseNumber?: string;
      experience?: number;
      bio?: string;
      specialization?: string;
      commissionRate?: number;
      isAvailable?: boolean;
    } = {};
    if (payload.licenseNumber !== undefined) agentUpdate.licenseNumber = payload.licenseNumber;
    if (payload.experience !== undefined) agentUpdate.experience = payload.experience;
    if (payload.bio !== undefined) agentUpdate.bio = payload.bio;
    if (payload.specialization !== undefined) agentUpdate.specialization = payload.specialization;
    if (payload.commissionRate !== undefined) agentUpdate.commissionRate = payload.commissionRate;
    if (payload.isAvailable !== undefined) agentUpdate.isAvailable = payload.isAvailable;

    if (Object.keys(agentUpdate).length > 0) {
      await tx.agent.update({
        where: { userId },
        data: agentUpdate,
      });
    }

    // Return updated profile
    return tx.user.findUnique({
      where: { id: userId },
      select: {
        ...userSafeSelect,
        agent: true,
      },
    });
  });

  return result;
};

const updateBuyerProfile = async (userId: string, payload: IUpdateBuyerProfilePayload) => {
  const buyer = await prisma.buyer.findUnique({
    where: { userId },
  });

  if (!buyer) {
    throw new AppError(status.NOT_FOUND, "Buyer profile not found");
  }

  // Update both user and buyer profile
  const result = await prisma.$transaction(async (tx) => {
    // Update user profile
    const userUpdate: { name?: string; image?: string } = {};
    if (payload.name) userUpdate.name = payload.name;
    if (payload.profilePhoto) userUpdate.image = payload.profilePhoto;

    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userUpdate,
      });
    }

    // Update buyer profile
    const buyerUpdate: {
      contactNumber?: string;
      address?: string;
    } = {};
    if (payload.contactNumber !== undefined) buyerUpdate.contactNumber = payload.contactNumber;
    if (payload.address !== undefined) buyerUpdate.address = payload.address;

    if (Object.keys(buyerUpdate).length > 0) {
      await tx.buyer.update({
        where: { userId },
        data: buyerUpdate,
      });
    }

    // Return updated profile
    return tx.user.findUnique({
      where: { id: userId },
      select: {
        ...userSafeSelect,
        buyer: true,
      },
    });
  });

  return result;
};

const updateSellerProfile = async (userId: string, payload: IUpdateSellerProfilePayload) => {
  const seller = await prisma.seller.findUnique({
    where: { userId },
  });

  if (!seller) {
    throw new AppError(status.NOT_FOUND, "Seller profile not found");
  }

  // Update both user and seller profile
  const result = await prisma.$transaction(async (tx) => {
    // Update user profile
    const userUpdate: { name?: string; image?: string } = {};
    if (payload.name) userUpdate.name = payload.name;
    if (payload.profilePhoto) userUpdate.image = payload.profilePhoto;

    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userUpdate,
      });
    }

    // Update seller profile
    const sellerUpdate: {
      contactNumber?: string;
      address?: string;
      propertyCount?: number;
      averagePropertyValue?: number;
      isProfessionalSeller?: boolean;
      companyName?: string;
    } = {};
    if (payload.contactNumber !== undefined) sellerUpdate.contactNumber = payload.contactNumber;
    if (payload.address !== undefined) sellerUpdate.address = payload.address;
    if (payload.propertyCount !== undefined) sellerUpdate.propertyCount = payload.propertyCount;
    if (payload.averagePropertyValue !== undefined) sellerUpdate.averagePropertyValue = payload.averagePropertyValue;
    if (payload.isProfessionalSeller !== undefined) sellerUpdate.isProfessionalSeller = payload.isProfessionalSeller;
    if (payload.companyName !== undefined) sellerUpdate.companyName = payload.companyName;

    if (Object.keys(sellerUpdate).length > 0) {
      await tx.seller.update({
        where: { userId },
        data: sellerUpdate,
      });
    }

    // Return updated profile
    return tx.user.findUnique({
      where: { id: userId },
      select: {
        ...userSafeSelect,
        seller: true,
      },
    });
  });

  return result;
};

const getAllUsers = async (queryParams: IQueryParams) => {
  const userSearchableFields = ["name", "email"];
  
  const queryBuilder = new QueryBuilder<User>(prisma.user, queryParams, {
    searchableFields: userSearchableFields,
  })
    .search()
    .filter()
    .paginate()
    .sort()
    .where({ isDeleted: false })
    .include({
      agent: {
        select: {
          id: true,
          licenseNumber: true,
          experience: true,
          averageRating: true,
          commissionRate: true,
          isAvailable: true,
        },
      },
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          contactNumber: true,
          address: true,
        },
      },
      seller: {
        select: {
          id: true,
          name: true,
          email: true,
          profilePhoto: true,
          contactNumber: true,
          address: true,
        },
      },
    });

  const result = await queryBuilder.execute();
  return result;
};

export const UserService = {
  getMyProfile,
  updateMyProfile,
  updateAgentProfile,
  updateBuyerProfile,
  updateSellerProfile,
  getAllUsers,
};
