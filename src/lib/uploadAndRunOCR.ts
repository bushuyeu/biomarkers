// src/lib/uploadAndRunOCR.ts

import { uploadFile } from "./uploadFile";
import { runOCR } from "./runOCR";
import { ref, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads a file to Firebase Storage and triggers OCR processing after upload.
 * @param file - The file to upload
 * @param tenantId - The tenant to associate with the upload
 * @param userId - The uploader’s Firebase Auth UID
 * @param onProgress - Optional progress callback
 */
export async function uploadAndRunOCR(
  file: File,
  tenantId: string,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<void> {
  // Upload the file to Firebase Storage
  const uploadedPath = await uploadFile(file, onProgress);

  // Get the public download URL for the file
  const fileRef = ref(storage, uploadedPath);
  const fileUrl = await getDownloadURL(fileRef);

  // Run OCR and store the result in Firestore
  await runOCR(fileUrl, uploadedPath, tenantId, userId);
}