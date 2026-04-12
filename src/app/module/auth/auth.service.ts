import status from "http-status";
import AppError from "../../errorHelpers/appError";
import { tokenHelpers } from "../../utils/token";
import bcrypt from "bcryptjs";
import { userSafeSelect } from "../user/user.constants";
import {
  ILoginUserPayload,
  IRegisterAgentPayload,
  IRegisterBuyerPayload,
  IRegisterSellerPayload,
} from "./auth.interface";
import { UserStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";

const registerBuyer = async (payload: IRegisterBuyerPayload) => {
  const { name, email, password } = payload;

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist) {
    throw new AppError(
      status.BAD_REQUEST,
      "User already exists with this email",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "BUYER",
      },
      select: userSafeSelect,
    });

    const buyer = await tx.buyer.create({
      data: {
        userId: user.id,
        name,
        email,
      },
    });

    return { user, buyer };
  });

  const accessToken = tokenHelpers.getAccessToken({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    name: result.user.name,
  });

  const refreshToken = tokenHelpers.getRefreshToken({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    name: result.user.name,
  });

  return {
    ...result,
    accessToken,
    refreshToken,
  };
};

const registerAgent = async (payload: IRegisterAgentPayload) => {
  const { name, email, password } = payload;

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist) {
    throw new AppError(
      status.BAD_REQUEST,
      "User already exists with this email",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "AGENT",
      },
      select: userSafeSelect,
    });

    const agent = await tx.agent.create({
      data: {
        userId: user.id,
        name,
        email,
      },
    });

    return { user, agent };
  });

  const accessToken = tokenHelpers.getAccessToken({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    name: result.user.name,
  });

  const refreshToken = tokenHelpers.getRefreshToken({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    name: result.user.name,
  });

  return {
    ...result,
    accessToken,
    refreshToken,
  };
};

const registerSeller = async (payload: IRegisterSellerPayload) => {
  const { name, email, password } = payload;

  const isUserExist = await prisma.user.findUnique({
    where: { email },
  });

  if (isUserExist) {
    throw new AppError(
      status.BAD_REQUEST,
      "User already exists with this email",
    );
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "SELLER",
      },
      select: userSafeSelect,
    });

    const seller = await tx.seller.create({
      data: {
        userId: user.id,
        name,
        email,
      },
    });

    return { user, seller };
  });

  const accessToken = tokenHelpers.getAccessToken({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    name: result.user.name,
  });

  const refreshToken = tokenHelpers.getRefreshToken({
    userId: result.user.id,
    email: result.user.email,
    role: result.user.role,
    name: result.user.name,
  });

  return {
    ...result,
    accessToken,
    refreshToken,
  };
};

const loginUser = async (payload: ILoginUserPayload) => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(status.NOT_FOUND, "User not found");
  }

  if (user.isDeleted) {
    throw new AppError(status.FORBIDDEN, "User is deleted");
  }

  if (user.status === UserStatus.BLOCKED) {
    throw new AppError(status.FORBIDDEN, "User is blocked");
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password);

  if (!isPasswordMatch) {
    throw new AppError(status.UNAUTHORIZED, "Invalid password");
  }

  const accessToken = tokenHelpers.getAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  const refreshToken = tokenHelpers.getRefreshToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  // Omit password from the returned user object
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
};

export const authService = {
  registerBuyer,
  registerAgent,
  registerSeller,
  loginUser,
};
