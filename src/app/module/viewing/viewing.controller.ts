import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { ViewingService } from "./viewing.service";
import pick from "../../utils/pick";
import { viewingFilterableFields } from "./viewing.constants";
import { IQueryParams } from "../../interfaces/query.interface";

const createViewing = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await ViewingService.createViewing(user, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Viewing created successfully",
    data: result,
  });
});

const getAllViewings = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, viewingFilterableFields) as IQueryParams;
  const result = await ViewingService.getAllViewings(filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Viewings retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getMyViewings = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const filters = pick(req.query, viewingFilterableFields) as IQueryParams;
  const result = await ViewingService.getMyViewings(user, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your viewings retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getViewingById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ViewingService.getViewingById(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Viewing retrieved successfully",
    data: result,
  });
});

const updateViewing = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ViewingService.updateViewing(id, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Viewing updated successfully",
    data: result,
  });
});

const deleteViewing = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ViewingService.deleteViewing(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Viewing deleted successfully",
    data: result,
  });
});

const cancelViewing = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const result = await ViewingService.cancelViewing(id);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Viewing canceled successfully",
    data: result,
  });
});

export const ViewingController = {
  createViewing,
  getAllViewings,
  getMyViewings,
  getViewingById,
  updateViewing,
  deleteViewing,
  cancelViewing,
};
