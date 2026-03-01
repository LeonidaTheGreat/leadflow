-- Allow anonymous reads for MVP dashboard
-- NOTE: This is for development/MVP only. In production, use proper auth.

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Agents can manage their leads" ON leads;
DROP POLICY IF EXISTS "Agents can read own record" ON agents;
DROP POLICY IF EXISTS "Agents can read their lead messages" ON messages;
DROP POLICY IF EXISTS "Agents can read their lead qualifications" ON qualifications;

-- Allow anon to read all leads
CREATE POLICY "Allow anon read leads" ON leads
    FOR SELECT USING (true);

-- Allow anon to read all agents  
CREATE POLICY "Allow anon read agents" ON agents
    FOR SELECT USING (true);

-- Allow anon to read all messages
CREATE POLICY "Allow anon read messages" ON messages
    FOR SELECT USING (true);

-- Allow anon to read all qualifications
CREATE POLICY "Allow anon read qualifications" ON qualifications
    FOR SELECT USING (true);