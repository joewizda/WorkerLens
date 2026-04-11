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
        original_filename,
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
        $25, $26, $27, $28
      )
      RETURNING *
    `;

    const values = [
      interviewId, // $1 id
      metadata.title || null, // $2 title (masked)
      metadata.original_filename || file.originalname || null, // $3 original_filename
      metadata.subject_name || null, // $4 subject_name
      metadata.occupation || null, // $5 occupation
      metadata.political_affiliation || null, // $6 political_affiliation
      metadata.interviewer || null, // $7 interviewer
      metadata.comments || null, // $8 comments
      rawTranscript || null, // $9 raw_transcript
      metadata.address || null, // $10 address
      metadata.city || null, // $11 city
      metadata.state || null, // $12 state
      metadata.zip_code || null, // $13 zip_code
      metadata.phone ?? null, // $14 phone (bigint)
      metadata.date_conducted || null, // $15 date_conducted (date)
      metadata.subject_age || null, // $16 subject_age (text)
      metadata.race || null, // $17 race
      metadata.military ?? null, // $18 military (boolean)
      metadata.hours_worked_per_week ?? null, // $19 hours_worked_per_week (integer)
      metadata.union_affiliation || null, // $20 union_affiliation
      metadata.married ?? null, // $21 married (boolean)
      metadata.children ?? null, // $22 children (boolean)
      metadata.email || null, // $23 email
      metadata.income ?? null, // $24 income (bigint)
      metadata.facebook || null, // $25 facebook
      metadata.instagram || null, // $26 instagram
      metadata.x_twitter || null, // $27 x_twitter
      new Date().toISOString(), // $28 created_at (timestamptz)
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
