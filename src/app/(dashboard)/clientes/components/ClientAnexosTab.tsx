"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Paperclip, Upload, Trash2, Download, FileText, FileImage, File, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Attachment {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

interface ClientAnexosTabProps {
  clientId: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className="h-5 w-5 text-blue-500" />;
  if (mimeType === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes("word") || mimeType.includes("text")) return <FileText className="h-5 w-5 text-indigo-500" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileText className="h-5 w-5 text-green-500" />;
  return <File className="h-5 w-5 text-slate-400" />;
}

export function ClientAnexosTab({ clientId }: ClientAnexosTabProps) {
  const [anexos, setAnexos] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [customName, setCustomName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchAnexos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/clientes/${clientId}/anexos`);
      const data = await res.json();
      setAnexos(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Erro ao carregar anexos");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchAnexos(); }, [fetchAnexos]);

  const uploadFile = async (file: File) => {
    if (uploading) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", customName || file.name);
      const res = await fetch(`/api/clientes/${clientId}/anexos`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Erro ao enviar arquivo");
        return;
      }
      toast.success("Arquivo enviado!");
      setCustomName("");
      fetchAnexos();
    } catch {
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/clientes/${clientId}/anexos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Anexo removido");
      setAnexos(prev => prev.filter(a => a.id !== id));
    } catch {
      toast.error("Erro ao remover anexo");
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = (anexo: Attachment) => {
    const a = document.createElement("a");
    a.href = `/api/clientes/${clientId}/anexos/${anexo.id}`;
    a.download = anexo.fileName;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/50">
        <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
          <Paperclip className="h-4 w-4 text-violet-500" />
          Enviar Anexo
        </h4>
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] uppercase text-muted-foreground">Nome do arquivo (opcional)</Label>
            <Input
              placeholder="Ex: Contrato de Prestação de Serviços"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              dragOver ? "border-violet-400 bg-violet-50 dark:bg-violet-950/20" : "border-border hover:border-violet-300 hover:bg-muted/30"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                <p className="text-sm text-muted-foreground">Enviando...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm font-medium">Arraste ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground">PDF, Imagens, Word, Excel, TXT — máx. 20MB</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.svg,.txt,.csv,.doc,.docx,.xls,.xlsx,.zip"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-border/50">
        <h4 className="text-sm font-bold flex items-center gap-2 mb-4">
          <File className="h-4 w-4 text-slate-500" />
          Arquivos ({anexos.length})
        </h4>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : anexos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum anexo cadastrado.</p>
        ) : (
          <div className="divide-y divide-border">
            {anexos.map(anexo => (
              <div key={anexo.id} className="flex items-center gap-3 py-3">
                <FileIcon mimeType={anexo.mimeType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{anexo.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(anexo.size)} · {formatDate(anexo.createdAt)}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600"
                    title="Abrir/Download" onClick={() => handleDownload(anexo)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-600"
                    title="Remover" disabled={deletingId === anexo.id}
                    onClick={() => handleDelete(anexo.id)}>
                    {deletingId === anexo.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
