"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, DollarSign, Briefcase,
  BarChart3, Calendar, Settings, ChevronLeft, ChevronRight,
  Zap, Database, User, Shield, MessageSquare, Paintbrush, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/usuarios", label: "Usuários", icon: Users },
  { href: "/projetos", label: "Projetos", icon: Briefcase },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/servicos", label: "Serviços", icon: Briefcase },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/whatsapp", label: "WhatsApp", icon: MessageSquare },
];

const bottomItems = [
  { href: "/configuracoes/aparencia", label: "Aparência", icon: Paintbrush },
  { href: "/configuracoes/agendador", label: "Agendador", icon: Clock },
  { href: "/configuracoes", label: "Sistema", icon: Settings },
  { href: "/configuracoes/manutencao", label: "Manutenção", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [activeModules, setActiveModules] = useState<string[]>([]);

  // Carregar estado inicial do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) {
      setCollapsed(saved === "true");
    }

    // Carregar módulos ativos
    fetch("/api/sistema/modulos")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setActiveModules(data.filter(m => m.enabled).map(m => m.key));
        }
      })
      .catch(() => {
        // Se a API falhar, habilitamos tudo por padrão para não travar o usuário
        const allKeys = ["clientes", "financeiro", "projetos", "servicos", "agenda", "usuarios", "whatsapp"];
        setActiveModules(allKeys);
      });
  }, []);

  const toggleSidebar = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  // Mapear itens de navegação para as chaves dos módulos
  const moduleMapping: Record<string, string> = {
    "/clientes": "clientes",
    "/financeiro": "financeiro",
    "/projetos": "projetos",
    "/servicos": "servicos",
    "/agenda": "agenda",
    "/usuarios": "usuarios",
    "/whatsapp": "whatsapp",
  };

  const filteredNavItems = navItems.filter(item => {
    if (item.href === "/") return true; // Sempre mostrar Dashboard
    const moduleKey = moduleMapping[item.href];
    return !moduleKey || activeModules.includes(moduleKey);
  });

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative hidden flex-col border-r border-border bg-[hsl(var(--sidebar))] transition-all duration-300 ease-in-out sm:flex shadow-[4px_0_24px_rgba(0,0,0,0.05)]",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className={cn(
          "flex h-16 items-center border-b border-border px-4 transition-all",
          collapsed ? "justify-center" : "gap-3"
        )}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <p className="text-sm font-bold text-foreground leading-none">NextWave</p>
              <p className="text-xs text-muted-foreground">CRM Pro</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="flex flex-col gap-1 px-2">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const Icon = item.icon;

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex h-10 w-10 mx-auto items-center justify-center rounded-xl transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="animate-fade-in truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Bottom Navigation */}
        <div className="border-t border-border py-4">
          <nav className="flex flex-col gap-1 px-2">
            {bottomItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              if (collapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex h-10 w-10 mx-auto items-center justify-center rounded-xl transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                            : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="animate-fade-in truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Collapse Toggle */}
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-md"
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </aside>
    </TooltipProvider>
  );
}
