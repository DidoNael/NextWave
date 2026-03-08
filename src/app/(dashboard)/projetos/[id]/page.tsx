"use client";

import { useState, useEffect } from "react";
import {
    DragDropContext, Droppable, Draggable, DropResult
} from "@hello-pangea/dnd";
import {
    Plus, MoreHorizontal, Calendar, AlertCircle,
    Loader2, ChevronLeft, Layout
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Task {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    order: number;
}

interface Column {
    id: string;
    title: string;
    order: number;
    tasks: Task[];
}

interface ProjectData {
    id: string;
    name: string;
    columns: Column[];
}

const priorityColors: Record<string, string> = {
    baixa: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    media: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    alta: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function KanbanPage() {
    const { id } = useParams();
    const [project, setProject] = useState<ProjectData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddingTask, setIsAddingTask] = useState<string | null>(null);
    const [newTaskTitle, setNewTaskTitle] = useState("");

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projetos/${id}`);
            if (!res.ok) throw new Error("Erro ao carregar");
            const data = await res.json();
            setProject(data);
        } catch (error) {
            toast.error("Erro ao carregar projeto");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProject();
    }, [id]);

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        if (!project) return;

        // Local update for immediate feedback
        const sourceCol = project.columns.find(c => c.id === source.droppableId);
        const destCol = project.columns.find(c => c.id === destination.droppableId);

        if (!sourceCol || !destCol) return;

        const sourceTasks = Array.from(sourceCol.tasks);
        const [movedTask] = sourceTasks.splice(source.index, 1);

        if (source.droppableId === destination.droppableId) {
            sourceTasks.splice(destination.index, 0, movedTask);
            const newColumns = project.columns.map(col =>
                col.id === sourceCol.id ? { ...col, tasks: sourceTasks } : col
            );
            setProject({ ...project, columns: newColumns });
        } else {
            const destTasks = Array.from(destCol.tasks);
            destTasks.splice(destination.index, 0, movedTask);
            const newColumns = project.columns.map(col => {
                if (col.id === sourceCol.id) return { ...col, tasks: sourceTasks };
                if (col.id === destCol.id) return { ...col, tasks: destTasks };
                return col;
            });
            setProject({ ...project, columns: newColumns });
        }

        // Sync with backend
        try {
            await fetch("/api/tasks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: draggableId,
                    columnId: destination.droppableId,
                    order: destination.index
                })
            });
        } catch (error) {
            toast.error("Erro ao sincronizar posição");
            fetchProject(); // Revert on failure
        }
    };

    const handleCreateTask = async (columnId: string) => {
        if (!newTaskTitle.trim()) return;

        try {
            const res = await fetch("/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newTaskTitle,
                    columnId,
                    order: project?.columns.find(c => c.id === columnId)?.tasks.length || 0
                })
            });

            if (!res.ok) throw new Error();

            setNewTaskTitle("");
            setIsAddingTask(null);
            fetchProject();
            toast.success("Tarefa adicionada");
        } catch (error) {
            toast.error("Erro ao criar tarefa");
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">Sincronizando quadro...</p>
            </div>
        );
    }

    if (!project) return <div>Projeto não encontrado</div>;

    return (
        <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-500">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                    <Link href="/projetos">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Layout className="h-5 w-5 text-primary" />
                            {project.name}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchProject()}>Atualizar</Button>
                    <Button size="sm">Compartilhar</Button>
                </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-6 min-h-[70vh] items-start scrollbar-thin scrollbar-thumb-border">
                    {project.columns.map((column) => (
                        <div key={column.id} className="w-80 shrink-0 flex flex-col gap-3">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-sm">{column.title}</h3>
                                    <Badge variant="secondary" className="h-5 min-w-[20px] justify-center px-1 font-normal opacity-80">
                                        {column.tasks.length}
                                    </Badge>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </div>

                            <Droppable droppableId={column.id}>
                                {(provided, snapshot) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`flex flex-col gap-3 p-2 rounded-xl transition-colors min-h-[100px] ${snapshot.isDraggingOver ? "bg-muted/50 border-2 border-dashed border-primary/20" : "bg-muted/20 border-2 border-transparent"
                                            }`}
                                    >
                                        {column.tasks.map((task, index) => (
                                            <Draggable key={task.id} draggableId={task.id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        style={{ ...provided.draggableProps.style }}
                                                        className={`group bg-card border rounded-xl p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all ${snapshot.isDragging ? "shadow-2xl rotate-2 ring-2 ring-primary/20 bg-card/90 backdrop-blur" : ""
                                                            }`}
                                                    >
                                                        <div className="space-y-2">
                                                            {task.priority !== "media" && (
                                                                <Badge variant="outline" className={priorityColors[task.priority]}>
                                                                    {task.priority}
                                                                </Badge>
                                                            )}
                                                            <p className="text-sm font-medium leading-tight">{task.title}</p>
                                                            {task.description && (
                                                                <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
                                                            )}
                                                            <div className="flex items-center gap-2 pt-1">
                                                                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                                                                    <div className="h-2 w-2 rounded-full bg-primary/40" />
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tarefa #{task.id.slice(-4)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}

                                        {isAddingTask === column.id ? (
                                            <Card className="border-primary/50 shadow-lg animate-in slide-in-from-top-2">
                                                <CardContent className="p-3 space-y-3">
                                                    <Input
                                                        autoFocus
                                                        placeholder="Título da tarefa..."
                                                        value={newTaskTitle}
                                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                                        onKeyDown={(e) => e.key === "Enter" && handleCreateTask(column.id)}
                                                        className="bg-muted/50 border-0 focus-visible:ring-1"
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => setIsAddingTask(null)}>Cancelar</Button>
                                                        <Button size="sm" onClick={() => handleCreateTask(column.id)}>Adicionar</Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start text-muted-foreground bg-transparent hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-all py-6"
                                                onClick={() => setIsAddingTask(column.id)}
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Adicionar tarefa
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}

                    <Button
                        variant="outline"
                        className="w-80 shrink-0 border-dashed border-2 bg-muted/5 min-h-[100px] flex flex-col gap-2 rounded-xl text-muted-foreground hover:border-primary/30 hover:bg-muted/10 transition-all py-8"
                    >
                        <Plus className="h-5 w-5" />
                        Adicionar Coluna
                    </Button>
                </div>
            </DragDropContext>
        </div>
    );
}
