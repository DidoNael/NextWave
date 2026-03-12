import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { cookies } from "next/headers";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ColorProvider } from "@/components/providers/ColorProvider";
import { Toaster } from "sonner";
import "./globals.css";

// Removendo Google Fonts para evitar timeouts no build Docker ARM64
// const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextWave CRM",
  description: "Sistema de gestão de clientes e projetos profissional",
};

type AccentColor = "blue" | "orange" | "green" | "purple" | "rose";
type LayoutTheme = "default" | "professional";

const VALID_COLORS: AccentColor[] = ["blue", "orange", "green", "purple", "rose"];
const VALID_LAYOUTS: LayoutTheme[] = ["default", "professional"];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
    } catch (e) {
      console.error("Erro ao carregar tema do banco no layout", e);
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
            </ColorProvider>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
