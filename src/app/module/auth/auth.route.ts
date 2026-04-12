import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register-buyer", authController.registerBuyer);
router.post("/register-agent", authController.registerAgent);
router.post("/register-seller", authController.registerSeller);
router.post("/login", authController.loginUser);

export const AuthRoutes = router;
