

import { NextResponse } from "next/server"; // Import Next.js response helper
import { UploadRequestSchema } from "@/lib/zodSchemas"; // Import shared schema from central location
import * as Sentry from "@sentry/nextjs"; // Import Sentry for error reporting
import { getAdminBucket } from "@/lib/firebaseAdmin"; // Import Firebase admin bucket getter


export async function POST(req: Request) {
  try {
    // Parse and validate the incoming request body
    const body = await req.json(); // Read the request body
    const { path } = UploadRequestSchema.parse(body); // Validate and extract `path` only (others can be used if needed)

    // Access the Firebase Storage bucket using lazy-initialized admin SDK
    const bucket = getAdminBucket();
    const file = bucket.file(path); // Create a file reference for the given path

    // Generate a signed URL allowing client to PUT the file directly to Firebase Storage
    const [signedUrl] = await file.getSignedUrl({
      version: "v4", // Use v4 signed URLs
      action: "write", // Allow writing (uploading) the file
      expires: Date.now() + 10 * 60 * 1000, // URL expires in 10 minutes
      contentType: "application/octet-stream", // Required by Firebase for PUT requests
    });

    // Return the signed upload URL to the client
    return NextResponse.json({ signedUrl }); // Respond with the signed URL
  } catch (error) {
    // Log and report the error if anything goes wrong
    console.error("❌ Error creating signed URL:", error); // Log to console for local debugging
    Sentry.captureException(error); // Send error to Sentry for monitoring
    return NextResponse.json({ error: "Failed to create signed upload URL." }, { status: 400 }); // Return 400 to client
  }
}