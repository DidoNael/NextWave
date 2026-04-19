import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, getInitials } from "@/lib/utils";

interface TopClient {
  id: string;
  name: string;
  totalReceita: number;
  totalServicos: number;
}

interface TopClientsProps {
  clients: TopClient[];
}

export function TopClients({ clients }: TopClientsProps) {
  const maxReceita = Math.max(...clients.map((c) => c.totalReceita), 1);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold">Melhores Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {clients.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum cliente encontrado
            </p>
          ) : (
            clients.map((client, index) => (
              <div key={client.id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(client.name)}
                      </AvatarFallback>
                    </Avatar>
                    {index < 3 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[9px] text-primary-foreground font-bold">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.totalServicos} serviço{client.totalServicos !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-foreground shrink-0">
                    {formatCurrency(client.totalReceita)}
                  </p>
                </div>
                <Progress
                  value={(client.totalReceita / maxReceita) * 100}
                  className="h-1.5"
                />
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
