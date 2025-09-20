import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldCheck, MailCheck } from "lucide-react"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="size-12 rounded-2xl bg-sky-500/10 flex items-center justify-center">
              <ShieldCheck className="text-sky-600 size-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">GenMedic Studio</h1>
              <p className="text-sm text-muted-foreground">Medical Data Pipeline</p>
            </div>
          </div>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center">
                <MailCheck className="size-8 text-emerald-600" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>We&apos;ve sent you a confirmation link to complete your registration</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Please check your email and click the confirmation link to activate your account. Once confirmed,
                you&apos;ll be able to sign in and start using GenMedic Studio.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
