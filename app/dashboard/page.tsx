import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TeamSwitcher } from "@/components/team/team-switcher"
import { ProjectSwitcher } from "@/components/project/project-switcher"
import DashboardContent from "@/components/dashboard/dashboard-content"
import { Button } from "@/components/ui/button"
import { RefreshCw, Bell, Settings, ShieldCheck } from "lucide-react"
import Link from "next/link"
import type { Team, Project } from "@/lib/types/database"

interface DashboardPageProps {
  searchParams: Promise<{ team?: string; project?: string }>
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login")
  }

  // Get user's teams
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select(`
      *,
      team_memberships!inner(role)
    `)
    .order("created_at", { ascending: false })

  if (teamsError || !teams || teams.length === 0) {
    // No teams - redirect to onboarding or team creation
    redirect("/onboarding")
  }

  // Determine current team
  let currentTeam: Team
  if (params.team) {
    const team = teams.find((t) => t.id === params.team)
    currentTeam = team || teams[0]
  } else {
    currentTeam = teams[0]
  }

  // Get projects for current team
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .eq("team_id", currentTeam.id)
    .order("created_at", { ascending: false })

  if (projectsError) {
    console.error("Error loading projects:", projectsError)
  }

  // Determine current project
  let currentProject: Project | undefined
  if (projects && projects.length > 0) {
    if (params.project) {
      currentProject = projects.find((p) => p.id === params.project) || projects[0]
    } else {
      currentProject = projects[0]
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 backdrop-blur bg-white/70 dark:bg-slate-950/70 border-b">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                <ShieldCheck className="text-sky-600 size-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">GenMedic Studio</h1>
                <p className="text-xs text-muted-foreground">End-to-end Medical Data Pipeline</p>
              </div>
            </div>

            {/* Team and Project Switchers */}
            <div className="flex items-center gap-3">
              <TeamSwitcher
                currentTeam={currentTeam}
                onTeamChange={(team) => {
                  window.location.href = `/dashboard?team=${team.id}`
                }}
              />
              {currentTeam && (
                <ProjectSwitcher
                  teamId={currentTeam.id}
                  currentProject={currentProject}
                  onProjectChange={(project) => {
                    window.location.href = `/dashboard?team=${currentTeam.id}&project=${project.id}`
                  }}
                />
              )}
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-xl bg-transparent">
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl bg-transparent">
              <Bell className="mr-2 size-4" />
              Alerts
            </Button>
            <Button asChild variant="outline" size="sm" className="rounded-xl bg-transparent">
              <Link href={`/team/${currentTeam.id}/settings`}>
                <Settings className="mr-2 size-4" />
                Team Settings
              </Link>
            </Button>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentProject ? (
        <DashboardContent team={currentTeam} project={currentProject} userEmail={user.email || ""} />
      ) : (
        <div className="mx-auto max-w-4xl px-4 py-16 text-center">
          <div className="space-y-6">
            <div className="size-16 mx-auto rounded-full bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center">
              <ShieldCheck className="size-8 text-sky-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">No Projects Yet</h2>
              <p className="text-muted-foreground mt-2">
                Create your first project to start processing medical data with GenMedic Studio.
              </p>
            </div>
            <ProjectSwitcher
              teamId={currentTeam.id}
              currentProject={undefined}
              onProjectChange={(project) => {
                window.location.href = `/dashboard?team=${currentTeam.id}&project=${project.id}`
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
