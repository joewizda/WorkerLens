import { Router } from "express";
import {
  // listInterviews,
  createInterview,
  getInterview,
  uploadChunks,
  searchInterview,
  globalSearch
} from "../controllers/interviewsController";
import multer from "multer";

const upload = multer({ dest: "/tmp" });
const router = Router();

// router.get("/", listInterviews);
/**
 * @route POST /api/interviews/interview
 */
router.post("/interview", upload.single("file"), createInterview); // Changed from "/interviews/interview"
// router.get("/:id", getInterview);
// router.post("/:id/chunks", uploadChunks);
// router.get("/:id/search", searchInterview);
// router.get("/search", globalSearch);

export default router;