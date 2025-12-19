import { Router } from "express";
import interviewsRouter from "./interviews";
import embedRouter from "./embed";

const router = Router();

router.use("/interviews", interviewsRouter);
router.use("/embed", embedRouter);

export default router;