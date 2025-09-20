import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File
    const projectId = formData.get("projectId") as string

    if (!file || !projectId) {
      return NextResponse.json({ error: "Missing file or project ID" }, { status: 400 })
    }

    // Validate file type
    if (!file.name.endsWith(".zip")) {
      return NextResponse.json({ error: "Only ZIP files are supported" }, { status: 400 })
    }

    // Check project access
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select(`
        *,
        teams!inner(
          team_memberships!inner(user_id, role)
        )
      `)
      .eq("id", projectId)
      .eq("teams.team_memberships.user_id", user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 403 })
    }

    // Generate storage path
    const timestamp = Date.now()
    const storagePath = `uploads/${projectId}/${timestamp}-${file.name}`

    // For demo purposes, we'll simulate file storage
    // In production, you would upload to actual storage (Supabase Storage, S3, etc.)
    const mockStoragePath = storagePath

    // Create upload record
    const { data: upload, error: uploadError } = await supabase
      .from("uploads")
      .insert({
        project_id: projectId,
        filename: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: mockStoragePath,
        status: "uploaded",
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (uploadError) {
      return NextResponse.json({ error: "Failed to create upload record" }, { status: 500 })
    }

    // Simulate schema detection after a delay
    setTimeout(async () => {
      const mockSchema = {
        format: "JSONL",
        columns: [
          { name: "id", type: "string", sample: "000123" },
          { name: "text_ko", type: "string", sample: "복통과 구토로 내원한 35세 여성…" },
          { name: "text_en", type: "string", sample: "35F with abdominal pain and vomiting…" },
          { name: "image", type: "string", sample: "/img/000123.png" },
          { name: "label", type: "string", sample: "GI/abdomen" },
        ],
        totalRecords: 1250,
      }

      await supabase
        .from("uploads")
        .update({
          status: "processed",
          schema_preview: mockSchema,
        })
        .eq("id", upload.id)
    }, 2000)

    return NextResponse.json({ upload })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
