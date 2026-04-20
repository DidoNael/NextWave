import { Plus, Briefcase, ExternalLink, Edit, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface ClientServicosTabProps {
  services: any[];
  openCreateSvc: () => void;
  formatCurrency: (value: number) => string;
  onCancelSvc: (id: string) => void;
}

export function ClientServicosTab({
  services,
  openCreateSvc,
  formatCurrency,
  onCancelSvc
}: ClientServicosTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border/50">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Serviíºos & Oríºamentos</h3>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg font-bold" onClick={openCreateSvc}>
          <Plus className="h-4 w-4 mr-2" /> Novo Serviíºo
        </Button>
      </div>

      <div className="grid gap-4">
        {services.length > 0 ? (
          services.map((svc: any) => (
            <div key={svc.id} className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/50 hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <Briefcase className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{svc.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px] uppercase font-bold">{svc.status}</Badge>
                    <span className="text-[10px] text-muted-foreground font-medium uppercase">{svc.category || "Sem categoria"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-lg font-black text-blue-600">{formatCurrency(svc.amount)}</p>
                  {svc.endDate && (
                    <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground italic">
                      <Clock className="h-2.5 w-2.5" />
                      Previsão: {formatDate(svc.endDate)}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive"
                    onClick={() => onCancelSvc(svc.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-3xl opacity-60">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-sm font-medium">Nenhum serviíºo vinculado.</p>
            <Button variant="link" size="sm" className="text-blue-600 font-bold" onClick={openCreateSvc}>
              Cadastrar Agora
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

