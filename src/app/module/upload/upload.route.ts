import { Router } from "express";
import { UploadController, uploadMiddleware } from "./upload.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

// Routes requiring authentication
router.post("/single", checkAuth(), uploadMiddleware.single, UploadController.uploadSingleImage);
router.post("/multiple", checkAuth(), uploadMiddleware.multiple, UploadController.uploadMultipleImages);
router.delete("/:publicId", checkAuth(), UploadController.deleteImage);

export const UploadRoutes = router;