import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
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
    const { projectId, uploadId, settings, complianceChecks, glossaryId } = body

    if (!projectId || !uploadId || !settings || !complianceChecks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Check project access
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        teams!inner(
          team_memberships!inner(user_id, role)
        )
      `)
      .eq("id", projectId)
      .eq("teams.team_memberships.user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 })
    }

    // Verify upload exists and belongs to project
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .select("*")
      .eq("id", uploadId)
      .eq("project_id", projectId)
      .single()

    if (uploadError || !upload) {
      return NextResponse.json({ error: "Upload not found" }, { status: 404 })
    }

    // Create pipeline job
    const { data: job, error: jobError } = await supabase
      .from("pipeline_jobs")
      .insert({
        project_id: projectId,
        upload_id: uploadId,
        glossary_id: glossaryId,
        settings,
        compliance_checks: complianceChecks,
        started_by: user.id,
        status: "queued",
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json({ error: "Failed to create pipeline job" }, { status: 500 })
    }

    // Create pipeline steps
    const steps = [
      { step_key: "register", step_label: "Upload Registered", status: "completed" as const },
      { step_key: "schema", step_label: "Schema Detection", status: "queued" as const },
      { step_key: "glossary", step_label: "Glossary Application", status: "queued" as const },
      { step_key: "translate", step_label: "Translation", status: "queued" as const },
      { step_key: "deid", step_label: "De-identification", status: "queued" as const },
      { step_key: "qa", step_label: "Quality Assessment", status: "queued" as const },
      { step_key: "format", step_label: "Format Conversion", status: "queued" as const },
      { step_key: "report", step_label: "Report Generation", status: "queued" as const },
    ]

    const { error: stepsError } = await supabase.from("pipeline_job_steps").insert(
      steps.map((step) => ({
        job_id: job.id,
        ...step,
      })),
    )

    if (stepsError) {
      return NextResponse.json({ error: "Failed to create pipeline steps" }, { status: 500 })
    }

    // Start pipeline execution simulation
    simulatePipelineExecution(job.id)

    return NextResponse.json({ job })
  } catch (error) {
    console.error("Pipeline start error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Simulate pipeline execution
async function simulatePipelineExecution(jobId: string) {
  const supabase = await createClient()

  // Update job status to running
  await supabase.from("pipeline_jobs").update({ status: "running" }).eq("id", jobId)

  const stepKeys = ["schema", "glossary", "translate", "deid", "qa", "format", "report"]

  for (let i = 0; i < stepKeys.length; i++) {
    const stepKey = stepKeys[i]

    // Mark step as running
    await supabase
      .from("pipeline_job_steps")
      .update({
        status: "running",
        started_at: new Date().toISOString(),
      })
      .eq("job_id", jobId)
      .eq("step_key", stepKey)

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000 + Math.random() * 3000))

    // Mark step as completed
    await supabase
      .from("pipeline_job_steps")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        logs: `Step ${stepKey} completed successfully. Processed data according to configuration.`,
      })
      .eq("job_id", jobId)
      .eq("step_key", stepKey)
  }

  // Mark job as completed
  await supabase
    .from("pipeline_jobs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId)

  // Create mock quality report
  const mockQualityReport = {
    overall_score: Math.floor(75 + Math.random() * 20),
    component_scores: {
      term_consistency: Math.floor(70 + Math.random() * 25),
      glossary_adherence: Math.floor(80 + Math.random() * 15),
      label_text_alignment: Math.floor(65 + Math.random() * 30),
      fluency: Math.floor(85 + Math.random() * 10),
    },
    pass_fail_stats: {
      pass: Math.floor(60 + Math.random() * 20),
      warn: Math.floor(15 + Math.random() * 15),
      fail: Math.floor(5 + Math.random() * 15),
    },
    histogram_data: [
      { bucket: "0-20", count: Math.floor(Math.random() * 5) },
      { bucket: "20-40", count: Math.floor(5 + Math.random() * 10) },
      { bucket: "40-60", count: Math.floor(15 + Math.random() * 15) },
      { bucket: "60-80", count: Math.floor(30 + Math.random() * 20) },
      { bucket: "80-100", count: Math.floor(20 + Math.random() * 15) },
    ],
    report_data: {
      pipeline_hash: "abc123def456",
      model_versions: {
        translator: "qwen3-7b-instruct",
        deid: "phi-detector-v2.1",
        qa: "medical-qa-scorer-v1.3",
      },
    },
  }

  await supabase.from("quality_reports").insert({
    job_id: jobId,
    overall_score: mockQualityReport.overall_score,
    component_scores: mockQualityReport.component_scores,
    pass_fail_stats: mockQualityReport.pass_fail_stats,
    histogram_data: mockQualityReport.histogram_data,
    report_data: mockQualityReport.report_data,
  })

  // Create mock export artifacts
  const formats = ["coco", "yolo", "jsonl"]
  for (const format of formats) {
    await supabase.from("export_artifacts").insert({
      job_id: jobId,
      format: format as any,
      filename: `output_${format}_${Date.now()}.zip`,
      file_size: Math.floor(1000000 + Math.random() * 5000000),
      storage_path: `exports/${jobId}/${format}.zip`,
      download_url: `/api/download/${jobId}/${format}`,
    })
  }
}
