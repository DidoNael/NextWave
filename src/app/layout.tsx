import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ColorProvider } from "@/components/providers/ColorProvider";
import { Toaster } from "sonner";
import { Softphone } from "@/components/pbx/softphone";
import "./globals.css";

// Removendo Google Fonts para evitar timeouts no build Docker ARM64
// const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  const name = branding?.name || "NextWave CRM";

  return {
    title: {
      default: name,
      template: `%s | ${name}`,
    },
    description: "Sistema de gestão de clientes e projetos profissional",
  };
}

type AccentColor = "blue" | "orange" | "green" | "purple" | "rose" | "pink";
type LayoutTheme = "default" | "professional";

import { redirect } from "next/navigation";
import { headers } from "next/headers";

const VALID_COLORS: AccentColor[] = ["blue", "orange", "green", "purple", "rose", "pink"];
const VALID_LAYOUTS: LayoutTheme[] = ["default", "professional"];

async function getLicenseStatus() {
  try {
    const license = await prisma.systemLicense.findFirst({
      where: { id: "default" }
    });
    return license?.status || "active";
  } catch (e) {
    return "active"; // Falha no banco não deve travar o sistema totalmente se for erro de conexão
  }
}

async function getBranding() {
  try {
    return await prisma.systemBranding.findFirst({
      where: { id: "default" }
    });
  } catch (e: any) {
    // Silencia erro de conexão durante o build
    if (e.message?.includes("Unable to open the database file") || e.code === 'P2024') {
      return null;
    }
    console.warn("Branding load failed", e.message);
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = headers();
  const domain = headerList.get("host") || "";
  const pathname = headerList.get("x-invoke-path") || ""; // Pode não ser confiável em todos os ambientes

  // 1. Verificação de Licença (Trava White-Label)
  const licenseStatus = await getLicenseStatus();
  const branding = await getBranding();

  // Se o sistema estiver suspenso e não estivermos na página de bloqueio
  // Nota: Next.js server actions / middleware são melhores para isso, mas no layout funciona como última camada
  // Para simplificar, vamos assumir que o usuário será bloqueado se o status for suspended

  // Tenta carregar do banco se logado, senão usa cookies (flash prevention)
  const session = await auth();
  const cookieStore = cookies();

  let dbColor = null;
  let dbLayout = null;

  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { accentColor: true, layoutTheme: true }
      } as any);
      if (user) {
        dbColor = user.accentColor as AccentColor;
        dbLayout = user.layoutTheme as LayoutTheme;
      }
    } catch (e: any) {
      if (!e.message?.includes("Unable to open the database file")) {
        console.error("Erro ao carregar tema do banco no layout", e.message);
      }
    }
  }

  const rawColor = cookieStore.get("nextwave-accent-color")?.value as AccentColor;
  const rawLayout = cookieStore.get("nextwave-layout-theme")?.value as LayoutTheme;

  const initialColor: AccentColor = VALID_COLORS.includes(dbColor || rawColor) ? (dbColor || rawColor as any) : "blue";
  const initialLayout: LayoutTheme = VALID_LAYOUTS.includes(dbLayout || rawLayout) ? (dbLayout || rawLayout as any) : "default";

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-color={initialColor}
      data-layout={initialLayout}
    >
      <body className="antialiased">
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ColorProvider initialColor={initialColor} initialLayout={initialLayout}>
              {children}
              <Toaster
                richColors
                position="top-right"
                toastOptions={{
                  duration: 3000,
                }}
              />
              {session?.user && <Softphone />}
            </ColorProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
