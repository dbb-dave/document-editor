import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Document processing utilities
const preprocessDocument = (text: string): string => {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\n\s*\n/g, "\n") // Normalize line breaks
    .replace(/[^\S\r\n]+/g, " ") // Remove multiple spaces
    .trim();
};

export async function POST(request: NextRequest) {
  try {
    const { documentText } = await request.json();

    if (!documentText) {
      return NextResponse.json(
        { error: "Document text is required" },
        { status: 400 }
      );
    }

    // Preprocess document
    const processedText = preprocessDocument(documentText);

    // Process entire document
    const result = await generateObject({
      model: openai("gpt-4.1"),
      schema: z.object({
        fields: z.array(
          z.object({
            name: z.string(),
            type: z.string(),
            description: z.string(),
            placeholder: z.string(),
            required: z.boolean(),
            replacement: z.string(),
          })
        ),
      }),
      system:
        "You are a specialized document field extraction AI. Your task is to identify and structure fillable fields from documents. Follow these rules strictly: 1) Only extract fields that require user input 2) Maintain field context and relationships 3) Return structured JSON matching the defined schema 4) Do not make assumptions about optional fields",
      prompt: `Extract fillable fields from this document:

${processedText}

Instructions:
1. Identify all user-input fields (names, addresses, contact info, dates, numbers, text areas, checkboxes)
2. For each field, provide:
   - name: unique identifier (snake_case)
   - type: text|number|date|email|phone|address|checkbox
   - description: field purpose (1-2 words)
   - placeholder: [[FIELD_NAME]]
   - required: true|false
   - replacement: text that can be used to find and replace the field in the document

Note: Include field legends/context in replacement text for precise matching. (e.g. "Date of Birth: (mm-dd-yyyy)")`,
    });

    return NextResponse.json({
      object: {
        fields: result.object.fields,
        metadata: {
          totalFields: result.object.fields.length,
          processingTime:
            Date.now() -
            parseInt(request.headers.get("x-request-start") || "0", 10),
        },
      },
    });
  } catch (error) {
    console.error("Error analyzing document:", error);
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    );
  }
}
