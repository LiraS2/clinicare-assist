import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parseISO } from "date-fns";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { createPatient, getPatientById, onlyDigits, updatePatient } from "@/services/patientsService";
import type { Patient, PatientInsert } from "@/types/patient";
import { fetchAddressByZipCode } from "@/services/cep";

// Helpers de máscara (apenas apresentação)
const maskCPF = (v: string) => {
  const s = onlyDigits(v).slice(0, 11);
  return s
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
};
const maskPhone = (v: string) => {
  const s = onlyDigits(v).slice(0, 11);
  if (s.length <= 10) {
    return s
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return s
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
};
const maskCEP = (v: string) => {
  const s = onlyDigits(v).slice(0, 8);
  return s.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
};

// Schema de validação (espelha o schema do banco)
const FormSchema = z.object({
  // Pessoais
  full_name: z.string().min(1, "Nome é obrigatório"),
  social_name: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  cpf: z
    .string()
    .min(1, "CPF é obrigatório")
    .transform((v) => onlyDigits(v))
    .refine((v) => v.length === 11, "CPF deve conter 11 dígitos"),
  rg: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  other_document_type: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  other_document_number: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  gender: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  birth_date: z.date({ required_error: "Data de nascimento é obrigatória" }),
  ethnicity: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  race: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  nationality: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  birth_city: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  birth_state: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  profession: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  marital_status: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  mother_name: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  father_name: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  responsible_name: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  responsible_cpf: z
    .string()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : undefined))
    .refine((v) => !v || v.length === 11, "CPF do responsável deve conter 11 dígitos"),
  legacy_code: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  // Contato
  email: z
    .string()
    .email("E-mail inválido")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  phone_primary: z
    .string()
    .min(1, "Telefone principal é obrigatório")
    .transform((v) => onlyDigits(v))
    .refine((v) => v.length >= 10, "Telefone inválido"),
  phone_secondary: z
    .string()
    .optional()
    .transform((v) => (v ? onlyDigits(v) : undefined)),
  // Endereço
  address_zip_code: z.string().optional().transform((v) => (v ? onlyDigits(v) : undefined)),
  address_street: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  address_number: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  address_complement: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  address_district: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  address_city: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  address_state: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
  // Observações
  observations: z.string().optional().or(z.literal("")).transform((v) => v || undefined),
});

