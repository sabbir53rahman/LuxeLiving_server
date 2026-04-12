import { Router } from "express";
import { DocsController } from "./docs.controller";

const router = Router();

router.get("/", DocsController.getApiDocs);

export const DocsRoutes = router;