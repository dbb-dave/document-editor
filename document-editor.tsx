"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import FileUploader from "./components/file-uploader"
import DocumentRenderer from "./components/document-renderer"
import ChatInterface from "./components/chat-interface"
import { useToast } from "@/hooks/use-toast"
import FieldManager from "./components/field-manager"

export default function DocumentEditor() {
  const [docxContent, setDocxContent] = useState<ArrayBuffer | null>(null)
  const [fileName, setFileName] = useState<string>("")
  const [isEditing, setIsEditing] = useState(false)
  const { toast } = useToast()

  const [identifiedFields, setIdentifiedFields] = useState<Array<{ name: string; type: string; description: string }>>(
    [],
  )
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleFileUpload = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      setDocxContent(buffer)
      setFileName(file.name)
      toast({
        title: "Document loaded",
        description: `Successfully loaded ${file.name}`,
      })
    } catch (error) {
      console.error("Error reading file:", error)
      toast({
        title: "Error",
        description: "Failed to load document",
        variant: "destructive",
      })
    }
  }

  const handleExport = () => {
    // This will be implemented later for exporting the edited document
    toast({
      title: "Export",
      description: "Document export functionality will be implemented soon",
    })
  }

  const handleAutoFill = async () => {
    if (!docxContent) return

    setIsAnalyzing(true)
    try {
      // This will be handled by the FieldManager component
      // We'll pass the callback to update the identified fields
    } catch (error) {
      console.error("Error during auto-fill analysis:", error)
      toast({
        title: "Error",
        description: "Failed to analyze document for auto-fill",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="border-b bg-white p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Document Editor</h1>
            <div className="flex gap-2">
              {docxContent && (
                <>
                  <Button variant="outline" onClick={handleAutoFill} disabled={isAnalyzing}>
                    {isAnalyzing ? "Analyzing..." : "Auto-Fill"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(!isEditing)}>
                    {isEditing ? "View Mode" : "Edit Mode"}
                  </Button>
                  <Button onClick={handleExport}>Export</Button>
                </>
              )}
            </div>
          </div>
          {fileName && <p className="text-sm text-gray-500 mt-1">Current file: {fileName}</p>}
        </header>

        <main className="flex-1 overflow-auto p-6">
          {!docxContent ? (
            <div className="flex items-center justify-center h-full">
              <FileUploader onFileUpload={handleFileUpload} />
            </div>
          ) : (
            <Tabs defaultValue="document" className="h-full">
              <TabsList>
                <TabsTrigger value="document">Document</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="document" className="h-[calc(100%-40px)]">
                <DocumentRenderer docxContent={docxContent} isEditing={isEditing} />
              </TabsContent>
              <TabsContent value="preview" className="h-[calc(100%-40px)]">
                <Card className="h-full p-6 overflow-auto">
                  <div id="preview-container"></div>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      <div className="w-96 border-l bg-white overflow-y-auto flex flex-col">
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="fields">Fields</TabsTrigger>
          </TabsList>
          <TabsContent value="chat" className="flex-1 flex flex-col">
            <ChatInterface docxContent={docxContent} fileName={fileName} />
          </TabsContent>
          <TabsContent value="fields" className="flex-1 flex flex-col">
            <FieldManager
              docxContent={docxContent}
              fileName={fileName}
              onFieldsIdentified={setIdentifiedFields}
              identifiedFields={identifiedFields}
              isAnalyzing={isAnalyzing}
              setIsAnalyzing={setIsAnalyzing}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
