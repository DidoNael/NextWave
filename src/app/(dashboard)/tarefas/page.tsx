"use client";

import { useState } from "react";
import { Plus, Search, Filter, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import KanbanBoard from "@/components/kanban/KanbanBoard";

export default function TarefasPage() {
  const [view, setView] = useState<"kanban" | "list">("kanban");

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.20))] gap-6 animate-in fade-in duration-700">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-[#121721] uppercase">
            Gestão de Tarefas
          </h1>
          <p className="text-muted-foreground text-sm font-medium">
            Gerencie e acompanhe o progresso das suas demandas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white/50 backdrop-blur-md p-1 rounded-xl border border-black/5 mr-2">
            <Button 
              variant={view === "kanban" ? "default" : "ghost"} 
              size="sm" 
              className="h-8 rounded-lg px-3"
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Kanban
            </Button>
            <Button 
              variant={view === "list" ? "default" : "ghost"} 
              size="sm" 
              className="h-8 rounded-lg px-3"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4 mr-2" />
              Lista
            </Button>
          </div>
          
          <Button className="bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20 rounded-xl h-10 px-6 font-bold uppercase tracking-widest text-xs">
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
          </Button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-white/40 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="PESQUISAR TAREFAS..." 
            className="pl-11 h-12 bg-white/50 rounded-2xl border-black/5 focus-visible:ring-primary/20 transition-all placeholder:text-[10px] placeholder:font-black placeholder:tracking-widest"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-12 px-5 rounded-2xl border-black/5 bg-white/50 font-bold text-xs uppercase tracking-widest gap-2">
            <Filter className="h-4 w-4" />
            Filtrar
          </Button>
        </div>
      </div>

      {/* Board Container */}
      <div className="flex-1 overflow-hidden">
        {view === "kanban" ? (
          <KanbanBoard />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground italic bg-white/20 rounded-3xl border border-dashed border-black/5">
            Vista de lista em desenvolvimento...
          </div>
        )}
      </div>
    </div>
  );
}
