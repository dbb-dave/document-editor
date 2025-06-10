// Advanced field detection utilities

export interface DocumentField {
  name: string
  type: "text" | "number" | "date" | "email" | "phone" | "address" | "checkbox"
  description: string
  placeholder: string
  required: boolean
  position?: {
    start: number
    end: number
  }
}

export function cleanUpAgentResponse(rawString: string): string {
  const rawText = rawString
    .replace(/^```json\\n/, "")
    .replace(/\\n```$/, "")
    .replace(/^```json/, "")
    .replace(/```$/, "")

  const parsedText = rawText
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")

  const JSONText = JSON.parse(parsedText)
  return JSON.stringify(JSONText, null, 2)
}

export function detectCommonFieldPatterns(text: string): DocumentField[] {
  const fields: DocumentField[] = []

  // Common field patterns
  const patterns = [
    {
      regex: /name\s*:?\s*_+|full\s*name\s*:?\s*_+/gi,
      type: "text" as const,
      name: "full_name",
      description: "Full name of the person",
    },
    {
      regex: /first\s*name\s*:?\s*_+/gi,
      type: "text" as const,
      name: "first_name",
      description: "First name",
    },
    {
      regex: /last\s*name\s*:?\s*_+/gi,
      type: "text" as const,
      name: "last_name",
      description: "Last name",
    },
    {
      regex: /email\s*:?\s*_+|e-mail\s*:?\s*_+/gi,
      type: "email" as const,
      name: "email",
      description: "Email address",
    },
    {
      regex: /phone\s*:?\s*_+|telephone\s*:?\s*_+/gi,
      type: "phone" as const,
      name: "phone",
      description: "Phone number",
    },
    {
      regex: /date\s*:?\s*_+|date\s*of\s*birth\s*:?\s*_+/gi,
      type: "date" as const,
      name: "date",
      description: "Date field",
    },
    {
      regex: /address\s*:?\s*_+/gi,
      type: "address" as const,
      name: "address",
      description: "Street address",
    },
    {
      regex: /signature\s*:?\s*_+/gi,
      type: "text" as const,
      name: "signature",
      description: "Signature field",
    },
  ]

  patterns.forEach((pattern) => {
    const matches = text.matchAll(pattern.regex)
    for (const match of matches) {
      fields.push({
        name: pattern.name,
        type: pattern.type,
        description: pattern.description,
        placeholder: `[[${pattern.name.toUpperCase()}]]`,
        required: true,
        position: {
          start: match.index || 0,
          end: (match.index || 0) + match[0].length,
        },
      })
    }
  })

  return fields
}

export function replaceFieldsWithPlaceholders(content: string, fields: DocumentField[]): string {
  let updatedContent = content

  // Sort fields by position (descending) to avoid index shifting issues
  const sortedFields = [...fields].sort((a, b) => (b.position?.start || 0) - (a.position?.start || 0))

  sortedFields.forEach((field) => {
    if (field.position) {
      const before = updatedContent.substring(0, field.position.start)
      const after = updatedContent.substring(field.position.end)
      updatedContent = before + field.placeholder + after
    }
  })

  return updatedContent
}
