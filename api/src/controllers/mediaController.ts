import { Request, Response, NextFunction } from "express";
import * as mediaService from "../services/mediaService";
import type { CreateMediaRequest } from "../types/media";

export const createMedia = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tags =
      Array.isArray(req.body.tags)
        ? req.body.tags
        : typeof req.body.tags === "string"
        ? req.body.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : undefined;
    let metadataParsed: CreateMediaRequest["metadata"] = undefined;
    if (typeof req.body.metadata === "string") {
      try {
        metadataParsed = JSON.parse(req.body.metadata);
      } catch {
        return res.status(400).json({ error: "Invalid JSON in 'metadata' string" });
      }
    } else if (req.body.metadata && typeof req.body.metadata === "object") {
      metadataParsed = req.body.metadata;
    }

    const payload: CreateMediaRequest = {
      title: req.body.title,
      description: req.body.description,
      ...(metadataParsed !== undefined && { metadata: metadataParsed }),
      type: req.body.type,
      tags,
      captions: req.body.captions,
      location: req.body.location,
    };

    const result = await mediaService.createMedia(payload);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};