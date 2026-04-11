#!/bin/bash

OUTPUT_FILE="/Users/josephwizda/Projects/POTW/tools/WorkerLens/api/bash/insert.sql"
ID="6f9e4c09-4913-459f-b99a-f2f6463c66ae"

psql -h localhost -p 5432 -U joewizda -d POTW \
-t -A -F "" \
-c "
SELECT
  'INSERT INTO wl_interview_full (
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
    created_at,
    subject_gender,
    original_filename
  ) VALUES (' ||
  quote_nullable(id) || ',' ||
  quote_nullable(title) || ',' ||
  quote_nullable(subject_name) || ',' ||
  quote_nullable(occupation) || ',' ||
  quote_nullable(political_affiliation) || ',' ||
  quote_nullable(interviewer) || ',' ||
  quote_nullable(comments) || ',' ||
  quote_nullable(raw_transcript) || ',' ||
  quote_nullable(address) || ',' ||
  quote_nullable(city) || ',' ||
  quote_nullable(state) || ',' ||
  quote_nullable(zip_code) || ',' ||
  COALESCE(phone::text, 'NULL') || ',' ||
  quote_nullable(date_conducted) || ',' ||
  quote_nullable(subject_age) || ',' ||
  quote_nullable(race) || ',' ||
  COALESCE(military::text, 'NULL') || ',' ||
  COALESCE(hours_worked_per_week::text, 'NULL') || ',' ||
  quote_nullable(union_affiliation) || ',' ||
  COALESCE(married::text, 'NULL') || ',' ||
  COALESCE(children::text, 'NULL') || ',' ||
  quote_nullable(email) || ',' ||
  COALESCE(income::text, 'NULL') || ',' ||
  quote_nullable(facebook) || ',' ||
  quote_nullable(instagram) || ',' ||
  quote_nullable(x_twitter) || ',' ||
  quote_nullable(created_at) || ',' ||
  quote_nullable(subject_gender) || ',' ||
  quote_nullable(original_filename) ||
  ');'
FROM wl_interview_full
WHERE id = '$ID';
" > "$OUTPUT_FILE"

echo "Done. Output:"
wc -l "$OUTPUT_FILE"