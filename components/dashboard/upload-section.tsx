"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CloudUpload, FileType, Table, AlertCircle, CheckCircle2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { createClient } from "@/lib/supabase/client"
import type { Upload } from "@/lib/types/database"

interface UploadSectionProps {
  projectId: string
  onUploadComplete?: (upload: Upload) => void
}

export function UploadSection({ projectId, onUploadComplete }: UploadSectionProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [currentUpload, setCurrentUpload] = useState<Upload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      if (!file.name.endsWith(".zip")) {
        setError("Only ZIP files are supported")
        return
      }

      setError(null)
      setUploading(true)
      setUploadProgress(0)

      try {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("projectId", projectId)

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            const next = Math.min(95, prev + Math.random() * 10 + 5)
            return next
          })
        }, 200)

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Upload failed")
        }

        const { upload } = await response.json()
        setUploadProgress(100)
        setCurrentUpload(upload)

        // Poll for schema detection
        const pollSchema = async () => {
          const supabase = createClient()
          const { data: updatedUpload } = await supabase.from("uploads").select("*").eq("id", upload.id).single()

          if (updatedUpload?.schema_preview) {
            setCurrentUpload(updatedUpload)
            onUploadComplete?.(updatedUpload)
          } else {
            setTimeout(pollSchema, 1000)
          }
        }

        setTimeout(pollSchema, 2000)
      } catch (error: any) {
        setError(error.message)
      } finally {
        setUploading(false)
      }
    },
    [projectId, onUploadComplete],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/zip": [".zip"],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CloudUpload className="size-5 text-sky-600" />
          Upload & Schema Preview
        </CardTitle>
        <CardDescription>
          Upload a ZIP dataset. We auto-detect schema and show a sample mapping preview.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-sky-500 bg-sky-50 dark:bg-sky-950/20"
              : "border-muted-foreground/25 hover:border-sky-500 hover:bg-sky-50/50 dark:hover:bg-sky-950/10"
          } ${uploading ? "pointer-events-none opacity-50" : ""}`}
        >
          <input {...getInputProps()} />
          <CloudUpload className="size-8 text-muted-foreground mx-auto mb-2" />
          {isDragActive ? (
            <p className="text-sm text-sky-600">Drop the ZIP file here...</p>
          ) : (
            <div>
              <p className="text-sm font-medium">Drag & drop a ZIP file here, or click to select</p>
              <p className="text-xs text-muted-foreground mt-1">Only ZIP files are supported</p>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{Math.round(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            <AlertCircle className="size-4" />
            {error}
          </div>
        )}

        {/* Current Upload Info */}
        {currentUpload && (
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <div className="size-10 rounded-lg bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center">
              <FileType className="size-5 text-sky-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">{currentUpload.filename}</div>
              <div className="text-xs text-muted-foreground">
                {(currentUpload.file_size / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
            <div className="flex items-center gap-2">
              {currentUpload.status === "processed" ? (
                <CheckCircle2 className="size-5 text-emerald-600" />
              ) : (
                <div className="size-5 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
              )}
              <Badge variant={currentUpload.status === "processed" ? "default" : "secondary"}>
                {currentUpload.status}
              </Badge>
            </div>
          </div>
        )}

        {/* Schema Preview */}
        {currentUpload?.schema_preview && (
          <div className="rounded-xl border bg-muted/40 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium flex items-center gap-2">
                <Table className="size-4 text-sky-600" />
                Auto Schema <Badge variant="secondary">{currentUpload.schema_preview.format}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{currentUpload.schema_preview.totalRecords} records</div>
            </div>
            <Separator className="my-2" />
            <div className="space-y-2">
              <div className="grid grid-cols-5 text-xs font-semibold">
                {currentUpload.schema_preview.columns.slice(0, 5).map((col: any) => (
                  <div key={col.name}>{col.name}</div>
                ))}
              </div>
              <div className="grid grid-cols-5 text-xs">
                {currentUpload.schema_preview.columns.slice(0, 5).map((col: any) => (
                  <div key={col.name} className="truncate">
                    {col.sample}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
