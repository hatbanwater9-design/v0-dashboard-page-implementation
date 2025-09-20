-- Functions and triggers for GenMedic Studio

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Add updated_at triggers to all relevant tables
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_memberships_updated_at
  BEFORE UPDATE ON team_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_uploads_updated_at
  BEFORE UPDATE ON uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glossaries_updated_at
  BEFORE UPDATE ON glossaries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_jobs_updated_at
  BEFORE UPDATE ON pipeline_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipeline_job_steps_updated_at
  BEFORE UPDATE ON pipeline_job_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quality_reports_updated_at
  BEFORE UPDATE ON quality_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_export_artifacts_updated_at
  BEFORE UPDATE ON export_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to log activities
CREATE OR REPLACE FUNCTION public.log_activity(
  p_team_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO activity_logs (team_id, project_id, user_id, action, resource_type, resource_id, metadata)
  VALUES (p_team_id, p_project_id, auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$;

-- Function to accept team invitation
CREATE OR REPLACE FUNCTION public.accept_team_invitation(invitation_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invitation_record team_invitations%ROWTYPE;
  user_email TEXT;
  result JSONB;
BEGIN
  -- Get current user email
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not authenticated');
  END IF;
  
  -- Find and validate invitation
  SELECT * INTO invitation_record 
  FROM team_invitations 
  WHERE token = invitation_token 
    AND email = user_email 
    AND expires_at > NOW() 
    AND accepted_at IS NULL;
  
  IF invitation_record.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM team_memberships 
    WHERE team_id = invitation_record.team_id AND user_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already a team member');
  END IF;
  
  -- Add user to team
  INSERT INTO team_memberships (team_id, user_id, role)
  VALUES (invitation_record.team_id, auth.uid(), invitation_record.role);
  
  -- Mark invitation as accepted
  UPDATE team_invitations 
  SET accepted_at = NOW() 
  WHERE id = invitation_record.id;
  
  -- Log activity
  PERFORM log_activity(
    invitation_record.team_id,
    NULL,
    'member_joined',
    'team',
    invitation_record.team_id,
    jsonb_build_object('role', invitation_record.role)
  );
  
  RETURN jsonb_build_object('success', true, 'team_id', invitation_record.team_id);
END;
$$;
