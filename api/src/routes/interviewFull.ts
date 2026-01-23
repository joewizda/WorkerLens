import { Router } from "express";
import { createInterviewFull } from "../controllers/interviewsFullController";
import multer from "multer";

const upload = multer({ dest: "/tmp" });
const router = Router();

/**
 * @route POST /api/interviews-full/create
 */
router.post("/create", upload.single("file"), createInterviewFull); // Changed from "/interviews/interview"

export default router;
