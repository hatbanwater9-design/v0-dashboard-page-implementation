import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
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

    // Get job with project access check
    const { data: job, error: jobError } = await supabase
      .from("pipeline_jobs")
      .select(`
        *,
        projects!inner(
          name,
          teams!inner(
            team_memberships!inner(user_id)
          )
        )
      `)
      .eq("id", jobId)
      .eq("projects.teams.team_memberships.user_id", user.id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found or access denied" }, { status: 404 })
    }

    // Get quality report
    const { data: qualityReport, error: reportError } = await supabase
      .from("quality_reports")
      .select("*")
      .eq("job_id", jobId)
      .single()

    if (reportError || !qualityReport) {
      return NextResponse.json({ error: "Quality report not found" }, { status: 404 })
    }

    // Generate mock PDF content
    const mockPdfContent = generateMockPDF(job, qualityReport)

    return new NextResponse(mockPdfContent, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="quality-report-${jobId}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Report download error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateMockPDF(job: any, qualityReport: any): Buffer {
  // This is a mock PDF. In a real implementation, you would use a PDF generation library
  const mockPdfHeader = "%PDF-1.4\n"
  const mockPdfContent = `
GenMedic Studio Quality Report
==============================

Project: ${job.projects.name}
Job ID: ${job.id}
Generated: ${new Date().toISOString()}

Overall Quality Score: ${qualityReport.overall_score}/100

Component Scores:
- Term Consistency: ${qualityReport.component_scores.term_consistency}
- Glossary Adherence: ${qualityReport.component_scores.glossary_adherence}
- Label-Text Alignment: ${qualityReport.component_scores.label_text_alignment}
- Fluency: ${qualityReport.component_scores.fluency}

Pass/Fail Statistics:
- Pass: ${qualityReport.pass_fail_stats.pass}%
- Warn: ${qualityReport.pass_fail_stats.warn}%
- Fail: ${qualityReport.pass_fail_stats.fail}%

Pipeline Details:
- Hash: ${qualityReport.report_data.pipeline_hash}
- Models: ${JSON.stringify(qualityReport.report_data.model_versions, null, 2)}

This is a demo report. In production, this would be a properly formatted PDF.
`

  return Buffer.from(mockPdfHeader + mockPdfContent)
}
