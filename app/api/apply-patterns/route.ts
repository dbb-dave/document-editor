import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { type NextRequest, NextResponse } from "next/server"

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { documentText, fields } = await request.json()

    if (!documentText || !fields) {
      return NextResponse.json(
        { error: "Document text and fields are required" },
        { status: 400 }
      )
    }

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: `Using the following discovered fields:

        ${fields}

        Replace or insert the corresponding placeholders in the following text by identifying the fields in the document, and then filling them in with the corresponding [[PLACEHOLDER]] from the fields array:

        ${documentText}

        Return the answer in plain text with the fields replaced and respecting the original formatting.
`,
      system:
        "You are a document analysis expert. Analyze documents to identify and update fillable fields that users would need to complete. Return the answer in plain text.",
    })

    return NextResponse.json({ newText: text })
  } catch (error) {
    console.error("Error analyzing/replacing placeholders in document:", error)
    return NextResponse.json(
      { error: "Failed to analyze/replace placeholders in document" },
      { status: 500 }
    )
  }
}
