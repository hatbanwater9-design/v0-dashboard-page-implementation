import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { formats } = body

    if (!formats || !Array.isArray(formats)) {
      return NextResponse.json({ error: "Formats array is required" }, { status: 400 })
    }

    // Get job with project access check
    const { data: job, error: jobError } = await supabase
      .from("pipeline_jobs")
      .select(`
        *,
        projects!inner(
          teams!inner(
            team_memberships!inner(user_id)
          )
        ),
        uploads(filename, schema_preview)
      `)
      .eq("id", jobId)
      .eq("projects.teams.team_memberships.user_id", user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found or access denied" }, { status: 404 })
    }

    if (job.status !== "completed") {
      return NextResponse.json({ error: "Job must be completed before generating exports" }, { status: 400 })
    }

    // Check if exports already exist
    const { data: existingExports } = await supabase.from("export_artifacts").select("*").eq("job_id", jobId)

    if (existingExports && existingExports.length > 0) {
      return NextResponse.json({ exports: existingExports })
    }

    // Generate export artifacts
    const artifacts = []

    for (const format of formats) {
      if (!["coco", "yolo", "jsonl"].includes(format)) continue

      const filename = `${job.uploads.filename.replace(/\.[^/.]+$/, "")}_${format}.zip`
      const fileSize = Math.floor(1000000 + Math.random() * 5000000) // Mock file size
      const storagePath = `exports/${jobId}/${format}.zip`
      const downloadUrl = `/api/exports/${jobId}/${format}/download`

      const { data: artifact, error: artifactError } = await supabase
        .from("export_artifacts")
        .insert({
          job_id: jobId,
          format: format as any,
          filename,
          file_size: fileSize,
          storage_path: storagePath,
          download_url: downloadUrl,
        })
        .select()
        .single()

      if (artifactError) {
        console.error(`Error creating ${format} artifact:`, artifactError)
        continue
      }

      artifacts.push(artifact)
    }

    return NextResponse.json({ exports: artifacts })
  } catch (error) {
    console.error("Export generation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
