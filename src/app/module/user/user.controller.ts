import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { UserService } from "./user.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.getMyProfile(user.userId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User profile fetched successfully",
    data: result,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.updateMyProfile(user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const updateAgentProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.updateAgentProfile(user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Agent profile updated successfully",
    data: result,
  });
});

const updateBuyerProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.updateBuyerProfile(user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Buyer profile updated successfully",
    data: result,
  });
});

const updateSellerProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await UserService.updateSellerProfile(user.userId, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller profile updated successfully",
    data: result,
  });
});

export const UserController = {
  getMyProfile,
  updateMyProfile,
  updateAgentProfile,
  updateBuyerProfile,
  updateSellerProfile,
};
