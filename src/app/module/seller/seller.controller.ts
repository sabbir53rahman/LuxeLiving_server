import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import { SellerService } from "./seller.service";
import pick from "../../utils/pick";
import {
  propertyFilterableFields,
  sellerFilterableFields,
} from "./seller.constants";
import { IQueryParams } from "../../interfaces/query.interface";
import multer from "multer";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit per file
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, JPG, and WebP are allowed"));
    }
  },
});

// Seller Profile
const getMySellerProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await SellerService.getMySellerProfile(user);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller profile retrieved successfully",
    data: result,
  });
});

const updateSellerProfile = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await SellerService.updateSellerProfile(user, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller profile updated successfully",
    data: result,
  });
});

// Property Management
const createProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const files = req.files as Express.Multer.File[] | undefined;
  const result = await SellerService.createProperty(user, req.body, files);

  sendResponse(res, {
    httpStatusCode: status.CREATED,
    success: true,
    message: "Property created successfully",
    data: result,
  });
});

const getMyProperties = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const filters = pick(req.query, propertyFilterableFields) as IQueryParams;
  const result = await SellerService.getMyProperties(user, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller properties retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params as { id: string };
  const result = await SellerService.updateProperty(id, user, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Property updated successfully",
    data: result,
  });
});

const deleteProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { id } = req.params as { id: string };
  const result = await SellerService.deleteProperty(id, user);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

// Inquiry Management
const getPropertyInquiries = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { propertyId } = req.params as { propertyId: string };
  const filters = pick(req.query, propertyFilterableFields) as IQueryParams;
  const result = await SellerService.getPropertyInquiries(user, propertyId, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Property inquiries retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Viewing Management
const getPropertyViewings = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { propertyId } = req.params as { propertyId: string };
  const filters = pick(req.query, propertyFilterableFields) as IQueryParams;
  const result = await SellerService.getPropertyViewings(user, propertyId, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Property viewings retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const updateViewingStatus = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { viewingId } = req.params as { viewingId: string };
  const result = await SellerService.updateViewingStatus(viewingId, user, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Viewing status updated successfully",
    data: result,
  });
});

// Sales Tracking
const getSellerStats = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await SellerService.getSellerStats(user);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller statistics retrieved successfully",
    data: result,
  });
});

const getSalesHistory = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const filters = pick(req.query, propertyFilterableFields) as IQueryParams;
  const result = await SellerService.getSalesHistory(user, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Sales history retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Agent Collaboration
const requestAgent = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await SellerService.requestAgent(user, req.body);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getAssignedAgents = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const result = await SellerService.getAssignedAgents(user);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Assigned agents retrieved successfully",
    data: result,
  });
});

const getSellerEarnings = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const filters = pick(req.query, sellerFilterableFields) as IQueryParams;

  const result = await SellerService.getSellerEarnings(user.userId, filters);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Seller earnings retrieved successfully",
    data: result,
  });
});

const removeAgentFromProperty = catchAsync(async (req: Request, res: Response) => {
  const user = req.user;
  const { propertyId } = req.params as { propertyId: string };
  const result = await SellerService.removeAgentFromProperty(user, propertyId);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

export const SellerController = {
  // Seller Profile
  getMySellerProfile,
  updateSellerProfile,

  // Property Management
  createProperty,
  getMyProperties,
  updateProperty,
  deleteProperty,

  // Inquiry Management
  getPropertyInquiries,

  // Viewing Management
  getPropertyViewings,
  updateViewingStatus,

  // Sales Tracking
  getSellerStats,
  getSalesHistory,
  getSellerEarnings,

  // Agent Collaboration
  requestAgent,
  getAssignedAgents,
  removeAgentFromProperty,
};

export const uploadMiddleware = upload.array("images", 10);