export default function PatientFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      full_name: "",
      social_name: "",
      cpf: "",
      rg: "",
      other_document_type: "",
      other_document_number: "",
      gender: "",
      birth_date: undefined as unknown as Date,
      ethnicity: "",
      race: "",
      nationality: "",
      birth_city: "",
      birth_state: "",
      profession: "",
      marital_status: "",
      mother_name: "",
      father_name: "",
      responsible_name: "",
      responsible_cpf: "",
      legacy_code: "",
      email: "",
      phone_primary: "",
      phone_secondary: "",
      address_zip_code: "",
      address_street: "",
      address_number: "",
      address_complement: "",
      address_district: "",
      address_city: "",
      address_state: "",
      observations: "",
    },
    mode: "onChange",
  });

  // Carregar dados para edição
  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        const p = await getPatientById(id);
        if (!p) return;
        form.reset({
          ...p,
          cpf: p.cpf,
          phone_primary: p.phone_primary,
          phone_secondary: p.phone_secondary ?? "",
          address_zip_code: p.address_zip_code ?? "",
          birth_date: p.birth_date ? parseISO(p.birth_date) : (undefined as any),
        });
      } catch (e) {
        // Silencioso: página continuará com defaults
      }
    })();
  }, [id, isEdit]);

  // Preenchimento automático por CEP ao desfocar
  const [isFetchingAddress, setFetchingAddress] = useState(false);
  const handleCepBlur = async () => {
    const cep = onlyDigits(form.getValues("address_zip_code") || "");
    if (cep.length !== 8) return;
    setFetchingAddress(true);
    try {
      const res = await fetchAddressByZipCode(cep);
      form.setValue("address_street", res.street);
      form.setValue("address_district", res.district);
      form.setValue("address_city", res.city);
      form.setValue("address_state", res.state);
    } finally {
      setFetchingAddress(false);
    }
  };

  const onSubmit = async (values: z.infer<typeof FormSchema>) => {
    // Converter Date para string yyyy-MM-dd
    const payload: PatientInsert = {
      ...values,
      birth_date: format(values.birth_date, "yyyy-MM-dd"),
    } as unknown as PatientInsert;

    try {
      if (isEdit && id) {
        await updatePatient({ id, ...payload });
        toast({ title: "Paciente atualizado com sucesso" });
      } else {
        await createPatient(payload);
        toast({ title: "Paciente criado com sucesso" });
      }
      navigate("/patients");
    } catch (e: any) {
      toast({ title: "Erro ao salvar paciente", description: e?.message ?? "" });
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Helmet>
        <title>{isEdit ? "Editar Paciente | MediConnect" : "Novo Paciente | MediConnect"}</title>
        <meta name="description" content={isEdit ? "Edição de paciente" : "Cadastro de novo paciente"} />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : '/patients/new'} />
      </Helmet>

      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {isEdit ? "Editar Paciente" : "Novo Paciente"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isEdit ? "Atualize os dados do paciente" : "Preencha os dados para cadastrar um novo paciente"}
        </p>
      </header>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Tabs defaultValue="pessoais" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pessoais">Dados Pessoais</TabsTrigger>
              <TabsTrigger value="contato">Contato e Endereço</TabsTrigger>
              <TabsTrigger value="observacoes">Observações</TabsTrigger>
            </TabsList>

            {/* Aba: Dados Pessoais */}
            <TabsContent value="pessoais" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex.: Maria Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="social_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome social</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="000.000.000-00"
                          value={maskCPF(field.value)}
                          onChange={(e) => field.onChange(e.target.value)}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>RG</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gênero</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Masculino">Masculino</SelectItem>
                          <SelectItem value="Feminino">Feminino</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="marital_status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado civil</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                          <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                          <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                          <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                          <SelectItem value="União Estável">União Estável</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ethnicity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Etnia (IBGE)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Branca">Branca</SelectItem>
                          <SelectItem value="Preta">Preta</SelectItem>
                          <SelectItem value="Parda">Parda</SelectItem>
                          <SelectItem value="Amarela">Amarela</SelectItem>
                          <SelectItem value="Indígena">Indígena</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de nascimento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecionar data</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profession"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profissão</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mother_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da mãe</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="father_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome do pai</FormLabel>
                      <FormControl>
                        <Input placeholder="Opcional" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormDescription>Upload de foto será adicionado em breve (armazenamento no Supabase).</FormDescription>
            </TabsContent>

            {/* Aba: Contato e Endereço */}
            <TabsContent value="contato" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input placeholder="email@exemplo.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_primary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone principal (WhatsApp)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 90000-0000"
                          value={maskPhone(field.value)}
                          onChange={(e) => field.onChange(e.target.value)}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone_secondary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone secundário</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="(11) 0000-0000"
                          value={maskPhone(field.value || "")}
                          onChange={(e) => field.onChange(e.target.value)}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address_zip_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="00000-000"
                          value={maskCEP(field.value || "")}
                          onChange={(e) => field.onChange(e.target.value)}
                          onBlur={handleCepBlur}
                          inputMode="numeric"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div />

                <FormField
                  control={form.control}
                  name="address_street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input placeholder="Rua, Avenida..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="Número" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address_complement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input placeholder="Apartamento, bloco, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address_district"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input placeholder="Bairro" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address_city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address_state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" maxLength={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {isFetchingAddress && (
                <p className="text-sm text-muted-foreground">Buscando endereço pelo CEP...</p>
              )}
            </TabsContent>

            {/* Aba: Observações */}
            <TabsContent value="observacoes" className="space-y-4">
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Anotações gerais" rows={6} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </TabsContent>
          </Tabs>

          <div className="flex items-center gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/patients")}>Cancelar</Button>
            <Button type="submit" disabled={!form.formState.isValid || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
