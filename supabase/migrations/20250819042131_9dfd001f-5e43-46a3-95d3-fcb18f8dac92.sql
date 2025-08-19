-- Fix security issues by dropping triggers first, then recreating functions with proper search_path

-- Drop triggers first
DROP TRIGGER IF EXISTS update_medical_reports_updated_at ON public.medical_reports;
DROP TRIGGER IF EXISTS patients_audit_trigger ON public.patients;
DROP TRIGGER IF EXISTS medical_reports_audit_trigger ON public.medical_reports;

-- Drop and recreate functions with proper search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.audit_trigger_function();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_log (
            table_name,
            record_id,
            action,
            old_data_jsonb,
            new_data_jsonb,
            changed_by_user_id
        ) VALUES (
            TG_TABLE_NAME,
            OLD.id,
            TG_OP,
            to_jsonb(OLD),
            NULL,
            auth.uid()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_log (
            table_name,
            record_id,
            action,
            old_data_jsonb,
            new_data_jsonb,
            changed_by_user_id
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            to_jsonb(OLD),
            to_jsonb(NEW),
            auth.uid()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_log (
            table_name,
            record_id,
            action,
            old_data_jsonb,
            new_data_jsonb,
            changed_by_user_id
        ) VALUES (
            TG_TABLE_NAME,
            NEW.id,
            TG_OP,
            NULL,
            to_jsonb(NEW),
            auth.uid()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Recreate triggers
CREATE TRIGGER update_medical_reports_updated_at
    BEFORE UPDATE ON public.medical_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER patients_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER medical_reports_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.medical_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();