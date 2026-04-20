import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { User, Briefcase, DollarSign } from "lucide-react";
import { Client } from "@/types";

interface ClientDashboardTabsProps {
  client: Client;
  renderCadastro: () => React.ReactNode;
  renderServicos: () => React.ReactNode;
  renderFinanceiro: () => React.ReactNode;
}

export function ClientDashboardTabs({ 
  client, 
  renderCadastro, 
  renderServicos, 
  renderFinanceiro 
}: ClientDashboardTabsProps) {
  return (
    <Tabs defaultValue="cadastro" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 p-1">
        <TabsTrigger value="cadastro" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Cadastro</span>
        </TabsTrigger>
        <TabsTrigger value="servicos" className="gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Serviíºos</span>
        </TabsTrigger>
        <TabsTrigger value="financeiro" className="gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Financeiro</span>
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="cadastro" className="space-y-4 animate-in">
        {renderCadastro()}
      </TabsContent>
      
      <TabsContent value="servicos" className="space-y-4 animate-in">
        {renderServicos()}
      </TabsContent>
      
      <TabsContent value="financeiro" className="space-y-4 animate-in">
        {renderFinanceiro()}
      </TabsContent>
    </Tabs>
  );
}

