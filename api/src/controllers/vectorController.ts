import { Request, Response, NextFunction } from "express";
import { createEmbeddedVectors } from "../services/vectorService";

export const createVectors = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { query } = req.method === "GET" ? { query: req.query.q } : req.body;
    console.log("Received query for vector creation:", query);
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      res.status(400).json({ error: "Missing or empty 'query' parameter" });
      return;
    }
    const results = await createEmbeddedVectors(query);
    res.json({ query, results });
  } catch (err) {
    next(err);
  }
};
