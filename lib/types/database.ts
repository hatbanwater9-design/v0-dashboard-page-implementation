// Database types for GenMedic Studio

export interface Team {
  id: string
  name: string
  slug: string
  description?: string
  created_at: string
  updated_at: string
}

export interface TeamMembership {
  id: string
  team_id: string
  user_id: string
  role: "owner" | "admin" | "member" | "viewer"
  created_at: string
  updated_at: string
}

export interface TeamInvitation {
  id: string
  team_id: string
  email: string
  role: "member" | "viewer"
  invited_by: string
  token: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

export interface Project {
  id: string
  team_id: string
  name: string
  slug: string
  description?: string
  is_read_only: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Upload {
  id: string
  project_id: string
  filename: string
  file_size: number
  file_type: string
  storage_path: string
  status: "uploading" | "uploaded" | "processing" | "processed" | "failed"
  schema_preview?: any
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface Glossary {
  id: string
  project_id: string
  name: string
  filename: string
  entries: any[]
  conflicts: any[]
  is_active: boolean
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface PipelineJob {
  id: string
  project_id: string
  upload_id: string
  glossary_id?: string
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  settings: any
  compliance_checks: any
  started_by: string
  started_at: string
  completed_at?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface PipelineJobStep {
  id: string
  job_id: string
  step_key: string
  step_label: string
  status: "queued" | "running" | "completed" | "failed"
  started_at?: string
  completed_at?: string
  logs?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface QualityReport {
  id: string
  job_id: string
  overall_score: number
  component_scores: any
  pass_fail_stats: any
  histogram_data: any
  report_data: any
  pdf_url?: string
  created_at: string
  updated_at: string
}

export interface ExportArtifact {
  id: string
  job_id: string
  format: "coco" | "yolo" | "jsonl"
  filename: string
  file_size?: number
  storage_path: string
  download_url?: string
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  team_id?: string
  project_id?: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  metadata: any
  created_at: string
}
