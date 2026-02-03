import { access, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export default async function ensureDir(dirpath: string) {
  await mkdir(dirpath, { recursive: true });
  const gitignorePath = join(dirpath, '.gitignore');
  try {
    await access(gitignorePath);
  } catch {
    await writeFile(gitignorePath, '*', 'utf-8');
  }
}
