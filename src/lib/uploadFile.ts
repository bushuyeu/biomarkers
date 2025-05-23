// src/lib/uploadFile.ts

import { storage, auth } from "./firebase";  // Import Firebase instances (firestore removed)
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

/**
 * Upload a file to Firebase Storage and trigger server-side processing.
 *
 * @param file - The file to upload.
 * @param onProgress - Optional callback to report upload progress (percent complete).
 * @returns The Firebase Storage path of the uploaded file.
 */
export async function uploadFile(file: File, onProgress?: (percent: number) => void): Promise<string> {
    // Get the currently logged-in user from Firebase Auth
    const user = auth.currentUser;

    // Ensure user is authenticated before allowing uploads
    if (!user) {
        throw new Error("User must be logged in to upload files.");
    }

    // Generate a unique storage path using user ID, timestamp, and file name
    const timestamp = Date.now();
    const storagePath = `users/${user.uid}/uploads/${timestamp}-${file.name}`;
    // Create a reference to the file location in Firebase Storage
    const fileRef = ref(storage, storagePath);

    // Start the upload with uploadBytesResumable to allow tracking progress
    const uploadTask = uploadBytesResumable(fileRef, file);

    // Wait for the upload to complete, reporting progress if a callback is provided
    await new Promise<string>((resolve, reject) => {
        uploadTask.on(
            "state_changed",
            (snapshot) => {
                // Calculate upload percentage and call onProgress callback if provided
                const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(Math.round(percent));
            },
            (error) => reject(error),  // Propagate upload errors
            async () => {
                // Upload complete, get the download URL (not used here, but could be useful)
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                // No Firestore metadata write here
                resolve(storagePath);  // Resolve with the storage path
            }
        );
    });

    // After upload, notify the server to process the uploaded file.
    // This POST request sends the storage path to a server-side API route for further processing.
    await fetch("/api/process-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: storagePath }),
    });

    // Return the storage path of the uploaded file
    return storagePath;
}