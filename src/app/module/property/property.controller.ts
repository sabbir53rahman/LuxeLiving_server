import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { PropertyService } from "./property.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import pick from "../../utils/pick";
import { propertyFilterableFields } from "./property.constants";
import { IQueryParams } from "../../interfaces/query.interface";

const createProperty = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyService.createProperty(req.user!, req.body);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Property created successfully",
    data: result,
  });
});

const getAllProperties = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, propertyFilterableFields) as Partial<IQueryParams>;
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);

  const result = await PropertyService.getAllProperties({
    ...filters,
    ...options,
  } as IQueryParams);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Properties fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const getPropertyById = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyService.getPropertyById(req.params.id as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Property fetched successfully",
    data: result,
  });
});

const getMyProperties = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, propertyFilterableFields) as Partial<IQueryParams>;
  const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);

  const result = await PropertyService.getMyProperties(req.user!, {
    ...filters,
    ...options,
  } as IQueryParams);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Your properties fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyService.updateProperty(
    req.params.id as string,
    req.user!,
    req.body,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Property updated successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const result = await PropertyService.deleteProperty(
    req.params.id as string,
    req.user!,
  );

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Property deleted successfully",
    data: result,
  });
});

export const PropertyController = {
  createProperty,
  getAllProperties,
  getPropertyById,
  getMyProperties,
  updateProperty,
  deleteProperty,
};
