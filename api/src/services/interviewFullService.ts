import { CreateInterviewFullRequest } from "../types";
import { convertToWav } from "../processors/convertToWav";
import { transcribe } from "../processors/transcriber";
import { parseSRT } from "../processors/chunkerTS";
import { randomUUID } from "crypto";
import pool from "../database";

export const createInterviewFull = async (
  metadata: CreateInterviewFullRequest,
  file: Express.Multer.File,
): Promise<{ interview: any }> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const interviewId = randomUUID();

    // 1) Transcribe audio and build raw transcript
    const audioPath = await convertToWav(file.path);
    const srtContent = await transcribe(audioPath.outputPath!);
    const transcriptChunks = await parseSRT(srtContent, 180, 500);
    const rawTranscript = transcriptChunks
      .map((c) => c.text)
      .join(" ")
      .trim();

    // 2) Insert into wl_interview_full
    const insertQuery = `
			INSERT INTO wl_interview_full (
				id,
				title,
				subject_name,
				occupation,
				political_affiliation,
				interviewer,
				comments,
				raw_transcript,
				address,
				city,
				state,
				zip_code,
				phone,
				date_conducted,
				subject_age,
				race,
				military,
				hours_worked_per_week,
				union_affiliation,
				married,
				children,
				email,
				income,
				facebook,
				instagram,
				x_twitter,
				created_at
			) VALUES (
				$1,  $2,  $3,  $4,  $5,  $6,  $7,  $8,
				$9,  $10, $11, $12, $13, $14, $15, $16,
				$17, $18, $19, $20, $21, $22, $23, $24,
				$25, $26, $27
			)
			RETURNING *
		`;

    const values = [
      interviewId, // $1 id
      metadata.title || file.originalname || null, // $2 title
      metadata.subject_name || null, // $3 subject_name
      metadata.occupation || null, // $4 occupation
      metadata.political_affiliation || null, // $5 political_affiliation
      metadata.interviewer || null, // $6 interviewer
      metadata.comments || null, // $7 comments
      rawTranscript || null, // $8 raw_transcript
      metadata.address || null, // $9 address
      metadata.city || null, // $10 city
      metadata.state || null, // $11 state
      metadata.zip_code || null, // $12 zip_code
      metadata.phone ?? null, // $13 phone (bigint)
      metadata.date_conducted || null, // $14 date_conducted (date)
      metadata.subject_age || null, // $15 subject_age (text)
      metadata.race || null, // $16 race
      metadata.military ?? null, // $17 military (boolean)
      metadata.hours_worked_per_week ?? null, // $17 hours_worked_per_week (integer)
      metadata.union_affiliation || null, // $19 union_affiliation
      metadata.married ?? null, // $20 married (boolean)
      metadata.children ?? null, // $21 children (integer)
      metadata.email || null, // $22 email
      metadata.income ?? null, // $23 income (bigint)
      metadata.facebook || null, // $24 facebook
      metadata.instagram || null, // $25 instagram
      metadata.x_twitter || null, // $26 x_twitter
      new Date().toISOString(), // $27 created_at (timestamptz)
    ];

    const result = await client.query(insertQuery, values);
    await client.query("COMMIT");

    const interview = result.rows[0];
    console.log("Created full interview:", interview);
    return { interview };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error creating full interview:", error);
    throw error;
  } finally {
    client.release();
  }
};
