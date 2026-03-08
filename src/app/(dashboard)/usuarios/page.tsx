"use client";

import { useState, useEffect } from "react";
import {
    Users, UserPlus, Shield, Globe, Clock,
    MoreVertical, Edit, Trash2, CheckCircle2, XCircle,
    Search, Loader2, Plus
} from "lucide-react";
import { useSession } from "next-auth/react";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserRecord {
    id: string;
    name: string;
    email: string;
    role: string;
    allowedIps: string | null;
    workDayStart: string | null;
    workDayEnd: string | null;
    createdAt: string;
}

export default function UsuariosPage() {
    const { data: session } = useSession();
    const [users, setUsers] = useState<UserRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRecord | null>(null);

    // Form states
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "user",
        allowedIps: "*",
        workDayStart: "08:00",
        workDayEnd: "18:00",
    });

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/usuarios");
            if (!res.ok) throw new Error("Erro ao carregar usuários");
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            toast.error("Falha ao carregar lista de usuários");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleOpenModal = (user: UserRecord | null = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                name: user.name,
                email: user.email,
                password: "", // Senha em branco na edição
                role: user.role,
                allowedIps: user.allowedIps || "*",
                workDayStart: user.workDayStart || "08:00",
                workDayEnd: user.workDayEnd || "18:00",
            });
        } else {
            setEditingUser(null);
            setFormData({
                name: "",
                email: "",
                password: "",
                role: "user",
                allowedIps: "*",
                workDayStart: "08:00",
                workDayEnd: "18:00",
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const url = editingUser ? `/api/usuarios/${editingUser.id}` : "/api/usuarios";
            const method = editingUser ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Erro ao salvar usuário");
            }

            toast.success(editingUser ? "Usuário atualizado!" : "Usuário criado!");
            setIsModalOpen(false);
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

        try {
            const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Erro ao excluir");
            }
            toast.success("Usuário removido");
            fetchUsers();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestão de Usuários</h1>
                    <p className="text-muted-foreground mt-1">
                        Controle quem acessa o sistema e defina regras de segurança.
                    </p>
                </div>
                <Button onClick={() => handleOpenModal()} className="gap-2">
                    <UserPlus className="h-4 w-4" />
                    Novo Usuário
                </Button>
            </div>

            <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nome ou email..."
                            className="max-w-md h-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/50 text-muted-foreground">
                                    <th className="text-left py-3 px-4 font-medium">Usuário</th>
                                    <th className="text-left py-3 px-4 font-medium">Permissão</th>
                                    <th className="text-left py-3 px-4 font-medium">Segurança</th>
                                    <th className="text-left py-3 px-4 font-medium">Cadastro</th>
                                    <th className="text-right py-3 px-4 font-medium">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading && users.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center">
                                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center text-muted-foreground">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                ) : filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                                        <td className="py-4 px-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">{user.name}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                                                {user.role}
                                            </Badge>
                                        </td>
                                        <td className="py-4 px-4 text-xs">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Globe className="h-3 w-3" />
                                                    <span>IP: {user.allowedIps === "*" ? "Livre" : user.allowedIps}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                                    <Clock className="h-3 w-3" />
                                                    <span>Horário: {user.workDayStart} - {user.workDayEnd}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-xs text-muted-foreground">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleOpenModal(user)} className="gap-2">
                                                        <Edit className="h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(user.id)}
                                                        disabled={user.id === session?.user?.id}
                                                        className="text-red-600 focus:text-red-600 gap-2"
                                                    >
                                                        <Trash2 className="h-4 w-4" /> Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal Simplificado via CSS/Overlay por não saber se o componente Dialog está instalado corretamente */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-background w-full max-w-lg rounded-2xl border shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">{editingUser ? "Editar Usuário" : "Novo Usuário"}</h2>
                            <p className="text-sm text-muted-foreground">Configure as permissões e restrições de acesso.</p>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label>Nome Completo</Label>
                                    <Input
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label>Email</Label>
                                    <Input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label>Senha {editingUser && "(deixe em branco para manter)"}</Label>
                                    <Input
                                        type="password"
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label>Cargo / Permissão</Label>
                                    <select
                                        className="w-full p-2 rounded-md border text-sm bg-background"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="user">Usuário Comum</option>
                                        <option value="admin">Administrador Master</option>
                                    </select>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                                    <Shield className="h-4 w-4" />
                                    Regras de Segurança
                                </div>

                                <div className="space-y-2">
                                    <Label>IPs Permitidos (use * para todos ou separe por vírgula)</Label>
                                    <Input
                                        value={formData.allowedIps}
                                        onChange={(e) => setFormData({ ...formData, allowedIps: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Início do Turno</Label>
                                        <Input
                                            type="time"
                                            value={formData.workDayStart}
                                            onChange={(e) => setFormData({ ...formData, workDayStart: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fim do Turno</Label>
                                        <Input
                                            type="time"
                                            value={formData.workDayEnd}
                                            onChange={(e) => setFormData({ ...formData, workDayEnd: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    {editingUser ? "Salvar Alterações" : "Criar Usuário"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
