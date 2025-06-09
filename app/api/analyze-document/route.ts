import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Field type validation patterns
const fieldTypeValidation = {
  date: /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s-()]{10,}$/,
  number: /^\d+(\.\d+)?$/,
  address: /^[\w\s,.-]+$/,
} as const;

// Document processing utilities
const CHUNK_SIZE = 4000; // Characters per chunk for GPT-4

const preprocessDocument = (text: string): string => {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\n\s*\n/g, "\n") // Normalize line breaks
    .replace(/[^\S\r\n]+/g, " ") // Remove multiple spaces
    .trim();
};

const splitDocumentIntoChunks = (text: string): string[] => {
  const chunks: string[] = [];
  let currentChunk = "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > CHUNK_SIZE) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
};

const validateFieldType = (field: any) => {
  const pattern =
    fieldTypeValidation[field.type as keyof typeof fieldTypeValidation];
  if (pattern && !pattern.test(field.replacement)) {
    return {
      ...field,
      type: "text",
      confidence: "low",
      originalType: field.type,
    };
  }
  return {
    ...field,
    confidence: "high",
  };
};

const validateFields = (fields: any[]): any[] => {
  // Remove duplicates based on replacement text
  const uniqueFields = Array.from(
    new Map(fields.map((f) => [f.replacement, f])).values()
  );

  // Validate and enhance fields
  return uniqueFields.map((field) => {
    const validatedField = validateFieldType(field);

    // Add field relationships
    const relationships = uniqueFields
      .filter((f) => f !== field)
      .filter((f) => {
        const fieldWords = new Set(
          field.replacement.toLowerCase().split(/\W+/)
        );
        const otherWords = new Set(f.replacement.toLowerCase().split(/\W+/));
        const commonWords = [...fieldWords].filter((w) => otherWords.has(w));
        return commonWords.length >= 2; // At least 2 common words indicate relationship
      })
      .map((f) => f.name);

    return {
      ...validatedField,
      relationships: relationships.length > 0 ? relationships : undefined,
    };
  });
};

const mergeFieldResults = (results: any[]): any[] => {
  const allFields = results.flatMap((r) => r.fields || []);
  return validateFields(allFields);
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

    // Split into chunks if needed
    const chunks = splitDocumentIntoChunks(processedText);

    // Process chunks in parallel
    const results = await Promise.all(
      chunks.map((chunk) =>
        generateObject({
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
          prompt: `Extract fillable fields from this document chunk:

${chunk}

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
        })
      )
    );

    // Merge and validate results
    const mergedFields = mergeFieldResults(results.map((r) => r.object));

    return NextResponse.json({
      object: {
        fields: mergedFields,
        metadata: {
          totalChunks: chunks.length,
          totalFields: mergedFields.length,
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
