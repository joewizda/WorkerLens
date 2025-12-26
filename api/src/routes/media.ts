import { Router } from "express";
import { createMedia } from "../controllers/mediaController";

const router = Router();

// Mounted at /api/media
router.post("/create-media", createMedia);

export default router;