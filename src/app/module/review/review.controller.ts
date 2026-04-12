import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { ReviewService } from "./review.service";
import pick from "../../utils/pick";
import { reviewFilterableFields } from "./review.constants";
import { IQueryParams } from "../../interfaces/query.interface";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await ReviewService.createReview(user, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Review successfully submitted",
    data: result,
  });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, reviewFilterableFields) as IQueryParams;
  const result = await ReviewService.getAllReviews(filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Reviews fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyReviews = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const filters = pick(req.query, reviewFilterableFields) as IQueryParams;
  const result = await ReviewService.getMyReviews(user, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your reviews fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const moderateReview = catchAsync(async (req: Request, res: Response) => {
  const { action, reason } = req.body;
  const result = await ReviewService.moderateReview(req.params.id as string, action, reason);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: `Review ${action}d successfully`,
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.deleteReview(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Review deleted successfully",
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getAllReviews,
  getMyReviews,
  moderateReview,
  deleteReview,
};
