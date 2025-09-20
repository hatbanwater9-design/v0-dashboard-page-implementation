"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ShieldCheck, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

export default function CreateTeamPage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsLoading(true)
    setError("")

    try {
      const supabase = createClient()

      // Generate slug from name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({ name: name.trim(), slug, description: description.trim() || null })
        .select()
        .single()

      if (teamError) throw teamError

      // Add creator as owner
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { error: membershipError } = await supabase.from("team_memberships").insert({
        team_id: team.id,
        user_id: user.id,
        role: "owner",
      })

      if (membershipError) throw membershipError

      // Redirect to dashboard with the new team
      router.push(`/dashboard?team=${team.id}`)
    } catch (err) {
      console.error("Error creating team:", err)
      setError(err instanceof Error ? err.message : "Failed to create team")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="size-16 mx-auto mb-4 rounded-2xl bg-sky-500/10 flex items-center justify-center">
            <ShieldCheck className="text-sky-600 size-8" />
          </div>
          <h1 className="text-3xl font-bold">Create Your Team</h1>
          <p className="text-muted-foreground mt-2">Set up a team workspace for your medical data projects.</p>
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Team Details</CardTitle>
            <CardDescription>Choose a name and description for your team workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Team Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Medical Research Lab"
                  className="rounded-xl"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of your team's purpose..."
                  className="rounded-xl resize-none"
                  rows={3}
                />
              </div>

              {error && <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">{error}</div>}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" asChild className="flex-1 rounded-xl bg-transparent">
                  <Link href="/onboarding">
                    <ArrowLeft className="mr-2 size-4" />
                    Back
                  </Link>
                </Button>
                <Button type="submit" disabled={!name.trim() || isLoading} className="flex-1 rounded-xl">
                  {isLoading ? "Creating..." : "Create Team"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
