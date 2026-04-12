import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import status from "http-status";
import AppError from "../../errorHelpers/appError";
import { IUploadResponse } from "./upload.interface";

const uploadImage = async (file: Express.Multer.File): Promise<IUploadResponse> => {
  if (!file) {
    throw new AppError(status.BAD_REQUEST, "No file provided");
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new AppError(status.BAD_REQUEST, "Invalid file type. Only JPEG, PNG, JPG, and WebP are allowed");
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new AppError(status.BAD_REQUEST, "File size too large. Maximum size is 5MB");
  }

  try {
    // Upload to Cloudinary
    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "luxeliving/properties",
          resource_type: "image",
          transformation: [
            { width: 1200, height: 800, crop: "limit" },
            { quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result as UploadApiResponse);
          }
        }
      );

      uploadStream.end(file.buffer);
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch {
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to upload image");
  }
};

const uploadMultipleImages = async (files: Express.Multer.File[]): Promise<IUploadResponse[]> => {
  if (!files || files.length === 0) {
    throw new AppError(status.BAD_REQUEST, "No files provided");
  }

  // Limit to 10 images
  if (files.length > 10) {
    throw new AppError(status.BAD_REQUEST, "Maximum 10 images allowed");
  }

  const uploadPromises = files.map((file) => uploadImage(file));
  const results = await Promise.all(uploadPromises);

  return results;
};

const deleteImage = async (publicId: string): Promise<void> => {
  if (!publicId) {
    throw new AppError(status.BAD_REQUEST, "Public ID is required");
  }

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    throw new AppError(status.INTERNAL_SERVER_ERROR, "Failed to delete image");
  }
};

export const UploadService = {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
};