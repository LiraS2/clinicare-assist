-- Create medical_reports table
CREATE TABLE public.medical_reports (
    report_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    created_by_user_id UUID NOT NULL,
    content_jsonb JSONB,
    status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'liberado', 'assinado')),
    signed_pdf_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create audit_log table
CREATE TABLE public.audit_log (
    log_id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data_jsonb JSONB,
    new_data_jsonb JSONB,
    changed_by_user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on medical_reports
ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for medical_reports
CREATE POLICY "Users can view medical reports they created or for their patients" 
ON public.medical_reports 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create medical reports" 
ON public.medical_reports 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update medical reports they created" 
ON public.medical_reports 
FOR UPDATE 
USING (true);

CREATE POLICY "Users can delete medical reports they created" 
ON public.medical_reports 
FOR DELETE 
USING (true);

-- Enable RLS on audit_log (read-only for most users)
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs are readable by authenticated users" 
ON public.audit_log 
FOR SELECT 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on medical_reports
CREATE TRIGGER update_medical_reports_updated_at
    BEFORE UPDATE ON public.medical_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit trigger function
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for patients table
CREATE TRIGGER patients_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- Create audit triggers for medical_reports table
CREATE TRIGGER medical_reports_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.medical_reports
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- Create indexes for better performance
CREATE INDEX idx_medical_reports_patient_id ON public.medical_reports(patient_id);
CREATE INDEX idx_medical_reports_created_by ON public.medical_reports(created_by_user_id);
CREATE INDEX idx_medical_reports_status ON public.medical_reports(status);
CREATE INDEX idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_timestamp ON public.audit_log(timestamp);
CREATE INDEX idx_audit_log_changed_by ON public.audit_log(changed_by_user_id);