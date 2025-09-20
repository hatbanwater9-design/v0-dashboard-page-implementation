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

    // Get job steps
    const { data: steps, error: stepsError } = await supabase
      .from("pipeline_job_steps")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: true })

    if (stepsError) {
      return NextResponse.json({ error: "Failed to fetch job steps" }, { status: 500 })
    }

    return NextResponse.json({ job, steps })
  } catch (error) {
    console.error("Pipeline status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
