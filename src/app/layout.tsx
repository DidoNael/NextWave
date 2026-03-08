import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ColorProvider } from "@/components/providers/ColorProvider";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NextWave CRM",
  description: "Sistema de gestão de clientes e projetos profissional",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <ColorProvider>
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
