import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export default async function IndexPage() {
  // Verificar se o sistema foi configurado (banco vazio = precisa de setup)
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      redirect("/setup");
    }
  } catch {
    redirect("/setup");
  }

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Redireciona para o dashboard
  redirect(`/dashboard`);
}
