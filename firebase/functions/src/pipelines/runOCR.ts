import { createWorker } from "tesseract.js"; // OCR engine for Node.js

/**
 * Runs OCR on an image buffer using Tesseract and returns the extracted text.
 * This function is used in backend processing only.
 *
 * @param imageBuffer - The image data as a Buffer
 * @returns Extracted text from the image
 */
export async function runOCR(imageBuffer: Buffer): Promise<string> {
    try {
        // Initialize the Tesseract worker with English language support
        const worker = await createWorker("eng");

        // Run OCR on the image buffer to extract text
        const { data } = await worker.recognize(imageBuffer);

        // Shut down the worker to free up resources
        await worker.terminate();

        // Return trimmed extracted text
        return data.text.trim();
    } catch (error) {
        console.error("OCR failed:", error);
        throw new Error("OCR processing failed");
    }
}