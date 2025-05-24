import { promptRegistry } from "@/prompts/promptVersions";
import { ParsedLLMOutputSchema } from "./zodSchemas";
import axios from "axios";
import fs from "fs";
import path from "path";

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
  // Load the prompt template from markdown file
  const promptPath = path.resolve(process.cwd(), promptRegistry.extractBiomarkers.path);
  const promptTemplate = fs.readFileSync(promptPath, "utf-8");

  // Inject OCR text into the prompt
  const prompt = promptTemplate.replace("{{TEXT}}", extractedText);

  // Send the prompt to OpenRouter (DeepSeek or Qwen model)
  const response = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      model: "deepseek/deepseek-llm:free",
      messages: [{ role: "user", content: prompt }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const content = response.data.choices[0].message.content;

  try {
    const parsed = ParsedLLMOutputSchema.parse(JSON.parse(content));
    return parsed;
  } catch (error) {
    console.error("Failed to parse LLM output with Zod schema", error);
    throw new Error("Invalid LLM response format");
  }
}