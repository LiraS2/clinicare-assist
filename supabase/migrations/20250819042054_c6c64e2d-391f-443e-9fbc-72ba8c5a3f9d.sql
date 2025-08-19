-- Fix security issues by setting proper search_path for functions

-- Drop and recreate update_updated_at_column function with proper search_path
DROP FUNCTION IF EXISTS public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Drop and recreate audit_trigger_function with proper search_path
DROP FUNCTION IF EXISTS public.audit_trigger_function();

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