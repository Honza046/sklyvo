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
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { CrmKanbanSkeleton } from "@/components/crm/crm-table-skeleton";

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
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
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

  const valueTitle =
    "Součet odhadovaných cen dealů v této fázi. Cenu nastavíš při vytvoření nebo úpravě dealu.";

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onSelect}
      data-status={column.id}
      className={cn(
        "sk-crm-status",
        active && "sk-crm-status--active",
        isOver && "sk-crm-status--over",
      )}
    >
      <div className="sk-crm-status__top">
        <div className="sk-crm-status__label">
          <span className={cn("sk-crm-status__dot", column.dot)} aria-hidden />
          <span className="sk-crm-status__title">{column.title}</span>
        </div>
        <span className="sk-crm-status__count">{count}</span>
      </div>
      <p className="sk-crm-status__value" title={valueTitle}>
        {valueLabel}
      </p>
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
  const [activeColumn, setActiveColumn] = useState<KanbanColumnSpec | null>(
    null,
  );
  const [dragOverlayRect, setDragOverlayRect] = useState<{
    width: number;
    height: number;
  } | null>(null);
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

  const activeStat =
    columnStats.find((s) => s.col.id === activeColumnId) ?? columnStats[0];
  const selectedColumn = activeStat?.col ?? columns[0];
  const selectedLeads = activeStat?.leads ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 10 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      { lead?: KanbanLead; columnId?: string } | undefined;
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
              valueLabel={
                count === 0 ? "Prázdné" : `Hodnota: ${formatCurrency(valueSum)}`
              }
              active={col.id === activeColumnId}
              onSelect={() => setActiveColumnId(col.id)}
            />
          ))}
        </div>

        <p className="shrink-0 text-center text-[11px] text-muted-foreground">
          Kartu přetáhni na fázi nahoře a změní se stav.
          <br />
          Hodnota u fáze je součet odhadovaných cen dealů.
        </p>

        {isLoading ? (
          <CrmKanbanSkeleton />
        ) : selectedColumn ? (
          <div className="sk-data-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/60 bg-white shadow-sm">
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", selectedColumn.dot)}
                />
                <h3 className="truncate text-sm font-semibold uppercase tracking-wide">
                  {selectedColumn.title}
                </h3>
                <span className="text-sm text-muted-foreground">
                  · {selectedLeads.length}
                </span>
              </div>
              <div
                className="flex items-center text-xs font-semibold text-muted-foreground"
                title="Součet odhadovaných cen dealů v této fázi. Cenu nastavíš při vytvoření nebo úpravě dealu."
              >
                <Banknote className="mr-1 h-3.5 w-3.5 opacity-70" />
                Hodnota: {formatCurrency(activeStat?.valueSum ?? 0)}
              </div>
            </div>

            <div
              className={cn(
                "sk-data-panel__scroll scrollbar-hide min-h-0 flex-1 overflow-y-auto px-3 pb-3",
              )}
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {selectedLeads.map((lead) => (
                  <DraggableLeadCard
                    key={lead.id}
                    lead={lead}
                    column={selectedColumn}
                  >
                    {(drag) =>
                      renderLeadCard({
                        lead,
                        column: selectedColumn,
                        drag,
                        isDragOverlay: false,
                        onEdit: () => onEdit(lead),
                        onDelete: () => onDelete(lead.id),
                        onQuickStatus: (status) =>
                          onQuickStatus(lead.id, status),
                      })
                    }
                  </DraggableLeadCard>
                ))}
              </div>

              {selectedLeads.length === 0 && (
                <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl text-sm text-muted-foreground">
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
