"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types
export type IdentifiedField = {
  name: string;
  type: string;
  description: string;
  placeholder: string;
  required: boolean;
  replacement: string;
};

interface FieldManagerProps {
  docxContent: ArrayBuffer | null;
  onFieldsIdentified: (fields: IdentifiedField[]) => void;
  identifiedFields: IdentifiedField[];
  isAnalyzing: boolean;
  setIsAnalyzing: (analyzing: boolean) => void;
}

const processDocument = async (docxContent: ArrayBuffer): Promise<string> => {
  const { renderAsync } = await import("docx-preview");
  const tempContainer = document.createElement("div");

  await renderAsync(docxContent, tempContainer, undefined, {
    inWrapper: false,
    ignoreWidth: true,
    ignoreHeight: true,
  });

  return tempContainer.textContent || tempContainer.innerText || "";
};

const applyPlaceholders = (
  content: string,
  fields: IdentifiedField[]
): string => {
  const fieldMap = new Map(fields.map((f) => [f.replacement, f]));
  const regex = new RegExp(
    Array.from(fieldMap.keys())
      .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
    "g"
  );

  return content.replace(
    regex,
    (match) => `${match} ${fieldMap.get(match)?.placeholder || ""}`
  );
};

export default function FieldManager({
  docxContent,
  onFieldsIdentified,
  identifiedFields,
  isAnalyzing,
  setIsAnalyzing,
}: FieldManagerProps) {
  const [documentText, setDocumentText] = useState<string>("");
  const [placeholdersApplied, setPlaceholdersApplied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const extractDocumentText = async () => {
      if (!docxContent) return;

      try {
        const text = await processDocument(docxContent);
        setDocumentText(text);
      } catch (error) {
        console.error("Error extracting document text:", error);
        toast({
          title: "Error",
          description: "Failed to process document",
          variant: "destructive",
        });
      }
    };

    extractDocumentText();
  }, [docxContent, toast]);

  const analyzeDocument = useCallback(async () => {
    if (!documentText) {
      toast({
        title: "No Document",
        description: "Please upload a document first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const startTime = Date.now();
      const response = await fetch("/api/analyze-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-request-start": startTime.toString(),
        },
        body: JSON.stringify({ documentText }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze document");
      }

      const { object } = await response.json();

      if (object.fields && Array.isArray(object.fields)) {
        onFieldsIdentified(object.fields);
        toast({
          title: "Analysis Complete",
          description: `Found ${object.fields.length} fillable fields (${object.metadata.processingTime}ms)`,
        });
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error analyzing document:", error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze document for fillable fields",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [documentText, onFieldsIdentified, setIsAnalyzing, toast]);

  const handleApplyPlaceholders = useCallback(async () => {
    if (identifiedFields.length === 0) {
      toast({
        title: "No Fields",
        description: "Please analyze the document first to identify fields",
        variant: "destructive",
      });
      return;
    }

    if (placeholdersApplied) {
      toast({
        title: "Placeholders Already Applied",
        description: "Placeholders have already been applied to this document",
        variant: "destructive",
      });
      return;
    }

    try {
      const documentContainer = document.querySelector(".document-container");
      if (!documentContainer) return;

      const content = documentContainer.innerHTML;
      const updatedContent = applyPlaceholders(content, identifiedFields);

      documentContainer.innerHTML = updatedContent;
      setPlaceholdersApplied(true);

      toast({
        title: "Placeholders Applied",
        description: `Applied ${identifiedFields.length} placeholders to the document`,
      });
    } catch (error) {
      console.error("Error applying placeholders:", error);
      toast({
        title: "Error",
        description: "Failed to apply placeholders to document",
        variant: "destructive",
      });
    }
  }, [identifiedFields, placeholdersApplied, toast]);

  const getFieldTypeIcon = useCallback((type: string) => {
    const icons = {
      date: "📅",
      email: "📧",
      phone: "📞",
      address: "🏠",
      number: "🔢",
      checkbox: "☑️",
      text: "📝",
    };
    return icons[type as keyof typeof icons] || icons.text;
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center">
          <FileText className="mr-2 h-5 w-5" />
          Field Manager
        </h2>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="p-4">
          <Button
            onClick={analyzeDocument}
            disabled={isAnalyzing || !docxContent}
            className="w-full mb-4"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Document...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Analyze Document
              </>
            )}
          </Button>

          {identifiedFields.length > 0 && (
            <Button
              onClick={handleApplyPlaceholders}
              variant="outline"
              className="w-full mb-4"
              disabled={placeholdersApplied}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              {placeholdersApplied
                ? "Placeholders Applied"
                : "Apply Placeholders"}
            </Button>
          )}
        </div>

        <Separator />

        <ScrollArea className="flex-1 p-4">
          {identifiedFields.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <AlertCircle className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No fields identified yet.</p>
              <p className="text-sm">
                Upload a document and click "Analyze Document" to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="font-medium text-sm text-gray-700 mb-3">
                Identified Fields ({identifiedFields.length})
              </h3>
              {identifiedFields.map((field, index) => (
                <Card key={index} className="p-3 flex flex-col gap-2 w-full">
                  <div className="flex items-start">
                    <div className="flex items-center">
                      <span className="mr-2">
                        {getFieldTypeIcon(field.type)}
                      </span>
                      <h4 className="font-medium text-sm">{field.name}</h4>
                    </div>
                    <div className="flex gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {field.type}
                      </Badge>
                      {field.required && (
                        <Badge variant="destructive" className="text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{field.description}</p>

                  <code className="text-xs bg-gray-100 px-2 py-1 rounded w-fit">
                    {field.placeholder}
                  </code>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
