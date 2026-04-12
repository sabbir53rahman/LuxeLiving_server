import status from "http-status";
import AppError from "../../errorHelpers/appError";

import { prisma } from "../../lib/prisma";
import { userSafeSelect } from "../user/user.constants";
import { IUpdateAgentPayload } from "./agent.interface";
import { IQueryParams } from "../../interfaces/query.interface";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { Viewing } from "../../../generated/prisma/client";
import { UserStatus } from "../../../generated/prisma/enums";
import { Agent } from "../../../generated/prisma/client";

const getAllAgents = async (queryParams: IQueryParams) => {
  const { searchTerm } = queryParams;

  // Create query builder with only direct searchable fields
  const queryBuilder = new QueryBuilder<Agent>(prisma.agent, queryParams, {
    searchableFields: ["specialization", "bio"], // Only fields that don't have user equivalents
  })
    .filter()
    .paginate()
    .sort()
    .where({ isDeleted: false })
    .include({ user: { select: userSafeSelect } });

  // Get the built query and modify where condition for agent name and email search
  const query = queryBuilder.getQuery();

  // Handle search for agent name and email (from both agent and user tables)
  if (searchTerm) {
    query.where = {
      ...query.where,
      OR: [
        // Search in agent direct fields
        { name: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { specialization: { contains: searchTerm, mode: "insensitive" } },
        { bio: { contains: searchTerm, mode: "insensitive" } },
        // Search in user table fields
        { user: { name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
      ],
    };
  }

  // Execute the query with modified where condition
  const [total, data] = await Promise.all([
    prisma.agent.count({ where: query.where } as Parameters<
      typeof prisma.agent.count
    >[0]),
    prisma.agent.findMany(query as Parameters<typeof prisma.agent.findMany>[0]),
  ]);

  // Get pagination info
  const page = queryParams.page ? parseInt(queryParams.page as string) : 1;
  const limit = queryParams.limit ? parseInt(queryParams.limit as string) : 10;
  const totalPages = Math.ceil(total / limit);

  const meta = {
    page,
    limit,
    total,
    totalPages,
  };

  return {
    data,
    meta,
  };
};

const getAgentById = async (id: string) => {
  console.log("Looking for agent with ID:", id);

  const agent = await prisma.agent.findUnique({
    where: {
      id,
      isDeleted: false,
    },
    include: {
      user: {
        select: userSafeSelect,
      },
      reviews: {
        include: {
          buyer: true,
        },
      },
    },
  });

  if (!agent) {
    // Check if agent exists but is deleted
    const deletedAgent = await prisma.agent.findUnique({
      where: { id },
      select: { id: true, isDeleted: true },
    });

    if (deletedAgent) {
      console.log("Agent found but is deleted:", deletedAgent);
      throw new AppError(status.NOT_FOUND, "Agent not found (deleted)");
    } else {
      console.log("Agent not found at all with ID:", id);
      // List all agents for debugging
      const allAgents = await prisma.agent.findMany({
        select: { id: true, userId: true },
      });
      console.log(
        "All available agent IDs:",
        allAgents.map((a) => ({ id: a.id, userId: a.userId })),
      );
      throw new AppError(status.NOT_FOUND, "Agent not found");
    }
  }

  return agent;
};

const getMyAgentProfile = async (userId: string) => {
  const agent = await prisma.agent.findUnique({
    where: {
      userId,
      isDeleted: false,
    },
    include: {
      user: {
        select: userSafeSelect,
      },
      reviews: {
        include: {
          buyer: true,
        },
      },
    },
  });

  if (!agent) {
    throw new AppError(status.NOT_FOUND, "Agent profile not found");
  }

  return agent;
};

const updateAgent = async (id: string, payload: IUpdateAgentPayload) => {
  const isAgentExist = await prisma.agent.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!isAgentExist) {
    throw new AppError(status.NOT_FOUND, "Agent not found");
  }

  // Update both user and agent profile
  const result = await prisma.$transaction(async (tx) => {
    // Update user profile
    const userUpdate: { name?: string; image?: string } = {};
    if (payload.name) userUpdate.name = payload.name;
    if (payload.profilePhoto) userUpdate.image = payload.profilePhoto;

    if (Object.keys(userUpdate).length > 0) {
      await tx.user.update({
        where: { id: isAgentExist.userId },
        data: userUpdate,
      });
    }

    // Update agent profile
    const agentUpdate: {
      contactNumber?: string;
      address?: string;
      licenseNumber?: string;
      experience?: number;
      bio?: string;
      specialization?: string;
      isAvailable?: boolean;
      commissionRate?: number;
    } = {};
    if (payload.contactNumber !== undefined)
      agentUpdate.contactNumber = payload.contactNumber;
    if (payload.address !== undefined) agentUpdate.address = payload.address;
    if (payload.licenseNumber !== undefined)
      agentUpdate.licenseNumber = payload.licenseNumber;
    if (payload.experience !== undefined)
      agentUpdate.experience = payload.experience;
    if (payload.bio !== undefined) agentUpdate.bio = payload.bio;
    if (payload.specialization !== undefined) {
      // Handle both string and array inputs
      if (Array.isArray(payload.specialization)) {
        agentUpdate.specialization = payload.specialization.join(", ");
      } else {
        agentUpdate.specialization = payload.specialization;
      }
    }
    if (payload.isAvailable !== undefined)
      agentUpdate.isAvailable = payload.isAvailable;
    if (payload.commissionRate !== undefined)
      agentUpdate.commissionRate = payload.commissionRate;

    if (Object.keys(agentUpdate).length > 0) {
      await tx.agent.update({
        where: { id },
        data: agentUpdate,
      });
    }

    // Return updated profile
    return tx.agent.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  });

  return result;
};

const getAgentViewings = async (userId: string, queryParams: IQueryParams) => {
  const agent = await prisma.agent.findUnique({
    where: { userId },
  });

  if (!agent) {
    throw new AppError(status.NOT_FOUND, "Agent not found");
  }

  const condition = { agentId: agent.id };

  const queryBuilder = new QueryBuilder<Viewing>(prisma.viewing, queryParams, {
    searchableFields: [],
  })
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
    });

  const result = await queryBuilder.execute();
  return result;
};

const deleteAgent = async (id: string) => {
  const isAgentExist = await prisma.agent.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  });

  if (!isAgentExist) {
    throw new AppError(status.NOT_FOUND, "Agent not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedEmail = `deleted_${Date.now()}_${isAgentExist.email}`;

    await tx.agent.update({
      where: { id },
      data: {
        email: deletedEmail,
        isDeleted: true,
      },
    });

    await tx.user.update({
      where: { id: isAgentExist.userId },
      data: {
        email: deletedEmail,
        isDeleted: true,
        status: UserStatus.DELETED,
      },
    });

    return { id, isDeleted: true };
  });

  return result;
};

export const AgentService = {
  getAllAgents,
  getAgentById,
  getMyAgentProfile,
  updateAgent,
  deleteAgent,
  getAgentViewings,
};
