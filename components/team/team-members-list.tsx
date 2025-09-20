"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { MoreHorizontal, Mail, Clock, X } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { createClient } from "@/lib/supabase/client"
import type { TeamMembership, TeamInvitation } from "@/lib/types/database"
import { InviteMemberDialog } from "./invite-member-dialog"

interface TeamMembersListProps {
  teamId: string
  currentUserRole: string
}

interface MemberWithProfile extends TeamMembership {
  profiles: {
    email: string
    display_name?: string
  }
}

export function TeamMembersList({ teamId, currentUserRole }: TeamMembersListProps) {
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [teamId])

  const loadData = async () => {
    try {
      const supabase = createClient()

      // Load members
      const { data: membersData, error: membersError } = await supabase
        .from("team_memberships")
        .select(`
          *,
          profiles(email, display_name)
        `)
        .eq("team_id", teamId)
        .order("created_at", { ascending: false })

      if (membersError) throw membersError

      // Load pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from("team_invitations")
        .select("*")
        .eq("team_id", teamId)
        .is("accepted_at", null)
        .order("created_at", { ascending: false })

      if (invitationsError) throw invitationsError

      setMembers(membersData || [])
      setInvitations(invitationsData || [])
    } catch (error) {
      console.error("Error loading team data:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateMemberRole = async (membershipId: string, newRole: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("team_memberships").update({ role: newRole }).eq("id", membershipId)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error("Error updating member role:", error)
    }
  }

  const removeMember = async (membershipId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("team_memberships").delete().eq("id", membershipId)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error("Error removing member:", error)
    }
  }

  const cancelInvitation = async (invitationId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("team_invitations").delete().eq("id", invitationId)

      if (error) throw error
      loadData()
    } catch (error) {
      console.error("Error canceling invitation:", error)
    }
  }

  const canManageMembers = ["owner", "admin"].includes(currentUserRole)

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default"
      case "admin":
        return "secondary"
      case "member":
        return "outline"
      case "viewer":
        return "outline"
      default:
        return "outline"
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading team members...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Members</h3>
          <p className="text-sm text-muted-foreground">Manage team members and their permissions</p>
        </div>
        {canManageMembers && <InviteMemberDialog teamId={teamId} onInviteSent={loadData} />}
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-base">Active Members</CardTitle>
          <CardDescription>
            {members.length} member{members.length !== 1 ? "s" : ""} in this team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.map((member, index) => (
            <div key={member.id}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-sky-100 dark:bg-sky-900/20 flex items-center justify-center">
                    <span className="text-sm font-medium text-sky-700 dark:text-sky-300">
                      {member.profiles.display_name?.[0] || member.profiles.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">
                      {member.profiles.display_name || member.profiles.email.split("@")[0]}
                    </div>
                    <div className="text-sm text-muted-foreground">{member.profiles.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {canManageMembers && member.role !== "owner" ? (
                    <Select value={member.role} onValueChange={(value) => updateMemberRole(member.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="member">Member</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge>
                  )}
                  {canManageMembers && member.role !== "owner" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => removeMember(member.id)} className="text-red-600">
                          Remove from team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
              {index < members.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              {invitations.length} invitation{invitations.length !== 1 ? "s" : ""} waiting for response
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitations.map((invitation, index) => (
              <div key={invitation.id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Invited {new Date(invitation.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{invitation.role}</Badge>
                    {canManageMembers && (
                      <Button variant="ghost" size="sm" onClick={() => cancelInvitation(invitation.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {index < invitations.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
