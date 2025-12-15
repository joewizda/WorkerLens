import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

/**
 * Audio/video formats that can be converted to WAV
 */
const CONVERTIBLE_FORMATS = ['.mp3', '.mp4', '.m4a', '.aac', '.webm', '.wav'];

/**
 * Text formats that should be skipped (not converted)
 */
const TEXT_FORMATS = ['.md', '.txt', '.docx', '.pdf'];

export interface ConversionResult {
  success: boolean;
  outputPath?: string;
  skipped?: boolean;
  message?: string;
}

/**
 * Convert audio/video files to WAV format using FFMPEG
 * Skips text files silently (returns success: true, skipped: true)
 * 
 * @param inputPath - Path to the input file
 * @param outputDir - Directory to save the WAV file (defaults to same directory as input)
 * @returns ConversionResult with output path or skip status
 */
export async function convertToWav(
  inputPath: string,
  outputDir?: string
): Promise<ConversionResult> {
  try {


    console.log(`Converting file: ${inputPath}`);
    // Get file extension
    const ext = path.extname(inputPath).toLowerCase();
    
    // Skip text files silently
    if (TEXT_FORMATS.includes(ext)) {
      return {
        success: true,
        skipped: true,
        message: `Skipped conversion for text file: ${ext}`
      };
    }
    
    // If already WAV, return as-is
    if (ext === '.wav') {
      return {
        success: true,
        outputPath: inputPath,
        message: 'File is already in WAV format'
      };
    }
    
    // Check if format is convertible
    if (!CONVERTIBLE_FORMATS.includes(ext)) {
      return {
        success: true,
        skipped: true,
        message: `Unknown format ${ext}, skipping conversion`
      };
    }
    
    // Generate output path
    const outputDirectory = outputDir || path.dirname(inputPath);
    const baseName = path.basename(inputPath, ext);
    const outputPath = path.join(outputDirectory, `${baseName}.wav`);
    
    // Convert using FFMPEG
    // -i: input file
    // -ar 16000: sample rate 16kHz (good for speech recognition)
    // -ac 1: mono audio
    // -c:a pcm_s16le: 16-bit PCM encoding
    const command = `ffmpeg -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${outputPath}" -y`;
    
    await execAsync(command);
    
    // Verify output file was created
    await fs.access(outputPath);
    
    return {
      success: true,
      outputPath,
      message: `Converted ${ext} to WAV`
    };
    
  } catch (error) {
    throw new Error(`Failed to convert file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if a file needs conversion based on its extension
 */
export function needsConversion(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return CONVERTIBLE_FORMATS.includes(ext) && ext !== '.wav';
}

/**
 * Get the expected output path for a conversion
 */
export function getOutputPath(inputPath: string, outputDir?: string): string {
  const ext = path.extname(inputPath);
  const outputDirectory = outputDir || path.dirname(inputPath);
  const baseName = path.basename(inputPath, ext);
  return path.join(outputDirectory, `${baseName}.wav`);
}