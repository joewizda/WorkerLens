import { Router } from "express";
import { createInterview } from "../controllers/interviewsController";
import { uploadGoogleTranscript } from "../controllers/interviewsGoogleTranscriptController";
import multer from "multer";

const upload = multer({ dest: "/tmp" });
const router = Router();

/**
 * @route POST /api/interviews/interview/:id
 */
router.post("/interview/:id", upload.single("file"), createInterview);

/**
 * @route POST /api/interviews/interview/:id/google-transcript
 * Form field: transcript (TXT/SRT/VTT; we just store raw text)
 */
router.post(
  "/interview/:id/google-transcript",
  upload.single("transcript"),
  uploadGoogleTranscript,
);

export default router;
