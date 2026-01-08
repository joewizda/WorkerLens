import { spawn } from "child_process";
import path from "path";
import { promises as fs, constants as fsConstants } from "fs";

export async function runCmd(cmd: string, args: string[], cwd?: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with code ${code}: ${stderr || stdout}`));
    });
  });
}

export async function assertExecutable(binPath: string): Promise<void> {
  try {
    await fs.access(binPath, fsConstants.X_OK);
  } catch {
    throw new Error(`Executable not found or not permitted: ${binPath}. Set WHISPER_BIN to a valid absolute path.`);
  }
}

export async function assertFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}. Set WHISPER_MODEL to a valid absolute path.`);
  }
}

// Format embedding array for pgvector
export function toPgVector(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export async function ensureTmp(): Promise<string> {
  const dir = path.join("/tmp", "workerlens", crypto.randomUUID());
  await fs.mkdir(dir, { recursive: true });
  return dir;
}