import { createClient } from "@/lib/supabase/server"
import type { QualityReport } from "@/lib/types/database"

export async function getQualityReport(jobId: string): Promise<QualityReport | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("quality_reports").select("*").eq("job_id", jobId).single()

  if (error) return null
  return data
}

export async function createQualityReport(
  jobId: string,
  overallScore: number,
  componentScores: any,
  passFailStats: any,
  histogramData: any,
  reportData: any,
): Promise<QualityReport> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("quality_reports")
    .insert({
      job_id: jobId,
      overall_score: overallScore,
      component_scores: componentScores,
      pass_fail_stats: passFailStats,
      histogram_data: histogramData,
      report_data: reportData,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function generatePDFReport(jobId: string): Promise<{ downloadUrl: string }> {
  const supabase = await createClient()

  // Get quality report
  const qualityReport = await getQualityReport(jobId)
  if (!qualityReport) {
    throw new Error("Quality report not found")
  }

  // Get job details
  const { data: job, error: jobError } = await supabase
    .from("pipeline_jobs")
    .select(`
      *,
      projects(name, description),
      uploads(filename, file_size)
    `)
    .eq("id", jobId)
    .single()

  if (jobError || !job) {
    throw new Error("Pipeline job not found")
  }

  // In a real implementation, you would generate a PDF here
  // For demo purposes, we'll return a mock download URL
  const mockPdfUrl = `/api/reports/${jobId}/download`

  return { downloadUrl: mockPdfUrl }
}
