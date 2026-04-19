"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search, LogOut, User, Menu, Check, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

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

function formatNotifTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const orgSlug = pathname.split("/")[1] || "";
  const base = orgSlug ? `/${orgSlug}` : "";
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
              time: tx.dueDate ? new Date(tx.dueDate).toISOString() : new Date().toISOString(),
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
              time: ev.startDate ?? new Date().toISOString(),
              read: false,
            });
          }
        });
      }

      if (notifs.length === 0) {
        notifs.push({
          id: "welcome",
          title: "Tudo em dia!",
          description: "Nenhuma notificação pendente no momento.",
          time: new Date().toISOString(),
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
        time: new Date().toISOString(),
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

  const clearRead = () => {
    setNotifications(prev => prev.filter(n => !n.read));
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 px-6 backdrop-blur-xl bg-background/90 border-b border-border shadow-sm transition-all duration-300">
      {/* Left: mobile menu + search */}
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="h-9 w-9 sm:hidden rounded-full" onClick={onMenuClick}>
          <Menu className="h-5 w-5" />
        </Button>

        {title && <h1 className="text-base font-semibold text-foreground hidden md:block">{title}</h1>}

        <div className="flex-1 max-w-sm">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Buscar clientes, projetos..."
              className="pl-10 h-9 rounded-full bg-muted/50 border-border/60 focus-visible:ring-primary/20 transition-all placeholder:text-xs"
            />
          </div>
        </div>
      </div>

      {/* Right: notifications + theme + user */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu onOpenChange={(open) => { if (open) fetchNotifications(); }}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 relative rounded-full border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors">
              <Bell className="h-4 w-4" strokeWidth={1.8} />
              {unreadCount > 0 && (
                <span className="absolute top-[9px] right-[9px] h-[7px] w-[7px] rounded-full bg-destructive border-[1.5px] border-background" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between py-2.5">
              <span className="font-bold">Notificações</span>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={markAllRead}>
                    <Check className="h-3 w-3" /> Marcar lidas
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={clearRead}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="max-h-[320px]">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Tudo em dia! Nenhuma notificação.
                </div>
              ) : (
                notifications.map(n => (
                  <DropdownMenuItem
                    key={n.id}
                    className={cn(
                      "flex flex-col items-start gap-0.5 py-2.5 px-3 cursor-default rounded-lg mx-1 my-0.5",
                      !n.read ? "bg-muted/50" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {!n.read && <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                      <span className="text-xs font-semibold flex-1">{n.title}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{formatNotifTime(n.time)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 pl-3.5">{n.description}</p>
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image ?? ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {getInitials(session?.user?.name ?? "U")}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="font-normal py-2.5">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={session?.user?.image ?? ""} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    {getInitials(session?.user?.name ?? "U")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="text-sm font-semibold leading-none truncate">{session?.user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground truncate mt-0.5">{session?.user?.email}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`${base}/configuracoes/perfil`} className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Meu Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
