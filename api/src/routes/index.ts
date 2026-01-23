import { Router } from "express";
import interviewsRouter from "./interviews";
import interviewsFull from "./interviewFull";
import embedRouter from "./embed";
import mediaRouter from "./media";

const router = Router();

router.use("/interviews", interviewsRouter);
router.use("/interviews-full", interviewsFull);
router.use("/embed", embedRouter);
router.use("/media", mediaRouter);

export default router;
