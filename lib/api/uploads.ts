import { createClient } from "@/lib/supabase/server"
import type { Upload } from "@/lib/types/database"

export async function createUpload(
  projectId: string,
  filename: string,
  fileSize: number,
  fileType: string,
  storagePath: string,
): Promise<Upload> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("uploads")
    .insert({
      project_id: projectId,
      filename,
      file_size: fileSize,
      file_type: fileType,
      storage_path: storagePath,
      status: "uploaded",
      uploaded_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getProjectUploads(projectId: string): Promise<Upload[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("uploads")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function updateUploadStatus(
  uploadId: string,
  status: Upload["status"],
  schemaPreview?: any,
): Promise<void> {
  const supabase = await createClient()

  const updateData: any = { status }
  if (schemaPreview) {
    updateData.schema_preview = schemaPreview
  }

  const { error } = await supabase.from("uploads").update(updateData).eq("id", uploadId)

  if (error) throw error
}
