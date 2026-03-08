"use client";

import { useState, useEffect } from "react";
import {
    Briefcase, Plus, Search, Folder, Calendar,
    ChevronRight, MoreVertical, Trash2
} from "lucide-react";
import Link from "next/link";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Project {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    createdAt: string;
    _count: {
        columns: number;
    };
}

export default function ProjetosPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        color: "#3b82f6",
    });

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/projetos");
            if (!res.ok) throw new Error("Erro ao carregar projetos");
            const data = await res.json();
            setProjects(data);
        } catch (error) {
            toast.error("Falha ao carregar projetos");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/projetos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error("Erro ao criar projeto");

            toast.success("Projeto criado com sucesso!");
            setIsModalOpen(false);
            setFormData({ name: "", description: "", color: "#3b82f6" });
            fetchProjects();
        } catch (error) {
            toast.error("Erro ao criar projeto");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Excluir este projeto e todas as suas tarefas?")) return;
        try {
            const res = await fetch(`/api/projetos/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Erro ao excluir");
            toast.success("Projeto excluído");
            fetchProjects();
        } catch (error) {
            toast.error("Erro ao excluir projeto");
        }
    };

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Projetos</h1>
                    <p className="text-muted-foreground mt-1">Gerencie seus fluxos de trabalho e tarefas.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Projeto
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-md">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar projetos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <div className="col-span-full text-center py-20 text-muted-foreground">Carregando projetos...</div>
                ) : filteredProjects.length === 0 ? (
                    <div className="col-span-full text-center py-20 border rounded-xl border-dashed">
                        <Folder className="h-12 w-12 mx-auto text-muted-foreground opacity-20 transition-all" />
                        <p className="mt-4 text-muted-foreground">Nenhum projeto encontrado.</p>
                        <Button variant="link" onClick={() => setIsModalOpen(true)}>Criar meu primeiro projeto</Button>
                    </div>
                ) : filteredProjects.map((project) => (
                    <Card key={project.id} className="group hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden">
                        <div
                            className="absolute top-0 left-0 w-1 h-full"
                            style={{ backgroundColor: project.color || '#3b82f6' }}
                        />
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <Link href={`/projetos/${project.id}`} className="flex-1">
                                    <CardTitle className="group-hover:text-primary transition-colors">{project.name}</CardTitle>
                                    <CardDescription className="line-clamp-1 mt-1">{project.description || "Sem descrição"}</CardDescription>
                                </Link>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                            className="text-red-600 focus:text-red-600 gap-2"
                                            onClick={() => handleDelete(project.id)}
                                        >
                                            <Trash2 className="h-4 w-4" /> Excluir
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" />
                                    <span>{project._count.columns} colunas</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <Link href={`/projetos/${project.id}`}>
                                <Button variant="secondary" className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                    Abrir Kanban <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background w-full max-w-md rounded-2xl border shadow-2xl p-6 space-y-4">
                        <h2 className="text-xl font-bold">Criar Novo Projeto</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nome do Projeto</Label>
                                <Input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Cor de Identificação</Label>
                                <div className="flex gap-2">
                                    {["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"].map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            className={`h-8 w-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-primary scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                            onClick={() => setFormData({ ...formData, color: c })}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Criar Projeto</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
