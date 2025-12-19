import { Request, Response, NextFunction } from "express";
import { searchSimilarEmbeddings } from "../services/embeddingService";

export const searchEmbeddings = async (req: Request, res: Response, next: NextFunction) => {
	try {
		const { query, limit } = req.method === "GET" ? { query: req.query.q, limit: req.query.limit } : req.body;

		if (!query || typeof query !== "string" || query.trim().length === 0) {
			res.status(400).json({ error: "Missing or empty 'query' parameter" });
			return;
		}

		const numericLimit = typeof limit === "string" ? parseInt(limit, 10) : typeof limit === "number" ? limit : undefined;
		const results = await searchSimilarEmbeddings(query, numericLimit);
		res.json({ query, count: results.length, results });
	} catch (err) {
		next(err);
	}
};

