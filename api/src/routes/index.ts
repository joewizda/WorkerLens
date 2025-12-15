import { Router } from "express";
import interviewsRouter from "./interviews";
// import mediaRouter from "./media";

const router = Router();

router.use("/interviews", interviewsRouter);
// router.use("/media", mediaRouter);

export default router;