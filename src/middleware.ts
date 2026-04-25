import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function isIpAllowed(clientIp: string, allowedIps: string): boolean {
  if (!allowedIps || allowedIps.trim() === "*") return true;
  const allowed = allowedIps.split(",").map(ip => ip.trim()).filter(Boolean);
  return allowed.some(ip => ip === clientIp);
}

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isAuthPage = nextUrl.pathname === "/login";
  const isSetupRoute = nextUrl.pathname.startsWith("/setup") || nextUrl.pathname.startsWith("/api/setup");
  const isWebhook = nextUrl.pathname === "/api/whatsapp/webhook";
  const isWaEvents = nextUrl.pathname === "/api/whatsapp/events";
  const isLicenseValidate = nextUrl.pathname === "/api/plugin-licenses/validate";

  // 1. Permitir sempre rotas públicas
  if (isApiAuthRoute || isSetupRoute || isWebhook || isWaEvents || isLicenseValidate) {
    return NextResponse.next();
  }

  // 2. Redirecionar para login se não estiver logado
  if (!isLoggedIn && !isAuthPage) {
    // Se for a raiz, deixa a página tratar para evitar loops no redirecionamento do SASS
    if (nextUrl.pathname === "/") return NextResponse.next();
    
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // 4. Se estiver logado, verificar se o IP da sessão bate com o IP atual (Single-Location Restriction)
  if (isLoggedIn && !isAuthPage) {
    const sessionIp = (req.auth?.user as any)?.loginIp;
    const clientIp = getClientIp(req as any);

    // Se o IP mudou em relação ao login original, invalida o acesso
    if (sessionIp && sessionIp !== clientIp && sessionIp !== "unknown") {
       console.log(`[AUTH] IP Divergente Detectado: Sessão vinculada ao ${sessionIp}, acesso tentado do ${clientIp}`);
       const loginUrl = new URL("/login", nextUrl);
       loginUrl.searchParams.set("error", "session_conflict");
       return NextResponse.redirect(loginUrl);
    }

    const allowedIps = ((req.auth?.user as any)?.allowedIps as string) ?? "*";
    if (allowedIps !== "*") {
      const clientIp = getClientIp(req as any);
      if (!isIpAllowed(clientIp, allowedIps)) {
        // Desloga e redireciona com aviso
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("error", "ip_blocked");
        return NextResponse.redirect(loginUrl);
      }
    }
  }

  // 4. Se estiver logado e for para login, manda pro dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", nextUrl));
  }

  // 5. Redireciona /dashboard/* → /{orgSlug}/* quando o usuário tem orgSlug
  if (isLoggedIn && nextUrl.pathname.startsWith("/dashboard")) {
    const orgSlug = (req.auth?.user as any)?.orgSlug as string | null;
    if (orgSlug) {
      const subPath = nextUrl.pathname.replace(/^\/dashboard/, "") || "";
      const target = `/${orgSlug}${subPath}${nextUrl.search}`;
      return NextResponse.redirect(new URL(target, nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|api/setup|setup|_next/code|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
