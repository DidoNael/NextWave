"use client";

import { User, Mail, Phone, MapPin, Building2, FileText, QrCode, Save, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ClientCadastroTabProps {
  client: any;
  onSave?: (data: any) => void;
  onEdit?: () => void;
}

export function ClientCadastroTab({ client, onSave, onEdit }: ClientCadastroTabProps) {
  const router = useRouter();

  return (
    <div className="grid gap-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/50">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-indigo-500" />
              Informações Pessoais
            </h4>
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Nome Completo</Label>
                <p className="text-sm font-semibold">{client?.name}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">CPF / CNPJ</Label>
                <p className="text-sm font-semibold">{client?.document || "Não informado"}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Empresa</Label>
                <p className="text-sm font-semibold">{client?.company || "Autônomo / PF"}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/50">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4 text-emerald-500" />
              Contatos
            </h4>
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">E-mail</Label>
                <p className="text-sm font-semibold truncate">{client?.email || "N/A"}</p>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Telefones</Label>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{client?.phone || "N/A"}</p>
                  {client?.phone && (
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                        title="Ligar via PABX"
                        onClick={() => {
                          const num = client.phone.replace(/\D/g, '');
                          window.dispatchEvent(new CustomEvent('pbx:call', { detail: { number: num } }));
                        }}
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        title="Enviar WhatsApp"
                        onClick={() => {
                          const num = client.phone.replace(/\D/g, '');
                          router.push(`/whatsapp/chat?phone=${num}`);
                        }}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/50">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-amber-500" />
              Endereço
            </h4>
            <div className="space-y-3">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">CEP</Label>
                <p className="text-sm font-semibold">{client?.zipCode || "N/A"}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label className="text-[10px] uppercase text-muted-foreground">Logradouro</Label>
                  <p className="text-sm font-semibold">{client?.address || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Número</Label>
                  <p className="text-sm font-semibold">{client?.number || "S/N"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Bairro</Label>
                  <p className="text-sm font-semibold">{client?.neighborhood || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Complemento</Label>
                  <p className="text-sm font-semibold">{client?.complement || "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Cidade</Label>
                  <p className="text-sm font-semibold">{client?.city || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Estado</Label>
                  <p className="text-sm font-semibold">{client?.state || "N/A"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/50">
            <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-slate-500" />
              Observações Internas
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              {client?.notes || "Nenhuma observação cadastrada para este cliente."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" className="rounded-xl font-bold">
          <QrCode className="h-4 w-4 mr-2" /> Cartão Digital
        </Button>
        <Button size="sm" className="rounded-xl font-bold" onClick={onEdit}>
          <Save className="h-4 w-4 mr-2" /> Editar Dados
        </Button>
      </div>
    </div>
  );
}
