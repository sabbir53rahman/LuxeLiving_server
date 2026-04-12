import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { authService } from "./auth.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { tokenHelpers } from "../../utils/token";

const registerBuyer = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.registerBuyer(req.body);
  const { accessToken, refreshToken } = result;

  tokenHelpers.setAccessTokenCookie(res, accessToken);
  tokenHelpers.setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Buyer registered successfully",
    data: result,
  });
});

const registerAgent = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.registerAgent(req.body);
  const { accessToken, refreshToken } = result;

  tokenHelpers.setAccessTokenCookie(res, accessToken);
  tokenHelpers.setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Agent registered successfully",
    data: result,
  });
});

const registerSeller = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.registerSeller(req.body);
  const { accessToken, refreshToken } = result;

  tokenHelpers.setAccessTokenCookie(res, accessToken);
  tokenHelpers.setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Seller registered successfully",
    data: result,
  });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.loginUser(req.body);
  const { accessToken, refreshToken } = result;

  tokenHelpers.setAccessTokenCookie(res, accessToken);
  tokenHelpers.setRefreshTokenCookie(res, refreshToken);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "User logged in successfully",
    data: {
      accessToken,
      refreshToken,
    },
  });
});

export const authController = {
  registerBuyer,
  registerAgent,
  registerSeller,
  loginUser,
};
