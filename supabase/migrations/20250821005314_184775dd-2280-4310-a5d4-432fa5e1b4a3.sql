-- First, fix the broken RLS policies on patients table
DROP POLICY IF EXISTS "DELETE" ON public.patients;
DROP POLICY IF EXISTS "INSERT" ON public.patients;
DROP POLICY IF EXISTS "SELECT" ON public.patients;
DROP POLICY IF EXISTS "UPDATE" ON public.patients;

-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'medico', 'secretaria', 'gestao', 'financeiro');

-- Create profiles table for user roles and additional info
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'secretaria',
    cpf TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Create security definer function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = required_role
    );
$$;

-- Create security definer function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles user_role[])
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = ANY(required_roles)
    );
$$;

-- Profiles table policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.has_role('admin'));

CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.has_role('admin'));

-- Insert profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Usuário'),
        'secretaria'::user_role
    );
    RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Now create SECURE policies for patients table
-- Only authenticated medical staff can access patient data

CREATE POLICY "Medical staff can view patients"
    ON public.patients FOR SELECT
    TO authenticated
    USING (
        public.has_any_role(ARRAY['admin', 'medico', 'secretaria', 'gestao']::user_role[])
    );

CREATE POLICY "Medical staff can create patients"
    ON public.patients FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_any_role(ARRAY['admin', 'medico', 'secretaria']::user_role[])
    );

CREATE POLICY "Medical staff can update patients"
    ON public.patients FOR UPDATE
    TO authenticated
    USING (
        public.has_any_role(ARRAY['admin', 'medico', 'secretaria']::user_role[])
    );

CREATE POLICY "Only admins can delete patients"
    ON public.patients FOR DELETE
    TO authenticated
    USING (public.has_role('admin'));

-- Add triggers for audit logging on patients table
CREATE TRIGGER patients_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- Add updated_at trigger for patients
CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for profiles  
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Secure medical_reports table policies (replace the overly permissive ones)
DROP POLICY IF EXISTS "Users can view medical reports they created or for their patien" ON public.medical_reports;
DROP POLICY IF EXISTS "Users can create medical reports" ON public.medical_reports;
DROP POLICY IF EXISTS "Users can update medical reports they created" ON public.medical_reports;
DROP POLICY IF EXISTS "Users can delete medical reports they created" ON public.medical_reports;

CREATE POLICY "Medical staff can view medical reports"
    ON public.medical_reports FOR SELECT
    TO authenticated
    USING (
        public.has_any_role(ARRAY['admin', 'medico', 'gestao']::user_role[])
    );

CREATE POLICY "Doctors can create medical reports"
    ON public.medical_reports FOR INSERT
    TO authenticated
    WITH CHECK (
        public.has_any_role(ARRAY['admin', 'medico']::user_role[])
    );

CREATE POLICY "Doctors can update their own medical reports"
    ON public.medical_reports FOR UPDATE
    TO authenticated
    USING (
        created_by_user_id = auth.uid() OR public.has_role('admin')
    );

CREATE POLICY "Only admins can delete medical reports"
    ON public.medical_reports FOR DELETE
    TO authenticated
    USING (public.has_role('admin'));