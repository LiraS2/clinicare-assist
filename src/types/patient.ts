// Tipos e enums para o módulo de Pacientes
// Obs.: Comentários em português para facilitar manutenção pela equipe local.

export type Gender = "Masculino" | "Feminino" | "Outro" | "Prefiro não informar";
export type MaritalStatus =
  | "Solteiro(a)"
  | "Casado(a)"
  | "Divorciado(a)"
  | "Viúvo(a)"
  | "União Estável"
  | "Outro";
export type Ethnicity = "Branca" | "Preta" | "Parda" | "Amarela" | "Indígena" | "Outra";

// Representa a tabela public.patients no Supabase
export interface Patient {
  id?: string;
  // Dados Pessoais
  photo_url?: string | null;
  full_name: string;
  social_name?: string | null;
  cpf: string; // Apenas dígitos (11)
  rg?: string | null;
  other_document_type?: string | null;
  other_document_number?: string | null;
  gender?: string | null; // Livre para compatibilidade com sistemas legados
  birth_date: string; // yyyy-MM-dd
  ethnicity?: string | null;
  race?: string | null;
  nationality?: string | null;
  birth_city?: string | null;
  birth_state?: string | null; // UF
  profession?: string | null;
  marital_status?: string | null;
  mother_name?: string | null;
  father_name?: string | null;
  responsible_name?: string | null;
  responsible_cpf?: string | null; // 11 dígitos
  legacy_code?: string | null;
  // Contato
  email?: string | null;
  phone_primary: string; // Apenas dígitos
  phone_secondary?: string | null; // Apenas dígitos
  // Endereço
  address_zip_code?: string | null; // CEP sem máscara
  address_street?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  address_district?: string | null;
  address_city?: string | null;
  address_state?: string | null; // UF
  // Observações e dados auxiliares
  observations?: string | null;
  behavior_score?: number | null;
  absenteeism_risk_score?: number | null;
  communication_preferences?: Record<string, boolean> | null;
  // Metadados
  created_at?: string;
  updated_at?: string;
}

export type PatientInsert = Omit<Patient, "id" | "created_at" | "updated_at">;
export type PatientUpdate = Partial<PatientInsert> & { id: string };
