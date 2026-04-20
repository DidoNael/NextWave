import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();

  // 1. Se já estiver logado, manda direto pro dashboard (quebra o loop)
  if (session?.user) {
    const orgSlug = (session.user as any).orgSlug || "default";
    redirect(`/${orgSlug}`);
  }

  // 2. Verificar setup no SERVIDOR (evita flash de tela e é mais rápido)
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      redirect("/setup");
    }
    } catch (error: any) {
    // Se falhar a autenticação ou conexão, NÃO redirecionamos para o setup
    // para evitar loops infinitos durante o tempo de reinício do container.
    // O formulário de login será renderizado e falhará suavemente se o DB ainda estiver fora.
    console.error("[AUTH] Erro ao verificar userCount:", error?.message);
  }

  // Se tudo ok, renderiza o formulário de login (Client Component)
  return <LoginForm />;
}
