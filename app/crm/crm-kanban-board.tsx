"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Banknote } from "lucide-react";
import { useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Při tažení s DragOverlay ponechá zdroj v layoutu; kopii tahá overlay (@dnd-kit doporučení). */
export type KanbanDragProps = {
  ref: (el: HTMLElement | null) => void;
  style: CSSProperties;
  attributes: ReturnType<typeof useDraggable>["attributes"];
  listeners: ReturnType<typeof useDraggable>["listeners"];
  isDragging: boolean;
};

export type KanbanColumnSpec = {
  id: string;
  title: string;
  color: string;
  dot: string;
};

export type KanbanLead = {
  id: string;
  company: string;
  url: string;
  status: string;
  leadStatus: string;
  date: string;
  value: number;
  avatar: string;
};

function columnIdToLeadStatus(columnId: string): string | null {
  const map: Record<string, string> = {
    new: "NEW",
    contacted: "CONTACTED",
    follow_up: "REPLIED",
    communication: "MEETING_SET",
    agreed: "CLOSED_WON",
    rejected: "CLOSED_LOST",
  };
  return map[columnId] ?? null;
}

function DraggableLeadCard<L extends KanbanLead>({
  lead,
  column,
  children,
}: {
  lead: L;
  column: KanbanColumnSpec;
  children: (drag: KanbanDragProps) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead, columnId: column.id },
  });

  // S DragOverlay nedáváme transform na zdroj — ten zůstává jako stabilní zástupce se stejnou šíří.
  const style: CSSProperties = isDragging
    ? {
        opacity: 0.5,
        transition: "opacity 120ms ease",
      }
    : {
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        position: "relative",
      };

  return (
    <>
      {children({
        ref: setNodeRef,
        style,
        attributes,
        listeners,
        isDragging,
      })}
    </>
  );
}

function DroppableColumnBody({
  columnId,
  className,
  children,
}: {
  columnId: string;
  className?: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isOver &&
          "rounded-xl bg-blue-500/[0.07] outline outline-2 outline-blue-500/35 -outline-offset-1",
      )}
    >
      {children}
    </div>
  );
}

export function CrmKanbanBoard<L extends KanbanLead>(props: {
  columns: KanbanColumnSpec[];
  leads: L[];
  isLoading: boolean;
  formatCurrency: (amount: number) => string;
  onLeadMoved: (leadId: string, columnId: string) => void;
  renderLeadCard: (args: {
    lead: L;
    column: KanbanColumnSpec;
    /** null = kopie jen pro DragOverlay (vizuálně stejná, bez draggable vazeb) */
    drag: KanbanDragProps | null;
    isDragOverlay?: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onQuickStatus: (status: string) => void;
  }) => ReactNode;
  onEdit: (lead: L) => void;
  onDelete: (leadId: string) => void;
  onQuickStatus: (leadId: string, status: string) => void;
}) {
  const {
    columns,
    leads,
    isLoading,
    formatCurrency,
    onLeadMoved,
    renderLeadCard,
    onEdit,
    onDelete,
    onQuickStatus,
  } = props;

  const [activeLead, setActiveLead] = useState<L | KanbanLead | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumnSpec | null>(null);
  const [dragOverlayRect, setDragOverlayRect] = useState<{ width: number; height: number } | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as { lead?: KanbanLead; columnId?: string } | undefined;
    if (data?.lead) {
      setActiveLead(data.lead);
      const col = columns.find((c) => c.id === data.columnId);
      setActiveColumn(col ?? null);
    }
    const initial = event.active.rect.current?.initial;
    if (initial && initial.width > 0) {
      setDragOverlayRect({ width: initial.width, height: initial.height });
    } else {
      requestAnimationFrame(() => {
        const r = event.active.rect.current?.initial;
        if (r && r.width > 0) {
          setDragOverlayRect({ width: r.width, height: r.height });
        }
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    setActiveColumn(null);
    setDragOverlayRect(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const targetColumnId = String(over.id);
    const nextDb = columnIdToLeadStatus(targetColumnId);
    if (!nextDb) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.leadStatus === nextDb) return;

    onLeadMoved(leadId, targetColumnId);
  };

  const handleDragCancel = () => {
    setActiveLead(null);
    setActiveColumn(null);
    setDragOverlayRect(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex w-full min-h-0 flex-1 gap-4 pb-4 pt-2 overflow-x-auto snap-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {isLoading && (
          <div className="col-span-full rounded-2xl border border-border/60 bg-card p-6 text-sm font-semibold text-muted-foreground">
            Načítám dealy...
          </div>
        )}
        {!isLoading &&
          columns.map((col) => {
            const columnLeads = leads.filter((l) => l.status === col.id);
            const columnValue = columnLeads.reduce((sum, lead) => sum + lead.value, 0);

            return (
              <div
                key={col.id}
                className="flex h-full min-h-0 w-[300px] sm:w-[320px] shrink-0 snap-center flex-col gap-3"
              >
                <div className="flex flex-col rounded-xl bg-card border border-border/60 p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 truncate">
                      <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full shadow-sm", col.dot)} />
                      <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider truncate">
                        {col.title}
                      </h3>
                    </div>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {columnLeads.length}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-muted-foreground/80 flex items-center">
                    <Banknote className="h-3 w-3 mr-1.5 opacity-70" />
                    {formatCurrency(columnValue)}
                  </div>
                </div>

                <DroppableColumnBody
                  columnId={col.id}
                  className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-border/30 bg-muted/30 p-2 pb-4 pr-1 min-h-[220px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  {columnLeads.map((lead) => (
                    <DraggableLeadCard key={lead.id} lead={lead} column={col}>
                      {(drag) =>
                        renderLeadCard({
                          lead,
                          column: col,
                          drag,
                          isDragOverlay: false,
                          onEdit: () => onEdit(lead),
                          onDelete: () => onDelete(lead.id),
                          onQuickStatus: (status) => onQuickStatus(lead.id, status),
                        })
                      }
                    </DraggableLeadCard>
                  ))}

                  {columnLeads.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full min-h-[180px] rounded-xl border-2 border-dashed border-border/40 py-6 text-center opacity-60">
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                        Žádné dealy
                      </p>
                    </div>
                  )}
                </DroppableColumnBody>
              </div>
            );
          })}
      </div>

      <DragOverlay zIndex={10_000} dropAnimation={null}>
        {activeLead && activeColumn ? (
          <div
            className={cn(
              "pointer-events-none box-border rounded-xl opacity-[0.98]",
              dragOverlayRect?.width ? "" : "w-[calc(320px-1rem)] max-w-[min(284px,calc(100vw-48px))]",
            )}
            style={
              dragOverlayRect
                ? {
                    width: dragOverlayRect.width,
                    minHeight: dragOverlayRect.height,
                  }
                : undefined
            }
          >
            {renderLeadCard({
              lead: activeLead as L,
              column: activeColumn,
              drag: null,
              isDragOverlay: true,
              onEdit: () => {},
              onDelete: () => {},
              onQuickStatus: () => {},
            })}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
