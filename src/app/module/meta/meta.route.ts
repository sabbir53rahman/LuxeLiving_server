import express from "express";
import { checkAuth } from "../../middleware/checkAuth";

import { metaController } from "./meta.controller";
import { Role } from "../../../generated/prisma/enums";

const router = express.Router();

router.get(
  "/overview",
  checkAuth(Role.ADMIN, Role.SUPER_ADMIN, Role.AGENT, Role.BUYER, Role.SELLER),
  metaController.getOverviewStats,
);

router.get(
  "/dashboard",
  checkAuth(),
  metaController.getDashboardStats,
);

export const MetaRoutes = router;
