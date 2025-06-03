"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadRequestSchema = exports.FileMetadataSchema = exports.ParsedLLMOutputSchema = exports.TestMetadataSchema = exports.BiomarkerSchema = void 0;
const zod_1 = require("zod");
exports.BiomarkerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    value: zod_1.z.union([zod_1.z.number(), zod_1.z.string()]),
    unit: zod_1.z.string().optional(),
    referenceRange: zod_1.z.string().optional(),
    notes: zod_1.z.string().optional(),
});
exports.TestMetadataSchema = zod_1.z.object({
    date: zod_1.z.string(),
    type: zod_1.z.string(),
    confidence: zod_1.z.enum(["low", "medium", "high"]),
    issues: zod_1.z.array(zod_1.z.string()),
    prompt_version: zod_1.z.literal("0.1"),
});
exports.ParsedLLMOutputSchema = zod_1.z.object({
    biomarkers: zod_1.z.array(exports.BiomarkerSchema),
    testMetadata: exports.TestMetadataSchema,
});
exports.FileMetadataSchema = zod_1.z.object({
    uploaderUserId: zod_1.z.string(),
    reviewerUserIds: zod_1.z.array(zod_1.z.string()).optional(),
});
// UploadRequestSchema is used to validate requests for signed upload URLs
exports.UploadRequestSchema = zod_1.z.object({
    path: zod_1.z.string().min(1),
    tenantId: zod_1.z.string().min(1),
    userId: zod_1.z.string().min(1), // ID of the user initiating the upload
});
//# sourceMappingURL=zodSchemas.js.map