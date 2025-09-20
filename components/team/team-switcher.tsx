"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import type { Team } from "@/lib/types/database"
import { cn } from "@/lib/utils"

interface TeamSwitcherProps {
  currentTeam?: Team
  onTeamChange: (team: Team) => void
}

export function TeamSwitcher({ currentTeam, onTeamChange }: TeamSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamDescription, setNewTeamDescription] = useState("")

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("teams")
        .select(`
          *,
          team_memberships!inner(role)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      console.error("Error loading teams:", error)
    } finally {
      setLoading(false)
    }
  }

  const createTeam = async () => {
    if (!newTeamName.trim()) return

    setCreating(true)
    try {
      const supabase = createClient()
      const slug = newTeamName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: newTeamName.trim(),
          slug,
          description: newTeamDescription.trim() || null,
        })
        .select()
        .single()

      if (teamError) throw teamError

      // Add creator as owner
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { error: membershipError } = await supabase.from("team_memberships").insert({
          team_id: team.id,
          user_id: user.id,
          role: "owner",
        })

        if (membershipError) throw membershipError
      }

      setTeams([team, ...teams])
      onTeamChange(team)
      setCreateOpen(false)
      setNewTeamName("")
      setNewTeamDescription("")
    } catch (error) {
      console.error("Error creating team:", error)
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[240px] justify-between rounded-xl bg-transparent"
          >
            {currentTeam ? currentTeam.name : "Select team..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0">
          <Command>
            <CommandInput placeholder="Search teams..." />
            <CommandList>
              <CommandEmpty>No teams found.</CommandEmpty>
              <CommandGroup>
                {teams.map((team) => (
                  <CommandItem
                    key={team.id}
                    value={team.name}
                    onSelect={() => {
                      onTeamChange(team)
                      setOpen(false)
                    }}
                  >
                    <Check className={cn("mr-2 h-4 w-4", currentTeam?.id === team.id ? "opacity-100" : "opacity-0")} />
                    <div>
                      <div className="font-medium">{team.name}</div>
                      {team.description && <div className="text-xs text-muted-foreground">{team.description}</div>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
          <div className="border-t p-2">
            <Button variant="ghost" className="w-full justify-start" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Create a new team to collaborate with others on medical data projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input
                id="team-name"
                placeholder="My Research Team"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-description">Description (optional)</Label>
              <Textarea
                id="team-description"
                placeholder="Brief description of your team's focus..."
                value={newTeamDescription}
                onChange={(e) => setNewTeamDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createTeam} disabled={creating || !newTeamName.trim()}>
                {creating ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
