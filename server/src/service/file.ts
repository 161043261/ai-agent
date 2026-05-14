import crc32 from "crc-32";
import { copyFileSync, mkdirSync, readFileSync, unlinkSync } from "fs";
import { extname, join } from "path";
import { logger } from "../config";
import { validateFile } from "../utils/fs";

export async function uploadFile4rag(
  username: string,
  file: { originalname: string; path: string },
): Promise<string> {
  validateFile(file.originalname);

  const userDir = join("uploads", username);
  mkdirSync(userDir, { recursive: true });

  const extName = extname(file.originalname);
  const fileBuffer = readFileSync(file.path);
  const crc32Value = crc32.buf(fileBuffer) >>> 0;
  const filename = crc32Value.toString(16).padStart(8, "0");

  const dstPath = join(userDir, filename + extName);
  copyFileSync(file.path, dstPath);
  // Clean up temp file
  unlinkSync(file.path);
  logger.info(`File uploaded successfully: ${dstPath}`);
  return dstPath;
}
