import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const PATH_TO_WHISPER = '/Users/josephwizda/Whisper.cpp/whisper.cpp/build/bin/whisper-cli';
const PATH_TO_MODELS = '/Users/josephwizda/Whisper.cpp/whisper.cpp/models';

export async function transcribe(audioPath: string): Promise<string> {
  console.log(`Transcribing audio file: ${audioPath}`);
  
  // Call whisper.cpp with --output-srt flag
  await execAsync(
    `${PATH_TO_WHISPER} -m ${PATH_TO_MODELS}/ggml-base.en.bin -f ${audioPath} --output-srt`
  );
  
  // Read the generated .srt file
  const srtPath = `${audioPath}.srt`;
  const srtContent = await fs.readFile(srtPath, 'utf-8');
  
  return srtContent;
}