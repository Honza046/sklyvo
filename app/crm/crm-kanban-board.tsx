"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Banknote } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
  faviconUrl?: string | null;
};

function columnIdToLeadStatus(columnId: string): string | null {
  const map: Record<string, string> = {
    new: "NEW",
    contacted: "CONTACTED",
    follow_up: "REPLIED",
    communication: "MEETING_SET",
    agreed: "CLOSED_WON",
    rejected: "CLOSED_LOST",
    breakup: "BREAK_UP",
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

  const style: CSSProperties = isDragging
    ? {
        opacity: 0.35,
        filter: "grayscale(0.4)",
        transition: "opacity 120ms ease, filter 120ms ease",
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

function DroppableStatusPill({
  column,
  count,
  valueLabel,
  active,
  onSelect,
}: {
  column: KanbanColumnSpec;
  count: number;
  valueLabel: string;
  active: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      className={cn(
        "flex min-w-0 w-full flex-col rounded-xl border px-2.5 py-2 text-left transition-all",
        "shadow-sm outline-none",
        column.color,
        active && "z-10 border-blue-500 ring-2 ring-blue-500/40",
        isOver && "z-10 scale-[1.02] border-blue-600 ring-2 ring-blue-600/50",
        !active && !isOver && "hover:border-foreground/30",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", column.dot)} />
          <span className="truncate text-[10px] font-bold uppercase tracking-wide">{column.title}</span>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{count}</span>
      </div>
      <p className="mt-1 truncate text-[10px] opacity-75">{valueLabel}</p>
    </button>
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

  const [activeColumnId, setActiveColumnId] = useState(columns[0]?.id ?? "new");
  const [activeLead, setActiveLead] = useState<L | KanbanLead | null>(null);
  const [activeColumn, setActiveColumn] = useState<KanbanColumnSpec | null>(null);
  const [dragOverlayRect, setDragOverlayRect] = useState<{ width: number; height: number } | null>(
    null,
  );
  const didInitColumnRef = useRef(false);

  const columnStats = useMemo(
    () =>
      columns.map((col) => {
        const columnLeads = leads.filter((l) => l.status === col.id);
        const valueSum = columnLeads.reduce((sum, lead) => sum + lead.value, 0);
        return { col, count: columnLeads.length, valueSum, leads: columnLeads };
      }),
    [columns, leads],
  );

  // Jen při prvním načtení skoč na stav, kde už něco je — dál nech uživateli klikat i na 0.
  useEffect(() => {
    if (didInitColumnRef.current) return;
    if (leads.length === 0) return;
    const withLeads = columnStats.find((s) => s.count > 0);
    if (withLeads) setActiveColumnId(withLeads.col.id);
    didInitColumnRef.current = true;
  }, [columnStats, leads.length]);

  const activeStat = columnStats.find((s) => s.col.id === activeColumnId) ?? columnStats[0];
  const selectedColumn = activeStat?.col ?? columns[0];
  const selectedLeads = activeStat?.leads ?? [];

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
    setActiveColumnId(targetColumnId);
  };

  const handleDragCancel = () => {
    setActiveLead(null);
    setActiveColumn(null);
    setDragOverlayRect(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 pb-2 pt-1">
        <div className="grid shrink-0 grid-cols-2 gap-2 p-0.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {columnStats.map(({ col, count, valueSum }) => (
            <DroppableStatusPill
              key={col.id}
              column={col}
              count={count}
              valueLabel={count === 0 ? "Prázdné" : formatCurrency(valueSum)}
              active={col.id === activeColumnId}
              onSelect={() => setActiveColumnId(col.id)}
            />
          ))}
        </div>

        <p className="shrink-0 text-center text-[11px] text-muted-foreground">
          Přetáhni kartu na jiné políčko nahoře = změna stavu.
        </p>

        {isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm font-semibold text-muted-foreground">
            Načítám dealy...
          </div>
        ) : selectedColumn ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full", selectedColumn.dot)} />
                <h3 className="truncate text-sm font-semibold uppercase tracking-wide">
                  {selectedColumn.title}
                </h3>
                <span className="text-sm text-muted-foreground">· {selectedLeads.length}</span>
              </div>
              <div className="flex items-center text-xs font-semibold text-muted-foreground">
                <Banknote className="mr-1 h-3.5 w-3.5 opacity-70" />
                {formatCurrency(activeStat?.valueSum ?? 0)}
              </div>
            </div>

            <div
              className={cn(
                "scrollbar-hide min-h-0 flex-1 space-y-2 overflow-y-auto p-3",
              )}
            >
              {selectedLeads.map((lead) => (
                <DraggableLeadCard key={lead.id} lead={lead} column={selectedColumn}>
                  {(drag) =>
                    renderLeadCard({
                      lead,
                      column: selectedColumn,
                      drag,
                      isDragOverlay: false,
                      onEdit: () => onEdit(lead),
                      onDelete: () => onDelete(lead.id),
                      onQuickStatus: (status) => onQuickStatus(lead.id, status),
                    })
                  }
                </DraggableLeadCard>
              ))}

              {selectedLeads.length === 0 && (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border border-dashed border-border/40 text-sm text-muted-foreground">
                  V tomto stavu zatím nejsou žádné firmy.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <DragOverlay zIndex={10_000} dropAnimation={null}>
        {activeLead && activeColumn ? (
          <div
            className={cn(
              "pointer-events-none box-border rounded-xl opacity-70 grayscale-[25%]",
              dragOverlayRect?.width ? "" : "w-[min(320px,calc(100vw-48px))]",
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
