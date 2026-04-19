import { auth } from "./auth";
import { NextResponse } from "next/server";

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

  // 3. Se estiver logado, verificar restrição de IP
  if (isLoggedIn && !isAuthPage) {
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

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api/auth|_next/code|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
