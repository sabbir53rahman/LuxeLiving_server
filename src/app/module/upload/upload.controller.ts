import { Request, Response } from "express";
import { catchAsync } from "../../shared/catchAsync";
import { UploadService } from "./upload.service";
import { sendResponse } from "../../shared/sendResponse";
import status from "http-status";
import multer from "multer";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
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

const uploadSingleImage = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "No file uploaded",
    });
  }

  const result = await UploadService.uploadImage(req.file);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Image uploaded successfully",
    data: result,
  });
});

const uploadMultipleImages = catchAsync(async (req: Request, res: Response) => {
  if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
    return sendResponse(res, {
      httpStatusCode: status.BAD_REQUEST,
      success: false,
      message: "No files uploaded",
    });
  }

  const files = req.files as Express.Multer.File[];
  const result = await UploadService.uploadMultipleImages(files);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Images uploaded successfully",
    data: result,
  });
});

const deleteImage = catchAsync(async (req: Request, res: Response) => {
  const { publicId } = req.params;

  await UploadService.deleteImage(publicId as string);

  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Image deleted successfully",
  });
});

// Export multer middleware
export const uploadMiddleware = {
  single: upload.single("image"),
  multiple: upload.array("images", 10),
};

export const UploadController = {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage,
};