"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, Sparkles, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react"
import {
  LineChart as RLineChart,
  Line,
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  PieChart as RPieChart,
  Pie,
  Cell,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts"
import { createClient } from "@/lib/supabase/client"
import type { QualityReport, PipelineJob } from "@/lib/types/database"

interface QualityDashboardProps {
  job?: PipelineJob
}

const COLORS = ["#0ea5e9", "#10b981", "#f59e0b"]

export function QualityDashboard({ job }: QualityDashboardProps) {
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloadingReport, setDownloadingReport] = useState(false)

  useEffect(() => {
    if (job?.id && job.status === "completed") {
      loadQualityReport()
    }
  }, [job])

  const loadQualityReport = async () => {
    if (!job?.id) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("quality_reports").select("*").eq("job_id", job.id).single()

      if (error) throw error
      setQualityReport(data)
    } catch (error) {
      console.error("Error loading quality report:", error)
    } finally {
      setLoading(false)
    }
  }

  const downloadPDFReport = async () => {
    if (!job?.id) return

    setDownloadingReport(true)
    try {
      const response = await fetch(`/api/reports/${job.id}/generate`, {
        method: "POST",
      })

      if (!response.ok) {
        throw new Error("Failed to generate report")
      }

      const { downloadUrl } = await response.json()

      // Create a temporary link to download the file
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `quality-report-${job.id}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error downloading report:", error)
    } finally {
      setDownloadingReport(false)
    }
  }

  if (!job) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-5 text-amber-600" />
            Quality Dashboard
          </CardTitle>
          <CardDescription>LLM-aided checks and domain rules, unified into a 0–100 score.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="size-16 mx-auto mb-4 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
            <Sparkles className="size-8 text-amber-600 opacity-50" />
          </div>
          <p className="text-sm text-muted-foreground">No pipeline job available</p>
          <p className="text-xs text-muted-foreground">Run a pipeline to see quality metrics</p>
        </CardContent>
      </Card>
    )
  }

  if (job.status !== "completed") {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-5 text-amber-600" />
            Quality Dashboard
          </CardTitle>
          <CardDescription>LLM-aided checks and domain rules, unified into a 0–100 score.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="size-16 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <div className="size-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-sm font-medium">Pipeline Running</p>
          <p className="text-xs text-muted-foreground">Quality analysis will be available when pipeline completes</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-5 text-amber-600" />
            Quality Dashboard
          </CardTitle>
          <CardDescription>LLM-aided checks and domain rules, unified into a 0–100 score.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="size-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm">Loading quality report...</p>
        </CardContent>
      </Card>
    )
  }

  if (!qualityReport) {
    return (
      <Card className="rounded-2xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-5 text-amber-600" />
            Quality Dashboard
          </CardTitle>
          <CardDescription>LLM-aided checks and domain rules, unified into a 0–100 score.</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="size-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="size-8 text-red-600" />
          </div>
          <p className="text-sm font-medium">Quality Report Not Available</p>
          <p className="text-xs text-muted-foreground">There was an issue generating the quality report</p>
        </CardContent>
      </Card>
    )
  }

  // Transform data for charts
  const componentScoresData = Object.entries(qualityReport.component_scores).map(([name, score]) => ({
    name: name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    score: score as number,
  }))

  const passFailData = Object.entries(qualityReport.pass_fail_stats).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value as number,
  }))

  const histogramData = qualityReport.histogram_data.map((item: any) => ({
    bucket: item.bucket,
    count: item.count,
  }))

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-5 text-amber-600" />
          Quality Dashboard
        </CardTitle>
        <CardDescription>LLM-aided checks and domain rules, unified into a 0–100 score.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall Score and Pass/Fail Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="rounded-xl">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Overall Quality Score</CardTitle>
              <CardDescription>Higher is better</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="60%"
                    outerRadius="100%"
                    data={[{ name: "Score", value: qualityReport.overall_score, fill: "#0ea5e9" }]}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <RadialBar isAnimationActive={true} background dataKey="value" />
                    <Legend
                      content={() => (
                        <div className="text-center mt-[-140px]">
                          <div className="text-4xl font-bold">{qualityReport.overall_score}</div>
                          <div className="text-xs text-muted-foreground">/100</div>
                        </div>
                      )}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Pass / Warn / Fail</CardTitle>
              <CardDescription>Per-sample outcomes</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={passFailData} dataKey="value" nameKey="name" outerRadius={72}>
                      {passFailData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <RTooltip />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Component Scores and Histogram */}
        <div className="grid grid-cols-1 gap-4">
          <Card className="rounded-xl">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Component Scores</CardTitle>
              <CardDescription>Consistency, adherence, alignment, fluency</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RLineChart data={componentScoresData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <RTooltip />
                  </RLineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Score Distribution</CardTitle>
              <CardDescription>Bucketed score distribution across samples</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <RBarChart data={histogramData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <RTooltip />
                  </RBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quality Insights */}
        <Card className="rounded-xl">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="size-4" />
              Quality Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
              <CheckCircle2 className="size-5 text-emerald-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Strong Performance</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300">
                  Glossary adherence and fluency scores are above target thresholds
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <AlertTriangle className="size-5 text-amber-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-amber-900 dark:text-amber-100">Improvement Opportunity</div>
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  Label-text alignment could benefit from additional training data
                </div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Pipeline: {qualityReport.report_data.pipeline_hash} • Models:{" "}
              {Object.entries(qualityReport.report_data.model_versions)
                .map(([key, version]) => `${key}@${version}`)
                .join(", ")}
            </div>
          </CardContent>
        </Card>
      </CardContent>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">Includes pipeline hash & model versions in report</div>
          <Button onClick={downloadPDFReport} disabled={downloadingReport} className="rounded-xl">
            {downloadingReport ? (
              <>
                <div className="mr-2 size-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileDown className="mr-2 size-4" />
                Download PDF Report
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
