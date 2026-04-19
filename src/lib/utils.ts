import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR").format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ativo: "success",
    pago: "success",
    concluido: "success",
    aprovado: "success",
    em_andamento: "primary",
    pendente: "warning",
    enviado: "warning",
    agendado: "primary",
    inativo: "muted",
    cancelado: "destructive",
    rascunho: "secondary",
    prospecto: "warning",
  };
  return map[status] ?? "secondary";
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    ativo: "Ativo",
    pago: "Pago",
    concluido: "Concluído",
    aprovado: "Aprovado",
    em_andamento: "Em Andamento",
    pendente: "Pendente",
    enviado: "Enviado",
    agendado: "Agendado",
    inativo: "Inativo",
    cancelado: "Cancelado",
    rascunho: "Rascunho",
    prospecto: "Prospecto",
    receita: "Receita",
    despesa: "Despesa",
    reuniao: "Reunião",
    call: "Call",
    tarefa: "Tarefa",
    lembrete: "Lembrete",
  };
  return map[status] ?? status;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}
