"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { CloudDownload, Download, FileType, Loader2, CheckCircle2, AlertCircle, Package } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { PipelineJob, ExportArtifact } from "@/lib/types/database"

interface ExportSectionProps {
  job?: PipelineJob
}

export function ExportSection({ job }: ExportSectionProps) {
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["coco", "jsonl"])
  const [exports, setExports] = useState<ExportArtifact[]>([])
  const [generating, setGenerating] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (job?.id && job.status === "completed") {
      loadExports()
    }
  }, [job])

  const loadExports = async () => {
    if (!job?.id) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("export_artifacts").select("*").eq("job_id", job.id)

      if (error) throw error
      setExports(data || [])
    } catch (error) {
      console.error("Error loading exports:", error)
    }
  }

  const generateExports = async () => {
    if (!job?.id || selectedFormats.length === 0) return

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/exports/${job.id}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formats: selectedFormats,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate exports")
      }

      const { exports: newExports } = await response.json()
      setExports(newExports)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setGenerating(false)
    }
  }

  const downloadExport = async (artifact: ExportArtifact) => {
    setDownloading(artifact.id)

    try {
      const response = await fetch(artifact.download_url)

      if (!response.ok) {
        throw new Error("Failed to download export")
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = artifact.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error downloading export:", error)
    } finally {
      setDownloading(null)
    }
  }

  const downloadAll = async () => {
    for (const artifact of exports) {
      await downloadExport(artifact)
      // Add a small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  const toggleFormat = (format: string) => {
    setSelectedFormats((prev) => (prev.includes(format) ? prev.filter((f) => f !== format) : [...prev, format]))
  }

  const getFormatDescription = (format: string) => {
    switch (format) {
      case "coco":
        return "Common Objects in Context format for object detection"
      case "yolo":
        return "YOLO format for real-time object detection"
      case "jsonl":
        return "JSON Lines format for structured data"
      default:
        return ""
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  if (!job) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudDownload className="size-5 text-indigo-600" />
            Export & Downloads
          </CardTitle>
          <CardDescription>Choose target formats and download artifacts.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="size-16 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
            <Package className="size-8 text-indigo-600 opacity-50" />
          </div>
          <p className="text-sm text-muted-foreground">No pipeline job available</p>
          <p className="text-xs text-muted-foreground">Complete a pipeline to generate exports</p>
        </CardContent>
      </Card>
    )
  }

  if (job.status !== "completed") {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudDownload className="size-5 text-indigo-600" />
            Export & Downloads
          </CardTitle>
          <CardDescription>Choose target formats and download artifacts.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="size-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <div className="size-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium">Pipeline Running</p>
          <p className="text-xs text-muted-foreground">Exports will be available when pipeline completes</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CloudDownload className="size-5 text-indigo-600" />
          Export & Downloads
        </CardTitle>
        <CardDescription>Choose target formats and download artifacts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            <AlertCircle className="size-4" />
            {error}
          </div>
        )}

        {/* Format Selection */}
        {exports.length === 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Select Export Formats</div>
            <div className="grid gap-3">
              {["coco", "yolo", "jsonl"].map((format) => (
                <div key={format} className="flex items-center justify-between p-3 border rounded-xl">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={format}
                      checked={selectedFormats.includes(format)}
                      onCheckedChange={() => toggleFormat(format)}
                    />
                    <div>
                      <div className="text-sm font-medium">{format.toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground">{getFormatDescription(format)}</div>
                    </div>
                  </div>
                  <Badge variant="outline">{format}</Badge>
                </div>
              ))}
            </div>
            <Button
              onClick={generateExports}
              disabled={generating || selectedFormats.length === 0}
              className="w-full rounded-xl"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Generating Exports...
                </>
              ) : (
                <>
                  <FileType className="mr-2 size-4" />
                  Generate Exports
                </>
              )}
            </Button>
          </div>
        )}

        {/* Generated Exports */}
        {exports.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Available Downloads</div>
              <Button onClick={downloadAll} variant="outline" size="sm" className="rounded-xl bg-transparent">
                <Download className="mr-2 size-4" />
                Download All
              </Button>
            </div>
            <div className="grid gap-3">
              {exports.map((artifact) => (
                <div key={artifact.id} className="flex items-center justify-between p-3 border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                      <FileType className="size-5 text-indigo-600" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{artifact.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {artifact.format.toUpperCase()} • {formatFileSize(artifact.file_size)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <Button
                      onClick={() => downloadExport(artifact)}
                      disabled={downloading === artifact.id}
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                    >
                      {downloading === artifact.id ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 size-4" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
