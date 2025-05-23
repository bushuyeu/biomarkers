// src/lib/uploadFile.ts

import { storage, firestore, auth } from "./firebase";  // Import Firebase instances
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Upload a file to Firebase Storage and log metadata in Firestore.
 */
export async function uploadFile(file: File, onProgress?: (percent: number) => void): Promise<string> {
    const user = auth.currentUser;  // Get the currently logged-in user

    if (!user) {
        throw new Error("User must be logged in to upload files.");  // Ensure user is authenticated
    }

    const timestamp = Date.now();  // Unique identifier to avoid overwrites
    const storagePath = `users/${user.uid}/uploads/${timestamp}-${file.name}`;  // Firebase storage path
    const fileRef = ref(storage, storagePath);  // Reference in Storage

    const uploadTask = uploadBytesResumable(fileRef, file);  // Start the upload

    await new Promise<string>((resolve, reject) => {
        uploadTask.on(
            "state_changed",
            (snapshot) => {
                const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (onProgress) onProgress(Math.round(percent));
            },
            (error) => reject(error),  // Handle error
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);  // Get URL after upload

                // Removed Firestore metadata write

                resolve(storagePath);  // Upload complete, return file path
            }
        );
    });

    return storagePath;
}