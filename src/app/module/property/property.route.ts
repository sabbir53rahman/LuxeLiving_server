import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { PropertyController } from "./property.controller";

const router = Router();

// Routes requiring authentication
router.post(
  "/",
  checkAuth("AGENT", "SELLER"),
  PropertyController.createProperty,
);
router.get(
  "/me",
  checkAuth("AGENT", "SELLER"),
  PropertyController.getMyProperties,
);

// General routes
router.get("/", PropertyController.getAllProperties);
router.get("/:id", PropertyController.getPropertyById);
router.patch(
  "/:id",
  checkAuth("AGENT", "ADMIN", "SUPER_ADMIN"),
  PropertyController.updateProperty,
);
router.delete(
  "/:id",
  checkAuth("AGENT", "ADMIN", "SUPER_ADMIN"),
  PropertyController.deleteProperty,
);

export const PropertyRoutes = router;
