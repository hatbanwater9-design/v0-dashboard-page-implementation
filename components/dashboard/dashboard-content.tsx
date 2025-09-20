"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QualityDashboard } from "./quality-dashboard"
import { ExportSection } from "./export-section"
import { BookOpenCheck, FlaskConical, Lock, MailCheck, ShieldCheck, Sparkles } from "lucide-react"
import type { Project, Team, Upload, PipelineJob } from "@/lib/types/database"
import { UploadSection } from "./upload-section"
import { PipelineSection } from "./pipeline-section"

interface DashboardContentProps {
  team: Team
  project: Project
  userEmail: string
}

export default function DashboardContent({ team, project, userEmail }: DashboardContentProps) {
  const [emailNotify, setEmailNotify] = useState(true)
  const [currentUpload, setCurrentUpload] = useState<Upload | null>(null)
  const [currentJob, setCurrentJob] = useState<PipelineJob | null>(null)
  const [glossaryEnabled, setGlossaryEnabled] = useState(true)
  const [deidLevel, setDeidLevel] = useState<number[]>([70])
  const [agreePolicy, setAgreePolicy] = useState(false)
  const [agreePHI, setAgreePHI] = useState(false)
  const [agreeDPA, setAgreeDPA] = useState(false)

  const canRun = agreePolicy && agreePHI && agreeDPA && currentUpload && !currentJob

  // Derived label for deid
  const deidLabel = useMemo(() => {
    const v = deidLevel[0]
    if (v < 34) return "Mild"
    if (v < 67) return "Balanced"
    return "Strong"
  }, [deidLevel])

  const pipelineSettings = {
    glossaryEnabled,
    deidLevel: deidLevel[0],
    emailNotify,
  }

  const complianceChecks = {
    agreePolicy,
    agreePHI,
    agreeDPA,
    timestamp: new Date().toISOString(),
  }

  return (
    <TooltipProvider>
      <div className="min-h-[100dvh] bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950">
        <main className="mx-auto max-w-7xl px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6 lg:col-span-2">
              {/* Upload & Schema */}
              <UploadSection projectId={project.id} onUploadComplete={setCurrentUpload} />

              {/* Glossary & De-ID */}
              <Card className="rounded-2xl shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpenCheck className="size-5 text-emerald-600" /> Glossary & De-identification
                  </CardTitle>
                  <CardDescription>
                    Ensure term consistency and protect PHI. Preview changes before applying.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-2 gap-5">
                  {/* Glossary */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Medical Glossary</div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Enable</span>
                        <Switch checked={glossaryEnabled} onCheckedChange={setGlossaryEnabled} />
                      </div>
                    </div>
                    <div className="rounded-xl border p-3 bg-muted/30 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-emerald-600" />
                          <span className="font-medium">Conflicts</span>
                          <Badge variant="secondary">2</Badge>
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 px-2 rounded-lg">
                          Upload CSV
                        </Button>
                      </div>
                      <Separator />
                      <div className="text-xs grid grid-cols-3 gap-2">
                        <div>
                          <div className="font-semibold">angina</div>
                          <div className="text-muted-foreground">협심증</div>
                        </div>
                        <div>
                          <div className="font-semibold">myocardial infarction</div>
                          <div className="text-muted-foreground">심근경색</div>
                        </div>
                        <div>
                          <div className="font-semibold">diabetes mellitus</div>
                          <div className="text-muted-foreground">
                            당뇨병 <Badge variant="destructive">dup</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border p-3 bg-muted/30">
                      <div className="text-xs font-medium mb-1">Before → After</div>
                      <div className="text-xs grid grid-cols-2 gap-3">
                        <div className="rounded-lg border bg-white/70 dark:bg-slate-900/70 p-2">
                          환자는 <span className="font-semibold">diabetes</span> 병력이 있으며…
                        </div>
                        <div className="rounded-lg border bg-emerald-50/60 dark:bg-emerald-950/30 p-2">
                          환자는 <span className="font-semibold">당뇨병</span> 병력이 있으며…
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* De-ID */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">De-identification Strength</div>
                      <Badge variant="secondary">{deidLabel}</Badge>
                    </div>
                    <Slider value={deidLevel} onValueChange={setDeidLevel} step={1} min={0} max={100} />
                    <div className="rounded-xl border p-3 bg-muted/30 space-y-2">
                      <div className="text-xs font-medium">Preview</div>
                      <div className="text-xs rounded-lg border bg-white/70 dark:bg-slate-900/70 p-2 leading-relaxed">
                        환자 <mark className="bg-yellow-200/60 dark:bg-yellow-800/40 px-1 rounded">홍*동</mark> (
                        <mark className="bg-yellow-200/60 dark:bg-yellow-800/40 px-1 rounded">010-****-1234</mark>)은
                        2024-**-**에 내원…
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="size-4" />
                        PHI entities masked; overrides available during review.
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="justify-end gap-3">
                  <Button variant="secondary" className="rounded-xl">
                    <FlaskConical className="mr-2 size-4" />
                    Validate Settings
                  </Button>
                </CardFooter>
              </Card>

              {/* Export Section */}
              <ExportSection job={currentJob} />
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Compliance / Policy */}
              <Card className="rounded-2xl border-sky-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="size-5 text-sky-600" />
                    Compliance & Policies
                  </CardTitle>
                  <CardDescription>Complete the checklist to enable pipeline execution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-xl border bg-sky-50/60 dark:bg-sky-950/30 p-3 text-xs leading-relaxed">
                    Research Use Notice: Do not upload PHI you don't own. De-identification is performed on the backend
                    only. Policy links are automatically included in PDF reports.
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="chk1" checked={agreePolicy} onCheckedChange={() => setAgreePolicy(!agreePolicy)} />
                    <Label htmlFor="chk1" className="text-sm">
                      I have read the research-use notice.
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="chk2" checked={agreePHI} onCheckedChange={() => setAgreePHI(!agreePHI)} />
                    <Label htmlFor="chk2" className="text-sm">
                      I confirm no raw PHI will be uploaded.
                    </Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="chk3" checked={agreeDPA} onCheckedChange={() => setAgreeDPA(!agreeDPA)} />
                    <Label htmlFor="chk3" className="text-sm">
                      DPA/ToS on file for this project.
                    </Label>
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <MailCheck className="size-4" />
                    Reports to: <span className="font-medium">{userEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Email on</span>
                    <Switch checked={emailNotify} onCheckedChange={setEmailNotify} />
                  </div>
                </CardFooter>
              </Card>

              {/* Pipeline Status */}
              <PipelineSection
                projectId={project.id}
                currentUpload={currentUpload}
                settings={pipelineSettings}
                complianceChecks={complianceChecks}
                canRun={!!canRun}
                onJobCreated={setCurrentJob}
              />

              {/* Quality Dashboard */}
              <QualityDashboard job={currentJob} />
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}
