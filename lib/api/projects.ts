import { createClient } from "@/lib/supabase/server"
import type { Project } from "@/lib/types/database"

export async function getTeamProjects(teamId: string): Promise<Project[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function createProject(teamId: string, name: string, description?: string): Promise<Project> {
  const supabase = await createClient()

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("projects")
    .insert({
      team_id: teamId,
      name,
      slug,
      description,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getProject(projectId: string): Promise<Project | null> {
  const supabase = await createClient()

  const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single()

  if (error) return null
  return data
}
