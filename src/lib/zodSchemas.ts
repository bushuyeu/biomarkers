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
