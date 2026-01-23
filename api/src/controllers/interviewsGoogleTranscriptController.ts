import { Request, Response, NextFunction } from "express";
import * as interviewService from "../services/interviewService";
import fs from "fs/promises";

export const uploadGoogleTranscript = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interviewId = req.params.id;
    if (!interviewId) {
      res.status(400).json({ error: "Interview ID is required in the URL" });
      return;
    }
    const file = req.file;
    if (!file) {
      res
        .status(400)
        .json({ error: "No transcript uploaded (field: transcript)" });
      return;
    }

    const text = await fs.readFile(file.path, "utf8");
    const updated = await interviewService.updateGoogleTranscript(
      interviewId,
      text,
    );

    if (!updated) {
      res.status(404).json({ error: "Interview not found" });
      return;
    }

    res.status(200).json({ id: interviewId });
  } catch (err) {
    next(err);
  }
};
