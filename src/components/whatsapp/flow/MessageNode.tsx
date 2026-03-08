"use client";

import { Handle, Position } from "@xyflow/react";
import { MessageSquare, MoreHorizontal } from "lucide-react";

export function MessageNode({ data }: { data: any }) {
    return (
        <div className="whatsapp-node group">
            <div className="node-header">
                <MessageSquare className="h-3 w-3 text-primary" />
                <span>Mensagem</span>
                <MoreHorizontal className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="node-content italic">
                {data.label || "Digite a mensagem..."}
            </div>

            <Handle type="target" position={Position.Left} className="w-3 h-3 bg-primary border-2 border-background" />
            <Handle type="source" position={Position.Right} className="w-3 h-3 bg-primary border-2 border-background" />
        </div>
    );
}
