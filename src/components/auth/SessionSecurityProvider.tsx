"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutos em ms
const CHECK_INTERVAL = 3 * 1000; // Verificar a cada 3 segundos para logout ultra-rápido

export function SessionSecurityProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status, update } = useSession();
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback((reason: string) => {
    toast.error(reason, { duration: 5000 });
    setTimeout(() => signOut({ callbackUrl: "/login" }), 1000);
  }, []);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    // Monitorar eventos de atividade
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));

    // Verificar inatividade e validade da sessão
    timerRef.current = setInterval(() => {
      const now = Date.now();
      
      // 1. Verificar Inatividade
      if (now - lastActivityRef.current > INACTIVITY_TIMEOUT) {
        clearInterval(timerRef.current!);
        handleLogout("Sessão expirada por inatividade.");
        return;
      }

      // 2. Forçar atualização silenciosa da sessão no NextAuth para verificar no Back-End
      update().catch(() => {});

      // 3. Verificar se o servidor marcou a sessão como inválida (Single Device Access)
      if (session?.user?.id === "INVALID") {
        clearInterval(timerRef.current!);
        handleLogout("Sua conta foi logada em outro dispositivo.");
        return;
      }
    }, CHECK_INTERVAL);


    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, session, handleLogout, resetTimer]);

  return <>{children}</>;
}
