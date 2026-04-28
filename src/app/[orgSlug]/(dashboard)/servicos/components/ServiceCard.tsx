import { Edit, Trash2, User, Briefcase, KeyRound } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Service } from "@/types";

interface ServiceCardProps {
  service: Service;
  statusConfig: Record<string, { label: string; variant: any }>;
  formatCurrency: (value: number) => string;
  onEdit: (service: Service) => void;
  onDelete: (id: string) => void;
}

export function ServiceCard({ service, statusConfig, formatCurrency, onEdit, onDelete }: ServiceCardProps) {
  const config = statusConfig[service.status] ?? { label: service.status, variant: "secondary" };
  
  return (
    <Card className="hover-lift group border-border/40 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm transition-all duration-300">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-2">
            <Badge variant={config.variant} className="rounded-full px-3 py-0.5 font-bold uppercase tracking-tighter text-[9px]">
              {config.label}
            </Badge>
            {(service as any).serviceType && (
              <Badge variant="outline" className="rounded-full px-2 py-0.5 font-medium lowercase tracking-tight text-[9px] border-border/60 bg-slate-50/50 dark:bg-slate-800/50">
                {(service as any).serviceType === "avulso" ? "Pgto Único" : (service as any).serviceType === "mensal" ? "Mensal" : "Outros"}
              </Badge>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {(service as any).category === "Plugin Grafana" && (
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-primary" asChild>
                <Link href={`/servicos/${service.id}`}>
                  <KeyRound className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onEdit(service)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => onDelete(service.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {service.title}
        </h3>
        
        {service.description && (
          <p className="text-xs text-muted-foreground mb-4 line-clamp-2 min-h-[2rem]">
            {service.description}
          </p>
        )}
        
        <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/40">
          <div className="min-w-0">
            {service.client && (
              <div className="flex items-center gap-1.5 mb-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full w-fit">
                <User className="h-3 w-3 text-indigo-500" />
                <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
                  {service.client?.name || "Cliente S/N"}
                </p>
              </div>
            )}
            {((service as any).billingFrequency || (service as any).serviceType) && (
              <div className="flex items-center gap-1 text-[9px] text-muted-foreground uppercase font-black tracking-widest ml-1">
                <Briefcase className="h-2.5 w-2.5" />
                {(service as any).billingFrequency || (service as any).serviceType}
              </div>
            )}
            {(service as any).dueDate && (
              <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-1 ml-1 uppercase tracking-tighter">
                Vence em: {new Date((service as any).dueDate).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>
          <p className="text-xl font-black text-primary ml-2 italic tracking-tighter">
            {formatCurrency(service.amount)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
