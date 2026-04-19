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
    // Se o erro for de AUTENTICAÇÃO (P1000), significa que o banco resetou ou a senha mudou.
    // Redirecionamos para o setup para que a Ponte de Resiliência possa corrigir.
    if (error?.code === "P1000") {
      console.log("[AUTH] Falha de autenticação DB no boot. Redirecionando para Setup.");
      redirect("/setup");
    }
    
    // Outros erros de banco (ex: conexão inicial), ainda tentamos mandar pro setup 
    // para que o Wizard tente corrigir a conexão do DB
    redirect("/setup");
  }

  // Se tudo ok, renderiza o formulário de login (Client Component)
  return <LoginForm />;
}
