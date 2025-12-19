import { Router } from "express";
import { searchEmbeddings } from "../controllers/embeddingsController";

const router = Router();

// Search embeddings
// Mounted at /api/embed
router.post("/", searchEmbeddings);

export default router;