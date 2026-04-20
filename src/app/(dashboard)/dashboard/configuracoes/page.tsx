import { redirect } from "next/navigation";

/**
 * Rota índice de /dashboard/configuracoes
 * Redireciona para a primeira sub-página disponível (Segurança)
 */
export default function ConfiguracoesIndexPage() {
  redirect("/dashboard/configuracoes/seguranca");
}
