import { Router } from "express";
import { ReviewController } from "./review.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

router.post("/", checkAuth("BUYER"), ReviewController.createReview);
router.get("/", ReviewController.getAllReviews);
router.get("/me", checkAuth("BUYER"), ReviewController.getMyReviews);

// Admin routes for review moderation
router.patch("/:id/moderate", checkAuth("ADMIN", "SUPER_ADMIN"), ReviewController.moderateReview);
router.delete("/:id", checkAuth("ADMIN", "SUPER_ADMIN"), ReviewController.deleteReview);

export const ReviewRoutes = router;
