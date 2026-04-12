import { Router } from "express";
import { AgentController } from "./agent.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

router.get("/", AgentController.getAllAgents);
router.get("/me", checkAuth("AGENT"), AgentController.getMyAgentProfile);
router.get("/viewings", checkAuth("AGENT"), AgentController.getAgentViewings);
router.get("/:id", AgentController.getAgentById);
router.patch("/:id", checkAuth("AGENT", "ADMIN", "SUPER_ADMIN"), AgentController.updateAgent);
router.delete("/:id", checkAuth("ADMIN", "SUPER_ADMIN"), AgentController.deleteAgent);

export const AgentRoutes = router;
