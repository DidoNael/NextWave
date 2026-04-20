"use client";

import { useState, useCallback, useEffect } from "react";
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    Connection,
    Edge,
    Node,
    Panel
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./flow.css";
import { MessageNode } from "@/components/whatsapp/flow/MessageNode";
import { Button } from "@/components/ui/button";
import { Save, Play, Plus, Trash2, Settings2 } from "lucide-react";
import { toast } from "sonner";

const nodeTypes = {
    message: MessageNode,
};

const initialNodes: Node[] = [
    { id: '1', type: 'message', position: { x: 50, y: 150 }, data: { label: 'Olíí! Sou o assistente virtual. Como posso ajudar?' } },
];

export default function WhatsAppFlowPage() {
    const [id, setId] = useState<string | null>(null);
    const [nodes, setNodes] = useState<Node[]>(initialNodes);
    const [edges, setEdges] = useState<Edge[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadFlow() {
            try {
                const resp = await fetch("/api/whatsapp/fluxo");
                const flows = await resp.json();
                if (flows.length > 0) {
                    const active = flows[0];
                    setId(active.id);
                    setNodes(active.nodes as Node[]);
                    setEdges(active.edges as Edge[]);
                }
            } catch (err) {
                console.error("Erro ao carregar fluxo", err);
            } finally {
                setLoading(false);
            }
        }
        loadFlow();
    }, []);

    const onNodesChange = useCallback(
        (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
        []
    );

    const onEdgesChange = useCallback(
        (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        []
    );

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        []
    );

    const onSave = async () => {
        try {
            const resp = await fetch("/api/whatsapp/fluxo", {
                method: "POST",
                body: JSON.stringify({
                    id,
                    name: "Fluxo Principal",
                    nodes,
                    edges,
                    isActive: true
                })
            });

            if (!resp.ok) throw new Error();
            const saved = await resp.json();
            setId(saved.id);
            toast.success("Fluxo salvo com sucesso!");
        } catch (error) {
            toast.error("Erro ao salvar fluxo");
        }
    };

    const addNode = () => {
        const newNode: Node = {
            id: (nodes.length + 1).toString(),
            type: 'message',
            position: { x: 250, y: 200 },
            data: { label: 'Nova mensagem de resposta' },
        };
        setNodes((nds) => [...nds, newNode]);
    };

    return (
        <div className="h-[calc(100vh-140px)] w-full border border-border rounded-2xl overflow-hidden relative shadow-2xl">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
            >
                <Background />
                <Controls />

                <Panel position="top-right" className="flex gap-2 p-2 bg-card/80 backdrop-blur-sm border rounded-xl shadow-lg m-4">
                    <Button variant="outline" size="sm" onClick={addNode} className="gap-2">
                        <Plus className="h-4 w-4" /> Adicionar Bloco
                    </Button>
                    <Button variant="default" size="sm" onClick={onSave} className="gap-2">
                        <Save className="h-4 w-4" /> Salvar Alteraíºàes
                    </Button>
                </Panel>

                <Panel position="top-left" className="p-4 bg-card/80 backdrop-blur-sm border rounded-xl shadow-lg m-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-bold tracking-tight">Fluxo Atendimento I</span>
                    </div>
                    <Button variant="ghost" size="sm" className="justify-start gap-3 h-9 px-3 opacity-70 hover:opacity-100">
                        <Play className="h-4 w-4 text-emerald-500" /> Ativar Fluxo
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start gap-3 h-9 px-3 opacity-70 hover:opacity-100 text-destructive">
                        <Trash2 className="h-4 w-4" /> Excluir Tudo
                    </Button>
                    <Button variant="ghost" size="sm" className="justify-start gap-3 h-9 px-3 opacity-70 hover:opacity-100">
                        <Settings2 className="h-4 w-4" /> Configurar Variííveis
                    </Button>
                </Panel>
            </ReactFlow>
        </div>
    );
}

