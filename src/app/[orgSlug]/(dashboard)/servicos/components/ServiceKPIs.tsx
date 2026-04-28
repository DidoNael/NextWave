import { Briefcase, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ServiceKPIsProps {
  total: number;
  totalAtivos: number;
  valorTotal: number;
  formatCurrency: (value: number) => string;
}

export function ServiceKPIs({ total, totalAtivos, valorTotal, formatCurrency }: ServiceKPIsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card className="hover-lift border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total de Serviços</p>
            <p className="text-2xl font-black">{total}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover-lift border-none shadow-sm bg-emerald-50/50 dark:bg-emerald-900/10">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
            <Briefcase className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Ativos</p>
            <p className="text-2xl font-black">{totalAtivos}</p>
          </div>
        </CardContent>
      </Card>
      
      <Card className="hover-lift border-none shadow-sm bg-purple-50/50 dark:bg-purple-900/10">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500 text-white shadow-lg shadow-purple-500/20">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Valor Total</p>
            <p className="text-2xl font-black">{formatCurrency(valorTotal)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
