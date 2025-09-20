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

    // Get exports with project access check
    const { data: exports, error: exportsError } = await supabase
      .from("export_artifacts")
      .select(`
        *,
        pipeline_jobs!inner(
          projects!inner(
            teams!inner(
              team_memberships!inner(user_id)
            )
          )
        )
      `)
      .eq("job_id", jobId)
      .eq("pipeline_jobs.projects.teams.team_memberships.user_id", user.id)

    if (exportsError) {
      return NextResponse.json({ error: "Failed to fetch exports" }, { status: 500 })
    }

    return NextResponse.json({ exports: exports || [] })
  } catch (error) {
    console.error("Export status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
