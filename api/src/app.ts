import express from "express";
import router from "./routes/index";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(express.json());
app.use("/api", router);

// global error handler
app.use(errorHandler);

export default app;