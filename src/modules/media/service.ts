import { v4 as uuidv4 } from "uuid";
import { supabase, STORAGE_BUCKET } from "@/lib/supabase";

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
  const ext = file.name.split(".").pop() ?? "bin";
  const storageKey = `${uuidv4()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storageKey, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storageKey);

  return {
    storageKey,
    url: publicUrl,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
  };
}
