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
import { useLanguage } from "@/context/LanguageContext";

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
  tint: string;
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
      <div className="sk-crm-status__row">
        <span
          className="sk-crm-status__dot"
          style={{
            background: column.tint,
            boxShadow: active ? `0 0 0 3px ${column.tint}29` : undefined,
          }}
          aria-hidden
        />
        <span className="sk-crm-status__title">{column.title}</span>
        <span className="sk-crm-status__count">{count}</span>
      </div>
      <div className="sk-crm-status__value" title={valueTitle}>
        {valueLabel}
      </div>
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
  const { t } = useLanguage();
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
      <div className="flex min-h-0 w-full flex-1 flex-col gap-3 pb-2">
        <div className="sk-crm-phases shrink-0">
          {columnStats.map(({ col, count, valueSum }) => (
            <DroppableStatusPill
              key={col.id}
              column={col}
              count={count}
              valueLabel={
                count === 0
                  ? t("crm.emptyPhase")
                  : t("crm.valueLabel", {
                      amount: formatCurrency(valueSum),
                    })
              }
              active={col.id === activeColumnId}
              onSelect={() => setActiveColumnId(col.id)}
            />
          ))}
        </div>

        <p className="sk-crm-board__hint shrink-0">{t("crm.dragHint")}</p>

        {isLoading ? (
          <CrmKanbanSkeleton />
        ) : selectedColumn ? (
          <div className="sk-crm-board flex min-h-0 flex-1 flex-col">
            <div className="sk-crm-board__head">
              <span
                className="sk-crm-board__dot"
                style={{ background: selectedColumn.tint }}
                aria-hidden
              />
              <span className="sk-crm-board__title">{selectedColumn.title}</span>
              <span className="sk-crm-board__count">· {selectedLeads.length}</span>
              <span className="sk-crm-board__spacer" aria-hidden />
              <span
                className="sk-crm-board__value"
                title={t("crm.valueTooltip")}
              >
                {t("crm.valueLabel", {
                  amount: formatCurrency(activeStat?.valueSum ?? 0),
                })}
              </span>
            </div>

            <div className="sk-crm-board__scroll scrollbar-hide min-h-0 flex-1 overflow-y-auto">
              {selectedLeads.length === 0 ? (
                <div className="sk-crm-board__empty">
                  V tomto stavu zatím nejsou žádné firmy.
                </div>
              ) : (
                <div className="sk-crm-board__grid">
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
