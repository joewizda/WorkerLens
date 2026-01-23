import { Request, Response, NextFunction } from "express";
import * as interviewService from "../services/interviewService";
import type { CreateInterviewRequest } from "../types/interview";
import path from "path";
import fs from "fs/promises";

export const listInterviews = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interviews = await interviewService.listInterviews();
    res.json(interviews);
  } catch (err) {
    next(err);
  }
};

export const createInterview = async (
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
    const file: Express.Multer.File | undefined = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Parse metadata from form-data fields
    const ext = path.extname(file.originalname);
    const newPath = file.path + ext;
    await fs.rename(file.path, newPath);

    const updatedFile = { ...file, path: newPath };

    const metadata: CreateInterviewRequest = { interviewId: interviewId };
    console.log("Metadata", metadata);
    const result = await interviewService.createInterview(
      metadata,
      updatedFile,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getInterview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const interview = await interviewService.getInterview(req.params.id!);
    res.json(interview);
  } catch (err) {
    next(err);
  }
};

export const uploadChunks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await interviewService.uploadChunks(
      req.params.id!,
      req.body.chunks,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const searchInterview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const results = await interviewService.searchInterview(
      req.params.id!,
      req.query.q as string,
    );
    res.json(results);
  } catch (err) {
    next(err);
  }
};

export const globalSearch = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const results = await interviewService.globalSearch(req.query.q as string);
    res.json(results);
  } catch (err) {
    next(err);
  }
};
