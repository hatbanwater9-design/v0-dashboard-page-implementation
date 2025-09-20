import { createClient } from "@/lib/supabase/server"
import type { Team, TeamMembership, TeamInvitation } from "@/lib/types/database"

export async function getUserTeams(): Promise<Team[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("teams")
    .select(`
      *,
      team_memberships!inner(role)
    `)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTeamMembers(
  teamId: string,
): Promise<(TeamMembership & { profiles: { email: string; display_name?: string } })[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("team_memberships")
    .select(`
      *,
      profiles(email, display_name)
    `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("team_id", teamId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function createTeam(name: string, description?: string): Promise<Team> {
  const supabase = await createClient()

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({ name, slug, description })
    .select()
    .single()

  if (teamError) throw teamError

  // Add creator as owner
  const { error: membershipError } = await supabase.from("team_memberships").insert({
    team_id: team.id,
    user_id: (await supabase.auth.getUser()).data.user!.id,
    role: "owner",
  })

  if (membershipError) throw membershipError

  return team
}

export async function inviteTeamMember(
  teamId: string,
  email: string,
  role: "member" | "viewer",
): Promise<TeamInvitation> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("team_invitations")
    .insert({
      team_id: teamId,
      email,
      role,
      invited_by: (await supabase.auth.getUser()).data.user!.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateMemberRole(
  membershipId: string,
  role: "owner" | "admin" | "member" | "viewer",
): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("team_memberships").update({ role }).eq("id", membershipId)

  if (error) throw error
}

export async function removeMember(membershipId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("team_memberships").delete().eq("id", membershipId)

  if (error) throw error
}

export async function cancelInvitation(invitationId: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.from("team_invitations").delete().eq("id", invitationId)

  if (error) throw error
}
