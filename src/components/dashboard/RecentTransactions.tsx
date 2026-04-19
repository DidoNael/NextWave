"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, getStatusLabel } from "@/lib/utils";
import { Transaction } from "@/types";
import { cn } from "@/lib/utils";

interface RecentTransactionsProps {
  transactions: Transaction[];
}

function getStatusVariant(status: string): "success" | "warning" | "destructive" | "secondary" {
  if (status === "pago") return "success";
  if (status === "pendente") return "warning";
  if (status === "cancelado") return "destructive";
  return "secondary";
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const pathname = usePathname();
  const base = `/${pathname.split("/")[1] || ""}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-base font-semibold">Últimas Transações</CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href={`${base}/financeiro`}>Ver todas</Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 px-6">
            Nenhuma transação encontrada
          </p>
        ) : (
          <div className="divide-y divide-border">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/30 transition-colors">
                <div className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  tx.type === "receita"
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}>
                  {tx.type === "receita" ? "+" : "-"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {tx.client?.name ?? tx.category} • {formatDate(tx.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={cn(
                    "text-sm font-semibold",
                    tx.type === "receita" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {tx.type === "receita" ? "+" : "-"}{formatCurrency(tx.amount)}
                  </p>
                  <Badge variant={getStatusVariant(tx.status)} className="text-[10px] h-4 mt-0.5">
                    {getStatusLabel(tx.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
