import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ListPatientsResult, deletePatient, listPatients } from "@/services/patientsService";
import type { Patient } from "@/types/patient";
import { Search, MoreVertical, Plus } from "lucide-react";

// Hook simples para debouce
function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const PAGE_SIZE = 10;

export default function PatientListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 500);
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, isFetching } = useQuery<ListPatientsResult>({
    queryKey: ["patients", { page, search: debouncedSearch }],
    queryFn: () => listPatients({ page, pageSize: PAGE_SIZE, search: debouncedSearch }),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => deletePatient(id),
    onSuccess: async () => {
      toast({ title: "Paciente excluído com sucesso" });
      await qc.invalidateQueries({ queryKey: ["patients"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao excluir paciente", description: err?.message ?? "" });
    },
  });

  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const total = data?.count ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  useEffect(() => {
    // Reset para página 1 quando muda a busca
    setPage(1);
  }, [debouncedSearch]);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Helmet>
        <title>Pacientes | MediConnect</title>
        <meta name="description" content="Listagem e gestão de pacientes da clínica - MediConnect" />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/patients'} />
      </Helmet>

      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Pacientes</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus pacientes e reduza o absenteísmo</p>
        </div>
        <Button onClick={() => navigate("/patients/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Paciente
        </Button>
      </header>

      <section aria-label="Controles de listagem" className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou CPF"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Filtros futuros (Convênio, VIP) */}
          {/* Placeholder para manter layout coerente */}
          <Button variant="outline" disabled>
            Filtros (em breve)
          </Button>
        </div>
      </section>

      <main>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Cidade/UF</TableHead>
              <TableHead>Último Atendimento</TableHead>
              <TableHead>Próximo Atendimento</TableHead>
              <TableHead className="w-14 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || isFetching ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[220px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[140px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-6 w-6" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="text-sm text-destructive">Erro ao carregar: {(error as any)?.message ?? "Tente novamente"}</div>
                </TableCell>
              </TableRow>
            ) : (data?.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="text-sm text-muted-foreground">Nenhum paciente encontrado</div>
                </TableCell>
              </TableRow>
            ) : (
              (data?.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name}</TableCell>
                  <TableCell>{p.phone_primary || "-"}</TableCell>
                  <TableCell>
                    {p.address_city ? `${p.address_city}${p.address_state ? `/${p.address_state}` : ""}` : "-"}
                  </TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      patient={p}
                      onView={() => setViewPatient(p)}
                      onEdit={() => navigate(`/patients/${p.id}/edit`)}
                      onDelete={() => setConfirmDeleteId(p.id!)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Paginação */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-muted-foreground">
            Página {page} de {totalPages} — {total} registro(s)
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Anterior
            </Button>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Próxima
            </Button>
          </div>
        </div>
      </main>

      {/* Dialog de detalhes (leitura) */}
      <Dialog open={!!viewPatient} onOpenChange={(open) => !open && setViewPatient(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Paciente</DialogTitle>
            <DialogDescription>Visualização rápida das informações</DialogDescription>
          </DialogHeader>
          {viewPatient && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nome completo</p>
                <p className="font-medium">{viewPatient.full_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">CPF</p>
                <p className="font-medium">{viewPatient.cpf}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Telefone</p>
                <p className="font-medium">{viewPatient.phone_primary}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Nascimento</p>
                <p className="font-medium">{viewPatient.birth_date}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-muted-foreground">Cidade/UF</p>
                <p className="font-medium">{viewPatient.address_city ?? "-"}{viewPatient.address_state ? `/${viewPatient.address_state}` : ""}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-muted-foreground">Observações</p>
                <p className="font-medium whitespace-pre-wrap">{viewPatient.observations ?? "-"}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O paciente será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDeleteId) return;
                await deleteMut.mutateAsync(confirmDeleteId);
                setConfirmDeleteId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({
  patient,
  onView,
  onEdit,
  onDelete,
}: {
  patient: Patient;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Ações para ${patient.full_name}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuItem onClick={onView}>Ver detalhes</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={onDelete}>
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
