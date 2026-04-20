"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Briefcase,
  BarChart3, Calendar, Settings, ChevronLeft, ChevronRight, ChevronDown,
  Zap, Database, MessageSquare, Paintbrush, Clock, PieChart, Phone, Server, Key, Shield, Receipt,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useColorTheme } from "@/components/providers/ColorProvider";
import packageInfo from "../../../package.json";

const dashboardSubItems = [
  { href: "/dashboard/financeiro", label: "Financeiro", module: "financeiro" },
  { href: "/dashboard/clientes", label: "Clientes", module: "clientes" },
  { href: "/dashboard/whatsapp/chat", label: "Chat WhatsApp", module: "whatsapp" },
  { href: "/dashboard/whatsapp/fluxo", label: "Fluxo Automático", module: "whatsapp" },
];

type SubItem = { href: string; label: string; module?: string };
type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  module?: string;
  subItems?: SubItem[];
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, subItems: dashboardSubItems },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, module: "clientes" },
  { href: "/dashboard/usuarios", label: "Usuários", icon: Users },
  { href: "/dashboard/projetos/kanban", label: "Projetos", icon: Briefcase, module: "projetos" },
  { href: "/dashboard/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/dashboard/agenda", label: "Agenda", icon: Calendar, module: "agenda" },
  { href: "/dashboard/whatsapp/chat", label: "WhatsApp", icon: MessageSquare, module: "whatsapp" },
  { href: "/dashboard/configuracoes/pbx", label: "Telefonia", icon: Phone, module: "pbx" },
];

