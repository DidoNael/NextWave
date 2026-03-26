"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Briefcase,
  BarChart3, Calendar, Settings, ChevronLeft, ChevronRight, ChevronDown,
  Zap, Database, MessageSquare, Paintbrush, Clock, PieChart, Phone, Server, Key
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useColorTheme } from "@/components/providers/ColorProvider";
import packageInfo from "../../../package.json";

const dashboardSubItems = [
  { href: "/financeiro", label: "Financeiro", module: "financeiro" },
  { href: "/dashboard/clientes", label: "Clientes", module: "clientes" },
  { href: "/dashboard/whatsapp", label: "WhatsApp", module: "whatsapp" },
  { href: "/dashboard/pbx", label: "Telefonia", module: "pbx" },
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
  { href: "/clientes", label: "Clientes", icon: Users, module: "clientes" },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/projetos/kanban", label: "Projetos", icon: Briefcase, module: "projetos" },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/agenda", label: "Agenda", icon: Calendar, module: "agenda" },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare, module: "whatsapp" },
  { href: "/configuracoes/pbx", label: "Telefonia", icon: Phone, module: "pbx" },
];

const bottomItems = [
  { href: "/configuracoes/aparencia", label: "Aparência", icon: Paintbrush },
  { href: "/configuracoes/agendador", label: "Agendador", icon: Clock },
  { href: "/configuracoes/mcp", label: "MCP Server", icon: Server },
  { href: "/configuracoes/plugin-licenses", label: "Licenças Plugin", icon: Key },
  { href: "/configuracoes", label: "Sistema", icon: Settings },
  { href: "/configuracoes/manutencao", label: "Manutenção", icon: Database },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { layoutTheme } = useColorTheme();
  const isMaster = (session?.user as any)?.role === "master";
  const [collapsed, setCollapsed] = useState(false);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const isProfessional = layoutTheme === "professional";

  useEffect(() => {
    if (pathname.startsWith("/dashboard/")) setOpenMenus(prev => ({ ...prev, "/": true }));
    if (pathname.startsWith("/financeiro")) setOpenMenus(prev => ({ ...prev, "/": true }));
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) setCollapsed(saved === "true");

    fetch("/api/sistema/modulos")
      .then(res => res.json())
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

  const moduleMapping: Record<string, string> = {
    "/clientes": "clientes",
    "/financeiro": "financeiro",
    "/projetos": "projetos",
    "/servicos": "servicos",
    "/agenda": "agenda",
    "/usuarios": "usuarios",
    "/whatsapp": "whatsapp",
    "/configuracoes/pbx": "pbx",
  };

  const filteredNavItems = navItems.filter(item => {
    if (!item.module) return true;
    const key = moduleMapping[item.href];
    return !key || activeModules.includes(key);
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
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
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
    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
    const Icon = item.icon;
    const hasSubItems = !!item.subItems?.length;
    const subActive = hasSubItems && item.subItems!.some(s => pathname.startsWith(s.href));

    if (collapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>
            <Link href={item.href} className={getLinkClass(isActive || subActive, true)} onClick={onClose}>
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
              href={item.href}
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
                const isSubActive = pathname.startsWith(sub.href);
                return (
                  <Link
                    key={sub.href}
                    href={sub.href}
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
      <Link key={item.href} href={item.href} className={getLinkClass(isActive, false)} onClick={onClose}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      {/* Overlay Mobile */}
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
        <div className={cn("flex h-16 items-center border-b border-border px-4 transition-all", collapsed ? "justify-center" : "gap-3")}>
          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center bg-primary", isProfessional ? "rounded-none" : "rounded-lg shadow-lg shadow-primary/20")}>
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className={cn("text-sm font-bold text-foreground leading-none", isProfessional && "font-black tracking-tight")}>NextWave</p>
              <p className="text-xs text-muted-foreground">CRM Pro</p>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-2">
            {filteredNavItems.map(renderNavItem)}
          </nav>
        </ScrollArea>

        <div className="border-t border-border py-4">
          <nav className="flex flex-col gap-1 px-2">
            {bottomItems.filter(item => item.href === "/configuracoes/plugin-licenses" ? isMaster : true).map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link href={item.href} className={getLinkClass(isActive, true)} onClick={onClose}>
                        <Icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return (
                <Link key={item.href} href={item.href} className={getLinkClass(isActive, false)} onClick={onClose}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <Button
          variant="outline"
          size="icon"
          className={cn("absolute -right-3 top-20 z-10 h-6 w-6 border border-border bg-background shadow-md", isProfessional ? "rounded-none" : "rounded-full")}
          onClick={toggleSidebar}
        >
        </Button>

        {!collapsed && (
          <div className="px-4 py-2 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground font-medium text-center opacity-50">
              v{packageInfo.version} - CRM SASS
            </p>
          </div>
        )}
      </aside>
    </TooltipProvider>
  );
}
