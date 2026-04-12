import { Router } from "express";
import { UserController } from "./user.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

router.get("/me", checkAuth(), UserController.getMyProfile);
router.patch("/me", checkAuth(), UserController.updateMyProfile);
router.patch("/agent", checkAuth("AGENT"), UserController.updateAgentProfile);
router.patch("/buyer", checkAuth("BUYER"), UserController.updateBuyerProfile);
router.patch("/seller", checkAuth("SELLER"), UserController.updateSellerProfile);

export const UserRoutes = router;
