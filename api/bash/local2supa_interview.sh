#!/bin/bash

INTERVIEW_FULL_ID="6f9e4c09-4913-459f-b99a-f2f6463c66ae"
OUTPUT_FILE="/Users/josephwizda/Projects/POTW/tools/WorkerLens/api/bash/insert.sql"

psql -h localhost -p 5432 -U joewizda -d POTW \
-t -A -F "" \
-c "
SELECT
  'INSERT INTO wl_interview (
    id,
    interview_full_id,
    transcript,
    created_at
  ) VALUES (' ||
  quote_nullable(id) || ',' ||
  quote_nullable(interview_full_id) || ',' ||
  quote_nullable(transcript) || ',' ||
  quote_nullable(created_at) ||
  ');'
FROM wl_interview
WHERE interview_full_id = '$INTERVIEW_FULL_ID';
" > "$OUTPUT_FILE"

echo "Exported to $OUTPUT_FILE"
wc -l "$OUTPUT_FILE"