-- Fix infinite recursion in team_memberships RLS policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view memberships for their teams" ON team_memberships;
DROP POLICY IF EXISTS "Team owners/admins can manage memberships" ON team_memberships;

-- Create new policies that don't cause recursion
-- Allow users to see their own memberships
CREATE POLICY "Users can view their own memberships" ON team_memberships
  FOR SELECT USING (user_id = auth.uid());

-- Allow team owners/admins to view all memberships in their teams
-- This uses a different approach to avoid recursion
CREATE POLICY "Team owners can view team memberships" ON team_memberships
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Allow team owners/admins to insert new memberships
CREATE POLICY "Team owners can insert memberships" ON team_memberships
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Allow team owners/admins to update memberships
CREATE POLICY "Team owners can update memberships" ON team_memberships
  FOR UPDATE USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Allow team owners/admins to delete memberships
CREATE POLICY "Team owners can delete memberships" ON team_memberships
  FOR DELETE USING (
    team_id IN (
      SELECT team_id FROM team_memberships 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Allow users to insert their own membership (for accepting invites)
CREATE POLICY "Users can insert their own membership" ON team_memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());
