import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  isCurrency?: boolean;
  iconColor?: string;
  iconBg?: string;
  description?: string;
}

export function KPICard({
  title,
  value,
  icon: Icon,
  change,
  isCurrency = false,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  description,
}: KPICardProps) {
  const formattedValue = isCurrency
    ? formatCurrency(Number(value))
    : value.toLocaleString("pt-BR");

  const isPositive = change !== undefined && change >= 0;

  return (
    <Card className="hover-lift">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {formattedValue}
            </p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {change !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium",
                isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              )}>
                {isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{isPositive ? "+" : ""}{change.toFixed(1)}% este mês</span>
              </div>
            )}
          </div>
          <div className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            iconBg
          )}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
