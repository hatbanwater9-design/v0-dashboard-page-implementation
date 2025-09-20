import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string; format: string }> }) {
  try {
    const { jobId, format } = await params
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get export artifact with project access check
    const { data: artifact, error: artifactError } = await supabase
      .from("export_artifacts")
      .select(`
        *,
        pipeline_jobs!inner(
          projects!inner(
            teams!inner(
              team_memberships!inner(user_id)
            )
          )
        )
      `)
      .eq("job_id", jobId)
      .eq("format", format)
      .eq("pipeline_jobs.projects.teams.team_memberships.user_id", user.id)
      .single()

    if (artifactError || !artifact) {
      return NextResponse.json({ error: "Export not found or access denied" }, { status: 404 })
    }

    // Generate mock export file content
    const mockContent = generateMockExportFile(format, artifact)

    return new NextResponse(mockContent, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${artifact.filename}"`,
        "Content-Length": mockContent.length.toString(),
      },
    })
  } catch (error) {
    console.error("Export download error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateMockExportFile(format: string, artifact: any): Buffer {
  // This generates mock file content. In a real implementation, you would:
  // 1. Retrieve the actual processed data from storage
  // 2. Convert it to the target format (COCO, YOLO, JSONL)
  // 3. Create a proper ZIP file with the converted data

  let mockContent = ""

  switch (format) {
    case "coco":
      mockContent = JSON.stringify(
        {
          info: {
            description: `GenMedic Studio COCO export - ${artifact.filename}`,
            version: "1.0",
            year: new Date().getFullYear(),
            contributor: "GenMedic Studio",
            date_created: new Date().toISOString(),
          },
          licenses: [
            {
              id: 1,
              name: "Research Use Only",
              url: "https://genmedic.studio/license",
            },
          ],
          images: [
            {
              id: 1,
              width: 512,
              height: 512,
              file_name: "sample_001.jpg",
              license: 1,
              date_captured: new Date().toISOString(),
            },
          ],
          annotations: [
            {
              id: 1,
              image_id: 1,
              category_id: 1,
              bbox: [100, 100, 200, 150],
              area: 30000,
              iscrowd: 0,
            },
          ],
          categories: [
            {
              id: 1,
              name: "medical_condition",
              supercategory: "medical",
            },
          ],
        },
        null,
        2,
      )
      break

    case "yolo":
      mockContent = `# GenMedic Studio YOLO Export
# Generated: ${new Date().toISOString()}
# Classes: medical_condition, anatomy, procedure

# Training data
train: ./train/images
val: ./val/images
test: ./test/images

# Class names
names:
  0: medical_condition
  1: anatomy  
  2: procedure

# Sample annotation (class_id center_x center_y width height)
# 0 0.5 0.5 0.3 0.4
`
      break

    case "jsonl":
      const sampleRecords = [
        {
          id: "001",
          text_ko: "복통과 구토로 내원한 35세 여성 환자",
          text_en: "35-year-old female patient presenting with abdominal pain and vomiting",
          image: "/processed/001.jpg",
          label: "GI/abdomen",
          confidence: 0.95,
          processed_at: new Date().toISOString(),
        },
        {
          id: "002",
          text_ko: "흉통을 호소하는 45세 남성",
          text_en: "45-year-old male complaining of chest pain",
          image: "/processed/002.jpg",
          label: "cardiology/chest",
          confidence: 0.88,
          processed_at: new Date().toISOString(),
        },
      ]
      mockContent = sampleRecords.map((record) => JSON.stringify(record)).join("\n")
      break

    default:
      mockContent = `GenMedic Studio Export - ${format.toUpperCase()}\nGenerated: ${new Date().toISOString()}\n\nThis is a demo export file.`
  }

  // In a real implementation, you would create a proper ZIP file
  // For demo purposes, we'll return the content as-is
  return Buffer.from(mockContent)
}
