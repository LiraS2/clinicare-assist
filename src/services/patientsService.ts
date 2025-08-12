// Serviço de acesso aos dados de Pacientes (fallback em memória quando Supabase não está configurado)
// Quando o projeto for conectado ao Supabase, substituiremos esta implementação por consultas reais.

import type { Patient, PatientInsert, PatientUpdate } from "@/types/patient";

export interface ListPatientsParams {
  page?: number; // 1-based
  pageSize?: number;
  search?: string;
}

export interface ListPatientsResult {
  data: Patient[];
  count: number;
}

// Utilitário: sanitiza string mantendo apenas dígitos
export const onlyDigits = (v: string) => (v || "").replace(/\D+/g, "");

// Base em memória para permitir a navegação do app sem Supabase
let MOCK_DB: Patient[] = [];

function matchesSearch(p: Patient, term: string) {
  if (!term) return true;
  const t = term.toLowerCase();
  const cpf = onlyDigits(p.cpf);
  return p.full_name.toLowerCase().includes(t) || cpf.includes(onlyDigits(t));
}

export async function listPatients({
  page = 1,
  pageSize = 10,
  search = "",
}: ListPatientsParams): Promise<ListPatientsResult> {
  // Ordena por created_at desc (quando disponível)
  const sorted = [...MOCK_DB].sort((a, b) => {
    const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bd - ad;
  });
  const filtered = sorted.filter((p) => matchesSearch(p, search));
  const count = filtered.length;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const data = filtered.slice(from, to);
  return { data, count };
}

export async function getPatientById(id: string): Promise<Patient | null> {
  return MOCK_DB.find((p) => p.id === id) ?? null;
}

export async function createPatient(payload: PatientInsert): Promise<Patient> {
  const now = new Date().toISOString();
  const entity: Patient = {
    ...payload,
    id: crypto.randomUUID(),
    created_at: now,
    updated_at: now,
  };
  MOCK_DB.push(entity);
  return entity;
}

export async function updatePatient(payload: PatientUpdate): Promise<Patient> {
  const idx = MOCK_DB.findIndex((p) => p.id === payload.id);
  if (idx < 0) throw new Error("Paciente não encontrado");
  const updated: Patient = {
    ...MOCK_DB[idx],
    ...payload,
    updated_at: new Date().toISOString(),
  } as Patient;
  MOCK_DB[idx] = updated;
  return updated;
}

export async function deletePatient(id: string): Promise<void> {
  MOCK_DB = MOCK_DB.filter((p) => p.id !== id);
}
