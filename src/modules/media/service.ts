import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export async function uploadFile(
  file: File,
  _uploadedById: string
): Promise<{
  storageKey: string;
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}> {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name);
  const storageKey = `${uuidv4()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, storageKey);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  return {
    storageKey,
    url: `/uploads/${storageKey}`,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  };
}
