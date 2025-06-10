import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { IdentifiedField } from "@/components/field-manager";

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
const preprocessDocument = (text: string): string => {
  return text
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\n\s*\n/g, "\n") // Normalize line breaks
    .replace(/[^\S\r\n]+/g, " ") // Remove multiple spaces
    .trim();
};

// Document processing utilities
const CHUNK_SIZE = 2000; // Characters per chunk for GPT-4

const splitDocumentIntoChunks = (text: string): string[] => {
  const chunks: string[] = [];
  let currentChunk = "";
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let totalChunks = 0;

  for (const sentence of sentences) {
    const potentialChunkSize = (currentChunk + sentence).length;
    console.log(
      `[Chunk Processing] Current chunk size: ${potentialChunkSize}/${CHUNK_SIZE} characters`
    );

    if (potentialChunkSize > CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        totalChunks++;
        console.log(
          `[Chunk Processing] Created chunk ${totalChunks} with ${currentChunk.length} characters`
        );
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
    totalChunks++;
    console.log(
      `[Chunk Processing] Created final chunk ${totalChunks} with ${currentChunk.length} characters`
    );
  }
  console.log(`[Chunk Processing] Total chunks created: ${totalChunks}`);
  return chunks;
};

const validateFieldType = (
  field: Omit<IdentifiedField, "confidence" | "relationships">
) => {
  const pattern =
    fieldTypeValidation[field.type as keyof typeof fieldTypeValidation];
  if (pattern && !pattern.test(field.replacement)) {
    return {
      ...field,
      confidence: "low",
    };
  }
  return {
    ...field,
    confidence: "high",
  };
};

const validateFields = (
  fields: Omit<IdentifiedField, "confidence" | "relationships">[]
): IdentifiedField[] => {
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
      relationships: relationships.length > 0 ? relationships : [],
    };
  });
};

const mergeFieldResults = (
  results: { fields: Omit<IdentifiedField, "confidence" | "relationships">[] }[]
): IdentifiedField[] => {
  const allFields = results.flatMap((r) => r.fields || []);
  return validateFields(allFields);
};

export async function POST(request: NextRequest) {
  try {
    const { documentText } = await request.json();
    const startTime = Date.now();

    if (!documentText) {
      return NextResponse.json(
        { error: "Document text is required" },
        { status: 400 }
      );
    }

    // Preprocess document
    const processedText = preprocessDocument(documentText);
    console.log(
      `[Document Processing] Preprocessed text length: ${processedText.length} characters`
    );

    // Split into chunks if needed
    const chunks = splitDocumentIntoChunks(processedText);
    console.log(
      `[Document Processing] Processing ${chunks.length} chunks in parallel`
    );

    // Process entire document
    const chunkStartTime = Date.now();
    const results = await Promise.all(
      chunks.map(async (chunk, index) => {
        const chunkProcessingStart = Date.now();
        try {
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
          });
          const processingTime = Date.now() - chunkProcessingStart;
          console.log(
            `[Chunk ${index + 1}] Processed in ${processingTime}ms, found ${
              result.object.fields.length
            } fields`
          );
          return result;
        } catch (error) {
          console.error(`[Chunk ${index + 1}] Error processing chunk:`, error);
          throw error;
        }
      })
    );

    const totalChunkProcessingTime = Date.now() - chunkStartTime;
    console.log(
      `[Document Processing] All chunks processed in ${totalChunkProcessingTime}ms`
    );

    // Merge and validate results
    const mergeStartTime = Date.now();
    const mergedFields = mergeFieldResults(results.map((r) => r.object));
    const mergeTime = Date.now() - mergeStartTime;
    console.log(
      `[Field Merging] Merged ${mergedFields.length} fields in ${mergeTime}ms`
    );
    console.log(
      `[Field Merging] Removed ${
        results.reduce((acc, r) => acc + r.object.fields.length, 0) -
        mergedFields.length
      } duplicate fields`
    );

    const totalProcessingTime = Date.now() - startTime;
    return NextResponse.json({
      object: {
        fields: mergedFields,
        metadata: {
          totalFields: mergedFields.length,
          processingTime: totalProcessingTime,
          chunkProcessingTime: totalChunkProcessingTime,
          mergeTime: mergeTime,
          chunksProcessed: chunks.length,
          averageChunkTime: totalChunkProcessingTime / chunks.length,
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
