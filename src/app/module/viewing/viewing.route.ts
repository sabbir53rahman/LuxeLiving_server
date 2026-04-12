import { Router } from "express";
import { ViewingController } from "./viewing.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

// Routes requiring authentication
router.post("/", checkAuth("BUYER"), ViewingController.createViewing);
router.get(
  "/me",
  checkAuth("BUYER", "AGENT"),
  ViewingController.getMyViewings,
);

// General routes (admins or protected differently as needed)
router.get(
  "/",
  checkAuth("ADMIN", "SUPER_ADMIN"),
  ViewingController.getAllViewings,
);
router.get(
  "/:id",
  checkAuth("ADMIN", "SUPER_ADMIN", "BUYER", "AGENT"),
  ViewingController.getViewingById,
);
router.patch(
  "/:id",
  checkAuth("ADMIN", "SUPER_ADMIN", "AGENT", "BUYER"),
  ViewingController.updateViewing,
);
router.post(
  "/cancel/:id",
  checkAuth("ADMIN", "SUPER_ADMIN", "AGENT", "BUYER"),
  ViewingController.cancelViewing,
);
router.delete(
  "/:id",
  checkAuth("BUYER", "ADMIN", "SUPER_ADMIN"),
  ViewingController.deleteViewing,
);

export const ViewingRoutes = router;
