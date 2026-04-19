"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, LogOut, User, Menu, Check } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getInitials } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
}

interface HeaderProps {
  title?: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const orgSlug = pathname.split("/")[1] || "";
  const base = orgSlug ? `/${orgSlug}` : "";
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Gerar notificações dinâmicas baseadas em dados reais
  const fetchNotifications = useCallback(async () => {
    try {
      const [txRes, evRes] = await Promise.all([
        fetch("/api/financeiro?limit=3"),
        fetch("/api/agenda?limit=3"),
      ]);

      const notifs: Notification[] = [];

      if (txRes.ok) {
        const txData = await txRes.json();
        const transactions = Array.isArray(txData) ? txData : txData.transactions || [];
        transactions.slice(0, 2).forEach((tx: any) => {
          if (tx.status === "pendente") {
            notifs.push({
              id: `tx-${tx.id}`,
              title: "Pagamento Pendente",
              description: `${tx.description} — R$ ${Number(tx.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
              time: tx.dueDate ? new Date(tx.dueDate).toLocaleDateString("pt-BR") : "Sem data",
              read: false,
            });
          }
        });
      }

      if (evRes.ok) {
        const events = await evRes.json();
        const evList = Array.isArray(events) ? events : [];
        evList.slice(0, 2).forEach((ev: any) => {
          if (ev.status === "agendado") {
            notifs.push({
              id: `ev-${ev.id}`,
              title: "Evento Agendado",
              description: ev.title,
              time: new Date(ev.startDate).toLocaleDateString("pt-BR"),
              read: false,
            });
          }
        });
      }

      if (notifs.length === 0) {
        notifs.push({
          id: "welcome",
          title: "Bem-vindo!",
          description: "Nenhuma notificação pendente no momento.",
          time: "Agora",
          read: true,
        });
      }

      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch {
      setNotifications([{
        id: "fallback",
        title: "Notificações",
        description: "Você está em dia! Nenhum alerta no momento.",
        time: "Agora",
        read: true,
      }]);
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-border bg-background/95 backdrop-blur px-6">
      {/* Mobile Menu Trigger */}
      <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Title */}
      {title && <h1 className="text-lg font-semibold text-foreground hidden md:block">{title}</h1>}

      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar clientes, serviços..." className="pl-9 h-8 bg-muted/50 border-0 focus-visible:ring-1" />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => { if (open) fetchNotifications(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background" />
              )}
              <span className="sr-only">Notificações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificações</span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={markAllRead}>
                  <Check className="h-3 w-3" /> Marcar lidas
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-[300px]">
              {notifications.map(n => (
                <DropdownMenuItem key={n.id} className="flex flex-col items-start gap-1 py-3 cursor-default">
                  <div className="flex items-center gap-2 w-full">
                    {!n.read && <div className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    <span className="text-sm font-semibold">{n.title}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{n.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground pl-4">{n.description}</p>
                </DropdownMenuItem>
              ))}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image ?? ""} />
                <AvatarFallback className="text-xs">
                  {getInitials(session?.user?.name ?? "U")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-semibold leading-none">{session?.user?.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href={`${base}/configuracoes/perfil`}>
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
            </Link>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
