export interface Attachment {
  id: string;
  itemId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageKey: string;
  url?: string;
  uploadedById: string;
  createdAt: Date;
}

export interface UploadResult {
  storageKey: string;
  url: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}
