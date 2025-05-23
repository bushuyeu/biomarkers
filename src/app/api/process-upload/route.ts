

import { NextResponse } from "next/server";
import { processDocumentFromStorage } from "@/lib/processDocumentFromStorage";

/**
 * API route handler to process an uploaded document from Firebase Storage.
 * Expects a POST request with a JSON body containing the 'path' to the file.
 */
export async function POST(req: Request) {
  try {
    // Parse the JSON body
    const { path } = await req.json();

    // Validate that 'path' is provided
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'path' field." }, { status: 400 });
    }

    // Run the document processing pipeline (OCR + LLM simulation)
    const result = await processDocumentFromStorage(path);

    // Respond with the extracted biomarkers and test date
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Error in /api/process-upload:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}