import { generateObject, generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { documentText } = await request.json();

    if (!documentText) {
      return NextResponse.json(
        { error: "Document text is required" },
        { status: 400 }
      );
    }

    const { object } = await generateObject({
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
      prompt: `Analyze this document and identify all fillable fields that would typically need to be completed by a user. 

Document content:
${documentText}

Please identify fields, take note that some fields may have a legend, which should be included in the name and replacement. 
Some examples of fields that should be identified are, but not limited to:
- Names (first name, last name, full name)
- Addresses (street, city, state, zip)
- Contact information (phone, email)
- Dates (birth date, signature date, etc.)
- Numbers (SSN, ID numbers, amounts)
- Text fields (descriptions, comments)
- Checkboxes or selections

For each field, this what the information should be: 
{
  "name": "field_name",
  "type": "text|number|date|email|phone|address|checkbox",
  "description": "Brief description of what this field is for",
  "placeholder": "[[FIELD_NAME]]",
  "required": true|false,
  "replacement": "text that can be used to find and replace the field in the document, include whitespace, underscores, etc. everything to make as precise as possible"
}`,
      system:
        "You are a document analysis expert. Analyze documents to identify fillable fields that users would need to complete. Return only valid JSON.",
    });

    return NextResponse.json({ object });
  } catch (error) {
    console.error("Error analyzing document:", error);
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    );
  }
}
