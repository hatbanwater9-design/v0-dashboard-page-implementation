import { createClient } from "@/lib/supabase/server"
import type { ExportArtifact } from "@/lib/types/database"

export async function getJobExports(jobId: string): Promise<ExportArtifact[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("export_artifacts")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function createExportArtifact(
  jobId: string,
  format: "coco" | "yolo" | "jsonl",
  filename: string,
  fileSize: number,
  storagePath: string,
  downloadUrl: string,
): Promise<ExportArtifact> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("export_artifacts")
    .insert({
      job_id: jobId,
      format,
      filename,
      file_size: fileSize,
      storage_path: storagePath,
      download_url: downloadUrl,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function generateExportArtifacts(jobId: string, formats: string[]): Promise<ExportArtifact[]> {
  const supabase = await createClient()

  // Get job details
  const { data: job, error: jobError } = await supabase
    .from("pipeline_jobs")
    .select(`
      *,
      uploads(filename, schema_preview)
    `)
    .eq("id", jobId)
    .single()

  if (jobError || !job) {
    throw new Error("Pipeline job not found")
  }

  const artifacts: ExportArtifact[] = []

  for (const format of formats) {
    if (!["coco", "yolo", "jsonl"].includes(format)) continue

    // Generate mock export data based on format
    const mockData = generateMockExportData(format, job)
    const filename = `${job.uploads.filename.replace(/\.[^/.]+$/, "")}_${format}.zip`
    const fileSize = Math.floor(1000000 + Math.random() * 5000000) // Mock file size
    const storagePath = `exports/${jobId}/${format}.zip`
    const downloadUrl = `/api/exports/${jobId}/${format}/download`

    const artifact = await createExportArtifact(jobId, format as any, filename, fileSize, storagePath, downloadUrl)
    artifacts.push(artifact)
  }

  return artifacts
}

function generateMockExportData(format: string, job: any) {
  // In a real implementation, this would convert the processed data to the target format
  switch (format) {
    case "coco":
      return {
        info: {
          description: `GenMedic Studio export - ${job.uploads.filename}`,
          version: "1.0",
          year: new Date().getFullYear(),
          contributor: "GenMedic Studio",
          date_created: new Date().toISOString(),
        },
        licenses: [],
        images: [],
        annotations: [],
        categories: [],
      }
    case "yolo":
      return {
        classes: ["medical_condition", "anatomy", "procedure"],
        train: [],
        val: [],
        test: [],
      }
    case "jsonl":
      return {
        format: "jsonl",
        schema: job.uploads.schema_preview,
        processed_records: Math.floor(Math.random() * 1000 + 500),
      }
    default:
      return {}
  }
}
