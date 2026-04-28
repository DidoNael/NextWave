"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Send, Bug, ChevronDown, ChevronRight } from "lucide-react";

interface Step {
  step: string;
  ok: boolean;
  detail: string;
}

export default function NfseDebugPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [xmlFinal, setXmlFinal] = useState<string | null>(null);
  const [showXml, setShowXml] = useState(false);
  const [ran, setRan] = useState(false);

  const run = async (sendToGinfes: boolean) => {
    setLoading(true);
    setSteps([]);
    setXmlFinal(null);
    setRan(false);
    try {
      const res = await fetch("/api/nfse/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendToGinfes }),
      });
      const data = await res.json();
      setSteps(data.steps || []);
      setXmlFinal(data.xmlFinal || null);
      setRan(true);
    } catch (e: any) {
      setSteps([{ step: "Conexão com API", ok: false, detail: e.message }]);
      setRan(true);
    } finally {
      setLoading(false);
    }
  };

  const allOk = steps.length > 0 && steps.every(s => s.ok);
  const lastFailed = steps.find(s => !s.ok);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bug className="h-5 w-5 text-amber-500" />
            Diagnóstico NFS-e
          </h1>
          <p className="text-sm text-muted-foreground">Testa certificado, assinatura XML e comunicação com Ginfes</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Executar Diagnóstico</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button onClick={() => run(false)} disabled={loading} variant="outline" className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bug className="h-4 w-4" />}
            Testar Assinatura
          </Button>
          <Button onClick={() => run(true)} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Testar + Enviar ao Ginfes
          </Button>
        </CardContent>
      </Card>

      {ran && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Resultado</CardTitle>
              {allOk ? (
                <span className="text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Tudo OK</span>
              ) : (
                <span className="text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Falhou</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className={`flex gap-3 p-3 rounded-lg border text-sm ${s.ok ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}`}>
                {s.ok
                  ? <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  : <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${s.ok ? "text-green-800" : "text-red-800"}`}>{s.step}</p>
                  <p className={`text-xs mt-0.5 break-words ${s.ok ? "text-green-700" : "text-red-700"}`}>{s.detail}</p>
                </div>
              </div>
            ))}

            {!allOk && lastFailed && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <p className="font-semibold mb-1">O que fazer:</p>
                {lastFailed.step.includes('certificado') && <p>Verifique se o arquivo .pfx e a senha estão corretos em Configurações → NFS-e.</p>}
                {lastFailed.step.includes('Assinar') && <p>Erro na assinatura XML. Detalhes: <code className="bg-amber-100 px-1 rounded">{lastFailed.detail}</code></p>}
                {lastFailed.step.includes('Ginfes') && <p>Assinatura OK, mas o Ginfes rejeitou. Verifique os dados fiscais (CNPJ, inscrição municipal) em Configurações → NFS-e.</p>}
              </div>
            )}

            {xmlFinal && (
              <div className="mt-4">
                <button
                  onClick={() => setShowXml(v => !v)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showXml ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                  {showXml ? "Ocultar" : "Ver"} XML assinado
                </button>
                {showXml && (
                  <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-96 border">
                    {xmlFinal}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
