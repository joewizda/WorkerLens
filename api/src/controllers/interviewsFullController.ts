import { Request, Response, NextFunction } from "express";
import * as interviewFullService from "../services/interviewFullService";
import path from "path";
import fs from "fs/promises";
import { CreateInterviewFullRequest } from "../types";

export const createInterviewFull = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const file: Express.Multer.File = req.file!;
    if (!file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const ext = path.extname(file.originalname);
    const newPath = file.path + ext;
    await fs.rename(file.path, newPath);

    const updatedFile = { ...file, path: newPath };

    const normalizeDate = (input?: string): string | undefined => {
      if (!input) return undefined;
      const s = String(input).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
      if (m) {
        const mm = parseInt(m[1]!, 10);
        const dd = parseInt(m[2]!, 10);
        const yy = m[3]!;
        const year =
          yy.length === 2 ? 2000 + parseInt(yy, 10) : parseInt(yy, 10);
        const d = new Date(year, mm - 1, dd);
        if (
          d.getFullYear() !== year ||
          d.getMonth() + 1 !== mm ||
          d.getDate() !== dd
        ) {
          throw new Error("Invalid date_conducted format");
        }
        const iso = `${d.getFullYear().toString().padStart(4, "0")}-${(
          d.getMonth() + 1
        )
          .toString()
          .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
        return iso;
      }
      return s;
    };

    const metadata: CreateInterviewFullRequest = {
      ...(req.body.title !== undefined && { title: req.body.title }),
      ...(req.body.subject_name !== undefined && {
        subject_name: req.body.subject_name,
      }),
      ...(req.body.occupation !== undefined && {
        occupation: req.body.occupation,
      }),
      ...(req.body.political_affiliation !== undefined && {
        political_affiliation: req.body.political_affiliation,
      }),
      ...(req.body.interviewer !== undefined && {
        interviewer: req.body.interviewer,
      }),
      comments: req.body.comments || "",
      ...(req.body.address !== undefined && { address: req.body.address }),
      ...(req.body.city !== undefined && { city: req.body.city }),
      ...(req.body.state !== undefined && { state: req.body.state }),
      ...(req.body.zip_code !== undefined && { zip_code: req.body.zip_code }),
      ...(req.body.phone !== undefined && {
        phone: parseInt(req.body.phone, 10),
      }),
      ...(req.body.date_conducted !== undefined && {
        date_conducted: normalizeDate(req.body.date_conducted)!,
      }),
      ...(req.body.subject_age !== undefined && {
        subject_age: req.body.subject_age,
      }),
      ...(req.body.race !== undefined && { race: req.body.race }),
      ...(req.body.military !== undefined && {
        military: req.body.military === "true",
      }),
      ...(req.body.hours_worked_per_week !== undefined && {
        hours_worked_per_week: parseInt(req.body.hours_worked_per_week, 10),
      }),
      ...(req.body.union_affiliation !== undefined && {
        union_affiliation: req.body.union_affiliation,
      }),
      ...(req.body.married !== undefined && {
        married: req.body.married === "true",
      }),
      ...(req.body.children !== undefined && {
        children: req.body.children === "true",
      }),
      ...(req.body.email !== undefined && { email: req.body.email }),
      ...(req.body.income !== undefined && {
        income: parseInt(req.body.income, 10),
      }),
      ...(req.body.facebook !== undefined && { facebook: req.body.facebook }),
      ...(req.body.instagram !== undefined && {
        instagram: req.body.instagram,
      }),
      ...(req.body.x_twitter !== undefined && {
        x_twitter: req.body.x_twitter,
      }),
    };
    console.log("Metadata from payload: ", metadata);
    const result = await interviewFullService.createInterviewFull(
      metadata,
      updatedFile,
    );

    // Return only the newly created interview ID
    const id = (result as any)?.id ?? (result as any)?.interview?.id;
    if (!id) {
      res.status(500).json({ error: "Failed to create interview" });
      return;
    }
    res.status(201).json({ id });
  } catch (err) {
    next(err);
  }
};
