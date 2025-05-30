

import { NextResponse } from "next/server";
import { processDocumentFromStorage } from "@/lib/processDocumentFromStorage";

/**
 * API route handler to process an uploaded document from Firebase Storage.
 * Expects a POST request with a JSON body containing the 'path' to the file.
 */
export async function POST(req: Request) {
  try {
    // Parse the JSON body from the request
    const { path, userId, tenantId } = await req.json();

    // Validate that 'path' is provided and is a string
    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'path' field." }, { status: 400 });
    }
    // Validate that 'tenantId' is provided and is a string
    if (!tenantId || typeof tenantId !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'tenantId' field." }, { status: 400 });
    }
    // Validate that 'userId' is provided and is a string
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'userId' field." }, { status: 400 });
    }

    // Extract fileId from the path by splitting on '/' and taking the last segment
    const parts = path.split('/'); // Split the path into its segments
    const fileId = parts[parts.length - 1]; // fileId is the last segment of the path

    // Run the document processing pipeline with the provided path, tenantId, and fileId
    const result = await processDocumentFromStorage(path, tenantId, fileId);

    // Respond with a success flag and the result from processing
    return NextResponse.json({ success: true, result });
  } catch (error) {
    // Log any errors that occur during processing
    console.error("Error in /api/process-upload:", error);
    // Respond with a 500 status code and error message
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}