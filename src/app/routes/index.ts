import { Router } from "express";
import { AuthRoutes } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { AdminRoutes } from "../module/admin/admin.route";
import { AgentRoutes } from "../module/agent/agent.route";
import { SellerRoutes } from "../module/seller/seller.route";
import { ViewingRoutes } from "../module/viewing/viewing.route";
import { PropertyRoutes } from "../module/property/property.route";
import { ReviewRoutes } from "../module/review/review.route";
import { PaymentRoutes } from "../module/payment/payment.route";
import { MetaRoutes } from "../module/meta/meta.route";
import { UploadRoutes } from "../module/upload/upload.route";
import { DocsRoutes } from "../module/docs/docs.route";

const router = Router();

router.use("/auth", AuthRoutes);
router.use("/users", UserRoutes);
router.use("/admins", AdminRoutes);
router.use("/agents", AgentRoutes);
router.use("/sellers", SellerRoutes);
router.use("/properties", PropertyRoutes);
router.use("/viewings", ViewingRoutes);
router.use("/reviews", ReviewRoutes);
router.use("/payments", PaymentRoutes);
router.use("/meta", MetaRoutes);
router.use("/upload", UploadRoutes);
router.use("/docs", DocsRoutes);

export const IndexRoutes = router;
