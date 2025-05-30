// src/lib/uploadFile.ts

import * as Sentry from "@sentry/nextjs";  // Import Sentry for error tracking and logging
import { storage, auth } from "./firebase";  // Import Firebase instances (firestore removed)
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";  // Import Firebase Storage functions

/**
 * Upload a file to Firebase Storage and trigger server-side processing.
 *
 * @param file - The file to upload.
 * @param onProgress - Optional callback to report upload progress (percent complete).
 * @returns The Firebase Storage path of the uploaded file.
 */
export async function uploadFile(file: File, onProgress?: (percent: number) => void): Promise<string> {  // Define async function to upload file and optionally track progress
    // Get the currently logged-in user from Firebase Auth
    const user = auth.currentUser;  // Retrieve the current authenticated user

    // Ensure user is authenticated before allowing uploads
    if (!user) {  // Check if there is no authenticated user
        throw new Error("User must be logged in to upload files.");  // Throw error if user is not logged in
    }

    // Generate a unique storage path using user ID, timestamp, and file name
    const timestamp = Date.now();  // Get current timestamp in milliseconds
    const storagePath = `users/${user.uid}/uploads/${timestamp}-${file.name}`;  // Construct a unique storage path for the file
    // Create a reference to the file location in Firebase Storage
    const fileRef = ref(storage, storagePath);  // Create a Firebase Storage reference for the file path

    // Start the upload with uploadBytesResumable to allow tracking progress
    const uploadTask = uploadBytesResumable(fileRef, file);  // Begin resumable upload of the file

    // Wait for the upload to complete, reporting progress if a callback is provided
    await new Promise<string>((resolve, reject) => {  // Create a promise to handle upload completion
        uploadTask.on(  // Attach event listeners to the upload task
            "state_changed",  // Listen for state changes during upload
            (snapshot) => {  // Callback for progress updates
                // Calculate upload percentage and call onProgress callback if provided
                const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;  // Calculate upload progress percentage
                if (onProgress) onProgress(Math.round(percent));  // Call onProgress callback with rounded percent if provided
            },
            (error) => reject(error),  // Propagate upload errors by rejecting the promise
            async () => {  // Callback for successful completion of upload
                // Upload complete, get the download URL (not used here, but could be useful)
                const _downloadURL = await getDownloadURL(uploadTask.snapshot.ref);  // Retrieve download URL of uploaded file (unused)
                // No Firestore metadata write here
                resolve(storagePath);  // Resolve the promise with the storage path of the uploaded file
            }
        );
    });

    // After upload, notify the server to process the uploaded file.
    // This POST request sends the storage path to a server-side API route for further processing.
    Sentry.captureMessage("📡 Upload completed, triggering /api/process-upload", {  // Log an info message to Sentry about upload completion
        level: "info",  // Set log level to info
        extra: {  // Include extra context data
            path: storagePath,  // Include the storage path of the uploaded file
            userId: user.uid,  // Include the user ID
        },
    });

    try {  // Attempt to notify server-side API about the uploaded file
        await fetch("/api/process-upload", {  // Make a POST request to the server endpoint
            method: "POST",  // Use POST method
            headers: { "Content-Type": "application/json" },  // Set request headers for JSON payload
            body: JSON.stringify({
                path: storagePath,
                userId: user.uid,
                tenantId: "Awesome Biomarkers Operator",  // hardcoded for B2C setup
            }),  // Send storage path, userId, and tenantId in request body as JSON
        });
    } catch (error) {  // Catch any errors from the fetch request
        Sentry.captureException(error, {  // Report the exception to Sentry
            tags: { scope: "uploadFile → api/process-upload" },  // Tag the error with scope information
            extra: { storagePath },  // Attach storage path as extra data
        });
        throw error;  // Rethrow the error after logging
    }

    // Return the storage path of the uploaded file
    return storagePath;  // Return the Firebase Storage path where the file was uploaded
}