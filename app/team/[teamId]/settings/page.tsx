import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TeamMembersList } from "@/components/team/team-members-list"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface TeamSettingsPageProps {
  params: Promise<{ teamId: string }>
}

export default async function TeamSettingsPage({ params }: TeamSettingsPageProps) {
  const { teamId } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login")
  }

  // Get team and user's role
  const { data: teamData, error: teamError } = await supabase
    .from("teams")
    .select(`
      *,
      team_memberships!inner(role)
    `)
    .eq("id", teamId)
    .eq("team_memberships.user_id", user.id)
    .single()

  if (teamError || !teamData) {
    redirect("/dashboard")
  }

  const userRole = teamData.team_memberships[0]?.role

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{teamData.name}</h1>
              <Badge variant="outline">{userRole}</Badge>
            </div>
            {teamData.description && <p className="text-muted-foreground">{teamData.description}</p>}
          </div>

          {/* Team Info */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
              <CardDescription>Basic details about this team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Team Name</label>
                  <p className="text-sm text-muted-foreground">{teamData.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Team Slug</label>
                  <p className="text-sm text-muted-foreground">{teamData.slug}</p>
                </div>
              </div>
              {teamData.description && (
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <p className="text-sm text-muted-foreground">{teamData.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Created</label>
                <p className="text-sm text-muted-foreground">{new Date(teamData.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <TeamMembersList teamId={teamId} currentUserRole={userRole} />
        </div>
      </div>
    </div>
  )
}
