import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface InvitePageProps {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect(`/auth/login?redirect=/invite/${token}`)
  }

  // Find invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("team_invitations")
    .select(`
      *,
      teams(name, description)
    `)
    .eq("token", token)
    .eq("email", user.email)
    .is("accepted_at", null)
    .single()

  if (inviteError || !invitation) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 size-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="size-8 text-red-600" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>This invitation link is invalid, expired, or has already been used.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full rounded-xl">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from("team_memberships")
    .select("id")
    .eq("team_id", invitation.team_id)
    .eq("user_id", user.id)
    .single()

  if (existingMembership) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 size-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
              <CheckCircle className="size-8 text-blue-600" />
            </div>
            <CardTitle>Already a Member</CardTitle>
            <CardDescription>You&apos;re already a member of {invitation.teams?.name}.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full rounded-xl">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Accept invitation
  const { error: acceptError } = await supabase.rpc("accept_team_invitation", {
    invitation_token: token,
  })

  if (acceptError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
        <Card className="w-full max-w-md rounded-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 size-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="size-8 text-red-600" />
            </div>
            <CardTitle>Error Accepting Invitation</CardTitle>
            <CardDescription>There was an error accepting the invitation. Please try again.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild className="w-full rounded-xl">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
            <CheckCircle className="size-8 text-emerald-600" />
          </div>
          <CardTitle>Welcome to {invitation.teams?.name}!</CardTitle>
          <CardDescription>You&apos;ve successfully joined the team as a {invitation.role}.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild className="w-full rounded-xl">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
