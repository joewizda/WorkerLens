import { Router } from "express";
import { createVectors } from "../controllers/vectorController";

const router = Router();

// Mounted at /api/vector
router.post("/vector", createVectors);

export default router;
