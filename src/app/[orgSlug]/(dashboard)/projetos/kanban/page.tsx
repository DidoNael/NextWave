import KanbanBoard from "@/components/kanban/KanbanBoard";

export default function KanbanPage() {
    return (
        <div className="p-6 h-[calc(100vh-64px)] overflow-hidden">
            <KanbanBoard />
        </div>
    );
}
