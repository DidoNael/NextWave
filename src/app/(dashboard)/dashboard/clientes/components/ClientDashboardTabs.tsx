import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Briefcase, DollarSign, Receipt } from "lucide-react";
import { Client } from "@/types";

interface ClientDashboardTabsProps {
  client: Client;
  renderCadastro: () => React.ReactNode;
  renderServicos: () => React.ReactNode;
  renderFinanceiro: () => React.ReactNode;
  renderNfse: () => React.ReactNode;
}

export function ClientDashboardTabs({ 
  client, 
  renderCadastro, 
  renderServicos, 
  renderFinanceiro,
  renderNfse
}: ClientDashboardTabsProps) {
  return (
    <Tabs defaultValue="cadastro" className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-6 bg-muted/50 p-1">
        <TabsTrigger value="cadastro" className="gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Cadastro</span>
        </TabsTrigger>
        <TabsTrigger value="servicos" className="gap-2">
          <Briefcase className="h-4 w-4" />
          <span className="hidden sm:inline">Serviços</span>
        </TabsTrigger>
        <TabsTrigger value="financeiro" className="gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">Financeiro</span>
        </TabsTrigger>
        <TabsTrigger value="nfse" className="gap-2">
          <Receipt className="h-4 w-4" />
          <span className="hidden sm:inline">NFS-e</span>
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

      <TabsContent value="nfse" className="space-y-4 animate-in">
        {renderNfse()}
      </TabsContent>
    </Tabs>
  );
}
