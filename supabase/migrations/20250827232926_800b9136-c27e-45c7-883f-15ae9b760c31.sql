-- Fix security vulnerability: Restrict audit log access to administrators only
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Audit logs are readable by authenticated users" ON public.audit_log;

-- Create new restrictive policy that only allows admins to read audit logs
CREATE POLICY "Only admins can read audit logs" 
ON public.audit_log 
FOR SELECT 
USING (has_role('admin'::user_role));

-- Ensure no other operations are allowed on audit logs (they should only be created by triggers)
-- This prevents any manual manipulation of audit data