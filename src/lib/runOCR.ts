import { createWorker } from "tesseract.js"; // OCR engine for Node.js
import { firestore } from "@/lib/firebase"; // Firebase Firestore instance
import { doc, setDoc } from "firebase/firestore";
import axios from "axios";

/**
 * Downloads a file (image file: .jpg, .png, .webp, .tiff) from a given URL,
 * runs OCR on it using Tesseract, and stores the extracted text to Firestore.
 * @param fileUrl - The public download URL of the file in Firebase Storage
 * @param filePath - The Firebase Storage path where the file was saved
 * @param tenantId - The tenant ID for multi-tenant Firestore structure
 * @param userId - The UID of the user who uploaded the file
 */
export async function runOCR(fileUrl: string, filePath: string, tenantId: string, userId: string): Promise<void> {
    try {
        // 1. Fetch the file from the download URL as a binary blob
        const response = await axios.get(fileUrl, {
            responseType: "arraybuffer", // Ensures binary data
        });

        // Converts supported image file types (.jpg, .png, .webp, .tiff) into a Buffer for OCR
        const imageBuffer = Buffer.from(response.data); // Convert to Buffer for Tesseract

        // 2. Initialize the Tesseract OCR worker
        const worker = await createWorker("eng"); // Use English; can also support 'rus' etc.

        // Tesseract processes the image buffer and extracts readable text
        const { data } = await worker.recognize(imageBuffer); // Run OCR and get result

        // 4. Extract text from Tesseract's response
        const extractedText = data.text.trim();

        // 5. Save the extracted text to Firestore
        const fileId = filePath.split("/").pop() ?? filePath; // Extract fileId from path
        const fileRef = doc(firestore, "tenants", tenantId, "users", userId, "files", fileId);
        await setDoc(fileRef, {
            extractedText,
            createdAt: new Date().toISOString(),
            status: "pending_review",
            fileUrl,
            type: "blood",
            uploadedBy: userId,
        });

        // 6. Clean up the OCR worker
        await worker.terminate();
    } catch (error) {
        console.error("OCR failed:", error);
        throw new Error("OCR processing failed");
    }
}