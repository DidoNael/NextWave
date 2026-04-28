"use client";

import { useState, useRef } from "react";
import { Upload, FileDown, AlertCircle, CheckCircle2, Loader2, X, Download } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface ImportClientsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function ImportClientsDialog({ open, onOpenChange, onSuccess }: ImportClientsDialogProps) {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<any[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    toast.error("O arquivo está vazio.");
                    return;
                }

                setFile(selectedFile);
                setPreview(json.slice(0, 5)); // Mostrar apenas os 5 primeiros
            } catch (error) {
                console.error("Erro ao ler arquivo:", error);
                toast.error("Erro ao processar arquivo. Verifique o formato.");
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleImport = async () => {
        if (!file) return;
        setLoading(true);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                // Mapeamento básico (ajuste conforme os headers do CSV/Excel)
                const mappedData = json.map((row: any) => ({
                    name: row.Nome || row.name || row["Nome Completo"],
                    email: row.Email || row.email || row["E-mail"],
                    phone: String(row.Telefone || row.phone || row["Celular"] || ""),
                    document: String(row.Documento || row.document || row["CPF/CNPJ"] || ""),
                    company: row.Empresa || row.company || row["Nome Fantasia"],
                    zipCode: String(row.CEP || row.zipCode || ""),
                    address: row.Endereco || row.address || row["Rua"],
                    number: String(row.Numero || row.number || ""),
                    complement: row.Complemento || row.complement || "",
                    neighborhood: row.Bairro || row.neighborhood || "",
                    city: row.Cidade || row.city || "",
                    state: row.Estado || row.state || row["UF"] || "",
                    notes: row.Notas || row.notes || row["Observações"] || "",
                    status: "ativo",
                })).filter(c => c.name); // Nome é obrigatório

                if (mappedData.length === 0) {
                    toast.error("Nenhum dado válido encontrado (Certifique-se que a coluna 'Nome' existe)");
                    setLoading(false);
                    return;
                }

                const res = await fetch("/api/clientes/import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(mappedData),
                });

                const result = await res.json();

                if (!res.ok) throw new Error(result.error || "Erro na importação");

                toast.success(result.message || "Importação concluída com sucesso!");
                onSuccess();
                onOpenChange(false);
                setFile(null);
                setPreview([]);
            };
            reader.readAsArrayBuffer(file);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const headers = ["Nome", "Email", "Telefone", "Documento", "Empresa", "CEP", "Endereco", "Numero", "Complemento", "Bairro", "Cidade", "Estado", "Notas"];
        const ws = XLSX.utils.aoa_to_sheet([headers]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, "template_importacao_clientes.xlsx");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Importar Clientes</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer relative"
                        onClick={() => fileRef.current?.click()}>
                        <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                        <p className="text-sm font-medium">Clique para selecionar ou arraste o arquivo</p>
                        <p className="text-xs text-muted-foreground mt-1">Excel (.xlsx) ou CSV</p>
                        <input type="file" ref={fileRef} className="hidden" accept=".xlsx, .xls, .csv" onChange={handleFileChange} />
                    </div>

                    {file && (
                        <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-sm font-medium">{file.name}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => { setFile(null); setPreview([]); }}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <div className="overflow-x-auto border rounded-md">
                                <table className="w-full text-[10px]">
                                    <thead className="bg-muted">
                                        <tr>
                                            {preview.length > 0 && Object.keys(preview[0]).map(k => (
                                                <th key={k} className="p-1 text-left whitespace-nowrap">{k}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {preview.map((row, i) => (
                                            <tr key={i} className="border-t">
                                                {Object.values(row).map((v: any, j) => (
                                                    <td key={j} className="p-1 truncate max-w-[100px]">{String(v)}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-[10px] text-muted-foreground italic">* Mostrando apenas os primeiros registros.</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4 border border-primary/10">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold">Ainda não tem o modelo?</p>
                            <p className="text-[10px] text-muted-foreground">Baixe nossa planilha modelo para garantir a importação correta.</p>
                        </div>
                        <Button variant="outline" size="sm" className="gap-2" onClick={downloadTemplate}>
                            <Download className="h-3 w-3" />
                            Modelo
                        </Button>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
                    <Button onClick={handleImport} disabled={!file || loading} className="gap-2">
                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {loading ? "Importando..." : "Confirmar Importação"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
