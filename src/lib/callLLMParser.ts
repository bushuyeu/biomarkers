import * as Sentry from "@sentry/nextjs"; // Import Sentry for error tracking and logging
import { promptRegistry } from "@/prompts/promptVersions"; // Import prompt registry for prompt file paths
import { ParsedLLMOutputSchema } from "@/lib/zodSchemas"; // Import schema for validating LLM output
import axios from "axios"; // Import axios for HTTP requests
import fs from "fs"; // Import fs for file system operations
import path from "path"; // Import path for handling file paths

let cachedPromptTemplate: string | null = null; // Cache variable for prompt template to avoid re-reading from disk

/**
 * Sends extracted OCR text to OpenRouter's LLM (DeepSeek) to extract structured biomarkers and test date.
 * The prompt is stored separately in a markdown file and injected with OCR text dynamically.
 *
 * @param extractedText - Raw OCR output to be parsed
 * @returns Biomarkers and test date as parsed by the LLM
 */
export async function callLLMParser(extractedText: string): Promise<{
  biomarkers: Array<{
    name: string;
    value: number | string;
    unit?: string;
    referenceRange?: string;
    notes?: string;
  }>;
  testMetadata: {
    date: string;
    type: string;
    confidence: "low" | "medium" | "high";
    issues: string[];
    prompt_version: string;
  };
}> {
  // Load the prompt template from markdown file or use cached version if available
  if (!cachedPromptTemplate) {
    const promptPath = path.resolve(process.cwd(), promptRegistry.extractBiomarkers.path); // Resolve full path to prompt file
    cachedPromptTemplate = fs.readFileSync(promptPath, "utf-8"); // Read prompt template from file system
  }

  // Inject OCR text into the prompt template by replacing placeholder
  const prompt = cachedPromptTemplate.replace("{{TEXT}}", extractedText);

  // Send the prompt to OpenRouter (DeepSeek or Qwen model) with a 5-minute timeout
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions", // API endpoint for chat completions
    {
      model: "deepseek/deepseek-llm:free", // Specify the model to use
      messages: [{ role: "user", content: prompt }], // Message payload containing the prompt
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, // Authorization header with API key
        "Content-Type": "application/json", // Content type header
      },
      timeout: 300000, // Set timeout to 300000 ms (5 minutes)
    }
  );

  const content = response.data.choices[0].message.content; // Extract content from response

  try {
    const parsed = ParsedLLMOutputSchema.parse(JSON.parse(content)); // Parse and validate JSON content using schema

    // Add a Sentry breadcrumb for successful LLM response
    Sentry.addBreadcrumb({
      category: "llm",
      message: "Successfully parsed LLM response",
      data: { content },
      level: Sentry.Severity.Info,
    });

    return parsed; // Return parsed result
  } catch (error) {
    // Capture exception in Sentry with tags and extra context
    Sentry.captureException(error, {
      tags: { scope: "callLLMParser" },
      extra: { content },
    });

    // Throw a more descriptive error for invalid LLM response format
    throw new Error(`Invalid LLM response format: ${error instanceof Error ? error.message : String(error)}`);
  }
  
}