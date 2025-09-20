-- Row Level Security Policies for GenMedic Studio

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Teams policies - users can only see teams they belong to
CREATE POLICY "Users can view teams they belong to" ON teams
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_memberships 
      WHERE team_id = teams.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can update teams" ON teams
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_memberships 
      WHERE team_id = teams.id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Authenticated users can create teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Team memberships policies
CREATE POLICY "Users can view memberships for their teams" ON team_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm 
      WHERE tm.team_id = team_memberships.team_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can manage memberships" ON team_memberships
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_memberships tm 
      WHERE tm.team_id = team_memberships.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can insert their own membership when accepting invites" ON team_memberships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Team invitations policies
CREATE POLICY "Team members can view invitations for their teams" ON team_invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_memberships 
      WHERE team_id = team_invitations.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team owners/admins can manage invitations" ON team_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM team_memberships 
      WHERE team_id = team_invitations.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Projects policies
CREATE POLICY "Team members can view projects in their teams" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM team_memberships 
      WHERE team_id = projects.team_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_memberships 
      WHERE team_id = projects.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    ) AND auth.uid() = created_by
  );

CREATE POLICY "Team owners/admins can update projects" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM team_memberships 
      WHERE team_id = projects.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Team owners/admins can delete projects" ON projects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM team_memberships 
      WHERE team_id = projects.team_id AND user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Uploads policies
CREATE POLICY "Team members can view uploads in their projects" ON uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE p.id = uploads.project_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create uploads" ON uploads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE p.id = uploads.project_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin', 'member')
    ) AND auth.uid() = uploaded_by
  );

-- Glossaries policies
CREATE POLICY "Team members can view glossaries in their projects" ON glossaries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE p.id = glossaries.project_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can manage glossaries" ON glossaries
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE p.id = glossaries.project_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin', 'member')
    )
  );

-- Pipeline jobs policies
CREATE POLICY "Team members can view pipeline jobs in their projects" ON pipeline_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE p.id = pipeline_jobs.project_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Team members can create pipeline jobs" ON pipeline_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE p.id = pipeline_jobs.project_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin', 'member')
    ) AND auth.uid() = started_by
  );

-- Pipeline job steps policies
CREATE POLICY "Team members can view pipeline job steps" ON pipeline_job_steps
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pipeline_jobs pj
      JOIN projects p ON p.id = pj.project_id
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE pj.id = pipeline_job_steps.job_id AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage pipeline job steps" ON pipeline_job_steps
  FOR ALL USING (true);

-- Quality reports policies
CREATE POLICY "Team members can view quality reports" ON quality_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pipeline_jobs pj
      JOIN projects p ON p.id = pj.project_id
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE pj.id = quality_reports.job_id AND tm.user_id = auth.uid()
    )
  );

-- Export artifacts policies
CREATE POLICY "Team members can view export artifacts" ON export_artifacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM pipeline_jobs pj
      JOIN projects p ON p.id = pj.project_id
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE pj.id = export_artifacts.job_id AND tm.user_id = auth.uid()
    )
  );

-- Activity logs policies
CREATE POLICY "Team members can view activity logs for their teams/projects" ON activity_logs
  FOR SELECT USING (
    (team_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM team_memberships 
      WHERE team_id = activity_logs.team_id AND user_id = auth.uid()
    )) OR
    (project_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM projects p
      JOIN team_memberships tm ON tm.team_id = p.team_id
      WHERE p.id = activity_logs.project_id AND tm.user_id = auth.uid()
    ))
  );

CREATE POLICY "System can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (true);
