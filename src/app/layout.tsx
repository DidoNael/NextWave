import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ColorProvider } from "@/components/providers/ColorProvider";
import { Toaster } from "sonner";
import { SessionSecurityProvider } from "@/components/auth/SessionSecurityProvider";
import dynamic from "next/dynamic";

const Softphone = dynamic(
  () => import("@/components/pbx/softphone").then((m) => ({ default: m.Softphone })),
  { ssr: false }
);
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

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Chamadas dinâmicas protegidas para evitar quebra do Wizard
  let headerList: any = null;
  let domain = "";
  let pathname = "";
  let session: any = null;
  let cookieStore: any = null;

  try {
    headerList = headers();
    domain = headerList.get("host") || "";
    pathname = headerList.get("x-invoke-path") || "";
  } catch (e) {
    console.log("[LAYOUT] Headers indisponíveis (contexto de setup/build)");
  }

  try {
    session = await auth();
  } catch (e) {
    console.log("[LAYOUT] Auth indisponível (contexto de setup/build)");
  }

  try {
    cookieStore = cookies();
  } catch (e) {
    console.log("[LAYOUT] Cookies indisponíveis (contexto de setup/build)");
  }

  // 1. Verificação de Licença (Trava White-Label) com silenciamento de erro de banco
  const licenseStatus = await getLicenseStatus();
  const branding = await getBranding();

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

  const rawColor = cookieStore?.get("nextwave-accent-color")?.value as AccentColor;
  const rawLayout = cookieStore?.get("nextwave-layout-theme")?.value as LayoutTheme;

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
          <SessionSecurityProvider>
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
          </SessionSecurityProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
