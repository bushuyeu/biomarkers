import { z } from "zod";

export const BiomarkerSchema = z.object({
  name: z.string().min(1),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  referenceRange: z.string().optional(),
  notes: z.string().optional(),
});

export const TestMetadataSchema = z.object({
  date: z.string(),
  type: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  issues: z.array(z.string()),
  prompt_version: z.literal("0.1"),
});

export const ParsedLLMOutputSchema = z.object({
  biomarkers: z.array(BiomarkerSchema),
  testMetadata: TestMetadataSchema,
});

export type ParsedLLMOutput = z.infer<typeof ParsedLLMOutputSchema>;

export const FileMetadataSchema = z.object({
  uploaderUserId: z.string(),
  reviewerUserIds: z.array(z.string()).optional(),
});

export type FileMetadata = z.infer<typeof FileMetadataSchema>;


// UploadRequestSchema is used to validate requests for signed upload URLs
export const UploadRequestSchema = z.object({
  path: z.string().min(1), // Firebase Storage path to store the file (e.g., users/{uid}/uploads/{filename})
  tenantId: z.string().min(1), // ID of the tenant uploading the file
  userId: z.string().min(1), // ID of the user initiating the upload
});

// TypeScript type derived from the schema for strong typing in route handlers
export type UploadRequest = z.infer<typeof UploadRequestSchema>;