const bottomItemsBase = [
  { href: "/dashboard/configuracoes/aparencia", label: "Aparência", icon: Paintbrush, masterOnly: false },
  { href: "/dashboard/configuracoes/agendador", label: "Agendador", icon: Clock, masterOnly: false },
  { href: "/dashboard/configuracoes/mcp", label: "MCP Server", icon: Server, masterOnly: false },
  { href: "/dashboard/configuracoes/grupos", label: "Grupos", icon: Shield, masterOnly: false },
  { href: "/dashboard/configuracoes/nfe", label: "NFS-e", icon: Receipt, masterOnly: false },
  { href: "/dashboard/configuracoes/plugin-licenses", label: "Licenças Plugin", icon: Key, masterOnly: true },
  { href: "/dashboard/configuracoes", label: "Sistema", icon: Settings, masterOnly: false },
  { href: "/dashboard/configuracoes/manutencao", label: "Manutenção", icon: Database, masterOnly: false },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { layoutTheme } = useColorTheme();
  const { data: session } = useSession();
  const isMaster = (session?.user as any)?.role === "master";
  const [collapsed, setCollapsed] = useState(false);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const orgSlug = pathname.split("/")[1] || "";
  const base = orgSlug ? `/${orgSlug}` : "";
  const relativePath = base ? pathname.replace(base, "") || "/" : pathname;

  const bottomItems = bottomItemsBase.filter(item => !item.masterOnly || isMaster);
  const isProfessional = layoutTheme === "professional";

  useEffect(() => {
    if (relativePath.startsWith("/dashboard/")) setOpenMenus(prev => ({ ...prev, "/": true }));
    if (relativePath.startsWith("/financeiro")) setOpenMenus(prev => ({ ...prev, "/": true }));
  }, [relativePath]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "true");

    fetch("/api/sistema/modulos")
      .then(async res => {
        if (!res.ok) throw new Error("not ok");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data))
          setActiveModules(data.filter((m: { enabled: boolean }) => m.enabled).map((m: { key: string }) => m.key));
      })
      .catch(() => {
        setActiveModules(["clientes", "financeiro", "projetos", "servicos", "agenda", "usuarios", "whatsapp"]);
      });
  }, []);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  const toggleMenu = (href: string) => {
    setOpenMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.module) return true;
    return activeModules.includes(item.module);
  });

  function getLinkClass(isActive: boolean, isCollapsed: boolean) {
    if (isCollapsed) {
      return cn(
        "flex h-10 w-10 mx-auto items-center justify-center transition-all duration-200",
        isProfessional ? "rounded-none" : "rounded-xl",
        isActive
          ? isProfessional
            ? "bg-primary/10 text-primary"
            : "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      );
    }
    if (isProfessional) {
      return cn(
        "flex h-9 items-center gap-3 px-3 text-sm transition-colors border-l-2",
        isActive
          ? "border-primary bg-primary/5 text-foreground font-semibold"
          : "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      );
    }
    return cn(
      "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
      isActive
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    );
  }

  function renderNavItem(item: NavItem) {
    const fullHref = `${base}${item.href === "/" ? "" : item.href}` || "/";
    const isActive = relativePath === item.href || (item.href !== "/" && relativePath.startsWith(item.href));
    const Icon = item.icon;
    const hasSubItems = !!item.subItems?.length;
    const subActive = hasSubItems && item.subItems!.some(s => relativePath.startsWith(s.href));

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link href={fullHref} className={getLinkClass(isActive || subActive, true)} onClick={onClose}>
              <Icon className="h-4 w-4" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    if (hasSubItems) {
      const subs = item.subItems!.filter(s => !s.module || activeModules.includes(s.module));
      return (
        <div key={item.href}>
          <div className="flex items-center">
            <Link
              href={fullHref}
              className={cn(getLinkClass(isActive && !subActive, false), "flex-1 min-w-0")}
              onClick={onClose}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate flex-1">{item.label}</span>
            </Link>
            {subs.length > 0 && (
              <button
                onClick={() => toggleMenu(item.href)}
                className="h-9 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", openMenus[item.href] && "rotate-180")} />
              </button>
            )}
          </div>

          {openMenus[item.href] && subs.length > 0 && (
            <div className="ml-3 mt-0.5 mb-1 flex flex-col gap-0.5 border-l border-border/60 pl-3">
              {subs.map(sub => {
                const subFullHref = `${base}${sub.href}`;
                const isSubActive = relativePath.startsWith(sub.href);
                return (
                  <Link
                    key={sub.href}
                    href={subFullHref}
                    className={cn(
                      "flex h-8 items-center gap-2 rounded-md px-2 text-xs transition-colors",
                      isSubActive
                        ? "text-primary font-semibold bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    )}
                    onClick={onClose}
                  >
                    <PieChart className="h-3 w-3 shrink-0 opacity-70" />
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link key={item.href} href={fullHref} className={getLinkClass(isActive, false)} onClick={onClose}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  const userCard = (
    <div className={cn(
      "flex items-center gap-2.5 p-2 rounded-lg bg-muted/40 border border-border/60 hover:bg-muted/70 transition-colors cursor-pointer select-none w-full",
      collapsed && "justify-center px-1"
    )}>
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage src={session?.user?.image ?? ""} />
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
          {getInitials(session?.user?.name ?? "U")}
        </AvatarFallback>
      </Avatar>
      {!collapsed && (
        <div className="flex flex-col min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate leading-tight">{session?.user?.name}</p>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">{session?.user?.email}</p>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm sm:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-[hsl(var(--sidebar))] transition-all duration-300 ease-in-out sm:relative sm:flex",
          isProfessional ? "shadow-none" : "shadow-[4px_0_24px_rgba(0,0,0,0.05)]",
          collapsed ? "w-16" : "w-64",
          open ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn("flex h-16 items-center border-b border-border px-4 transition-all", collapsed ? "justify-center" : "gap-3")}>
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center bg-primary",
            isProfessional ? "rounded-none" : "rounded-lg shadow-lg shadow-primary/20"
          )}>
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className={cn("text-sm font-bold text-foreground leading-none", isProfessional && "font-black tracking-tight")}>NextWave</p>
              <p className="text-xs text-muted-foreground">CRM Pro</p>
            </div>
          )}
        </div>

        {/* Main Nav */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-2">
            {filteredNavItems.map(renderNavItem)}
          </nav>
        </ScrollArea>

        {/* Bottom Nav (settings) */}
        <div className="border-t border-border py-3">
          <nav className="flex flex-col gap-1 px-2">
            {bottomItems.map(item => {
              const fullHref = `${base}${item.href}`;
              const isActive = relativePath === item.href;
              const Icon = item.icon;
              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link href={fullHref} className={getLinkClass(isActive, true)} onClick={onClose}>
                        <Icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return (
                <Link key={item.href} href={fullHref} className={getLinkClass(isActive, false)} onClick={onClose}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card */}
        <div className="border-t border-border px-2 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>{userCard}</div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex flex-col gap-0.5">
                    <span className="font-medium">{session?.user?.name}</span>
                    <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div>{userCard}</div>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
              <DropdownMenuLabel className="font-normal py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session?.user?.image ?? ""} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                      {getInitials(session?.user?.name ?? "U")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <p className="text-sm font-semibold truncate">{session?.user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={`${base}/configuracoes/perfil`} className="flex items-center gap-2" onClick={onClose}>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4" />
                Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {!collapsed && (
            <p className="text-[10px] text-muted-foreground text-center opacity-40 mt-2">
              v{packageInfo.version}
            </p>
          )}
        </div>

        {/* Collapse toggle */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "absolute -right-3 top-20 z-10 h-6 w-6 border border-border bg-background shadow-md",
            isProfessional ? "rounded-none" : "rounded-full"
          )}
          onClick={toggleSidebar}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>
      </aside>
    </TooltipProvider>
  );
}
