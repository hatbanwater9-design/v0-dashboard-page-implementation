import { createClient } from "@/lib/supabase/server"
import type { PipelineJob, PipelineJobStep } from "@/lib/types/database"

export async function createPipelineJob(
  projectId: string,
  uploadId: string,
  settings: any,
  complianceChecks: any,
  glossaryId?: string,
): Promise<PipelineJob> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

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

  if (jobError) throw jobError

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

  if (stepsError) throw stepsError

  return job
}

export async function getPipelineJob(jobId: string): Promise<PipelineJob | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("pipeline_jobs").select("*").eq("id", jobId).single()

  if (error) return null
  return data
}

export async function getPipelineJobSteps(jobId: string): Promise<PipelineJobStep[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pipeline_job_steps")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return data || []
}

export async function updatePipelineJobStatus(jobId: string, status: PipelineJob["status"]): Promise<void> {
  const supabase = await createClient()

  const updateData: any = { status }
  if (status === "completed" || status === "failed") {
    updateData.completed_at = new Date().toISOString()
  }

  const { error } = await supabase.from("pipeline_jobs").update(updateData).eq("id", jobId)

  if (error) throw error
}

export async function updatePipelineJobStep(
  jobId: string,
  stepKey: string,
  status: PipelineJobStep["status"],
  logs?: string,
  errorMessage?: string,
): Promise<void> {
  const supabase = await createClient()

  const updateData: any = { status }
  if (status === "running") {
    updateData.started_at = new Date().toISOString()
  } else if (status === "completed" || status === "failed") {
    updateData.completed_at = new Date().toISOString()
  }
  if (logs) updateData.logs = logs
  if (errorMessage) updateData.error_message = errorMessage

  const { error } = await supabase
    .from("pipeline_job_steps")
    .update(updateData)
    .eq("job_id", jobId)
    .eq("step_key", stepKey)

  if (error) throw error
}

export async function getProjectPipelineJobs(projectId: string): Promise<PipelineJob[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("pipeline_jobs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}
