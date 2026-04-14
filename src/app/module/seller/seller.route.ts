import { Router } from "express";
import { SellerController, uploadMiddleware } from "./seller.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

// Seller Profile
router.get("/me", checkAuth("SELLER"), SellerController.getMySellerProfile);
router.patch("/me", checkAuth("SELLER"), SellerController.updateSellerProfile);

// Property Management
router.post("/properties", checkAuth("SELLER"), uploadMiddleware, SellerController.createProperty);
router.get("/properties", checkAuth("SELLER"), SellerController.getMyProperties);
router.patch("/properties/:id", checkAuth("SELLER"), SellerController.updateProperty);
router.delete("/properties/:id", checkAuth("SELLER"), SellerController.deleteProperty);

// Inquiry Management
router.get("/properties/:propertyId/inquiries", checkAuth("SELLER"), SellerController.getPropertyInquiries);

// Viewing Management
router.get("/properties/:propertyId/viewings", checkAuth("SELLER"), SellerController.getPropertyViewings);
router.patch("/viewings/:viewingId/status", checkAuth("SELLER"), SellerController.updateViewingStatus);

// Sales Tracking
router.get("/stats", checkAuth("SELLER"), SellerController.getSellerStats);
router.get("/sales-history", checkAuth("SELLER"), SellerController.getSalesHistory);
router.get("/earnings", checkAuth("SELLER"), SellerController.getSellerEarnings);

// Agent Collaboration
router.post("/agents/request", checkAuth("SELLER"), SellerController.requestAgent);
router.get("/agents/assigned", checkAuth("SELLER"), SellerController.getAssignedAgents);
router.delete("/properties/:propertyId/agents", checkAuth("SELLER"), SellerController.removeAgentFromProperty);

export const SellerRoutes = router;
