#!/bin/bash

INTERVIEW_ID="bf5c456d-d997-4f7d-8915-268cf4092556"
OUTPUT_FILE="/Users/josephwizda/Projects/POTW/tools/WorkerLens/api/bash/insert.sql"

psql -h localhost -p 5432 -U joewizda -d POTW \
-t -A -F "" \
-c "
SELECT
  'INSERT INTO wl_interview_chunks (
    id,
    interview_id,
    sequence,
    content,
    start_time,
    end_time,
    vector,
    created_at
  ) VALUES (' ||
  quote_nullable(id) || ',' ||
  quote_nullable(interview_id) || ',' ||
  quote_nullable("sequence") || ',' ||
  quote_nullable(content) || ',' ||
  quote_nullable(start_time) || ',' ||
  quote_nullable(end_time) || ',' ||
  quote_nullable(vector::text) || ',' ||
  quote_nullable(created_at) ||
  ');'
FROM wl_interview_chunks
WHERE interview_id = '$INTERVIEW_ID';
" > "$OUTPUT_FILE"

echo "Exported to $OUTPUT_FILE"
wc -l "$OUTPUT_FILE"