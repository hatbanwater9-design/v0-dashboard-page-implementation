"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Activity, AlertTriangle, Bell, CheckCircle2, FileDown, Play, RefreshCw, Clock, Loader2 } from "lucide-react"
import type { PipelineJob, PipelineJobStep, Upload } from "@/lib/types/database"

interface PipelineSectionProps {
  projectId: string
  currentUpload?: Upload
  settings: any
  complianceChecks: any
  canRun: boolean
  onJobCreated?: (job: PipelineJob) => void
}

type StepStatus = "queued" | "running" | "completed" | "failed"

const getStatusBadge = (status: StepStatus) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Done</Badge>
    case "running":
      return <Badge className="bg-blue-600 hover:bg-blue-600">Running</Badge>
    case "failed":
      return <Badge variant="destructive">Error</Badge>
    default:
      return <Badge variant="secondary">Queued</Badge>
  }
}

const getStatusIcon = (status: StepStatus) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="size-5 text-emerald-600" />
    case "running":
      return <Loader2 className="size-5 animate-spin text-blue-600" />
    case "failed":
      return <AlertTriangle className="size-5 text-red-600" />
    default:
      return <Clock className="size-5 text-muted-foreground" />
  }
}

export function PipelineSection({
  projectId,
  currentUpload,
  settings,
  complianceChecks,
  canRun,
  onJobCreated,
}: PipelineSectionProps) {
  const [currentJob, setCurrentJob] = useState<PipelineJob | null>(null)
  const [jobSteps, setJobSteps] = useState<PipelineJobStep[]>([])
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Poll for job status updates
  useEffect(() => {
    if (!currentJob || currentJob.status === "completed" || currentJob.status === "failed") return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/pipeline/${currentJob.id}/status`)
        if (response.ok) {
          const { job, steps } = await response.json()
          setCurrentJob(job)
          setJobSteps(steps)

          if (job.status === "completed" || job.status === "failed") {
            clearInterval(pollInterval)
          }
        }
      } catch (error) {
        console.error("Error polling job status:", error)
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [currentJob])

  const startPipeline = async () => {
    if (!canRun || !currentUpload) return

    setStarting(true)
    setError(null)

    try {
      const response = await fetch("/api/pipeline/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId,
          uploadId: currentUpload.id,
          settings,
          complianceChecks,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to start pipeline")
      }

      const { job } = await response.json()
      setCurrentJob(job)
      onJobCreated?.(job)

      // Initial fetch of steps
      const statusResponse = await fetch(`/api/pipeline/${job.id}/status`)
      if (statusResponse.ok) {
        const { steps } = await statusResponse.json()
        setJobSteps(steps)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setStarting(false)
    }
  }

  const getOverallProgress = () => {
    if (!jobSteps.length) return 0
    const completedSteps = jobSteps.filter((step) => step.status === "completed").length
    return (completedSteps / jobSteps.length) * 100
  }

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="size-5 text-blue-600" />
          Pipeline Status
        </CardTitle>
        <CardDescription>Track each stage in real time.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        {currentJob && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span>{Math.round(getOverallProgress())}%</span>
            </div>
            <Progress value={getOverallProgress()} className="h-2" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg">
            <AlertTriangle className="size-4" />
            {error}
          </div>
        )}

        {/* Pipeline Steps */}
        <div className="space-y-3">
          {jobSteps.length > 0 ? (
            jobSteps.map((step, i) => (
              <div key={step.id} className="flex items-center justify-between rounded-xl border p-2.5 bg-muted/30">
                <div className="flex items-center gap-3">
                  {getStatusIcon(step.status as StepStatus)}
                  <div>
                    <div className="text-sm font-medium">{step.step_label}</div>
                    <div className="text-xs text-muted-foreground">
                      Step {i + 1} / {jobSteps.length}
                    </div>
                  </div>
                </div>
                {getStatusBadge(step.status as StepStatus)}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="size-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No pipeline running</p>
              <p className="text-xs">Upload a file and start the pipeline to see progress</p>
            </div>
          )}
        </div>

        {/* Start Pipeline Button */}
        {!currentJob && (
          <div className="pt-4">
            <Button
              onClick={startPipeline}
              disabled={!canRun || !currentUpload || starting}
              className="w-full rounded-xl"
              size="lg"
            >
              {starting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Starting Pipeline...
                </>
              ) : (
                <>
                  <Play className="mr-2 size-4" />
                  Run Pipeline
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-between">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Bell className="size-4" />
          Browser badge & email alerts enabled
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl bg-transparent" size="sm">
            <RefreshCw className="mr-2 size-4" />
            Retry failed
          </Button>
          <Button className="rounded-xl" size="sm">
            <FileDown className="mr-2 size-4" />
            Download Logs
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
