import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ShieldCheck, Users, FolderPlus } from "lucide-react"
import Link from "next/link"

export default async function OnboardingPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login")
  }

  // Check if user already has teams
  const { data: teams } = await supabase
    .from("teams")
    .select(`
      *,
      team_memberships!inner(role)
    `)
    .limit(1)

  if (teams && teams.length > 0) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-sky-500/10 flex items-center justify-center">
            <ShieldCheck className="text-sky-600 size-8" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to GenMedic Studio</h1>
          <p className="text-muted-foreground mt-2">
            Your end-to-end medical data pipeline platform. Let's get you started.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="size-12 rounded-xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                <Users className="size-6 text-blue-600" />
              </div>
              <CardTitle>Create a Team</CardTitle>
              <CardDescription>Start by creating a team workspace for your medical data projects.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full rounded-xl">
                <Link href="/team/create">Create Your First Team</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <div className="size-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center mb-3">
                <FolderPlus className="size-6 text-emerald-600" />
              </div>
              <CardTitle>Join a Team</CardTitle>
              <CardDescription>
                Have an invitation? Join an existing team to collaborate on medical data projects.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild className="w-full rounded-xl bg-transparent">
                <Link href="/invite">Enter Invitation Code</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Need help getting started?{" "}
            <Link href="/docs" className="underline underline-offset-4">
              Check our documentation
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
