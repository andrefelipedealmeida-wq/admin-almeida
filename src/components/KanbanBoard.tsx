import React, { useState, useMemo } from 'react';
import {
  CalendarEvent,
  Client,
  Case,
  SubEvent
} from '../types';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Flag,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle,
  Gavel,
  User,
  Trash2,
  Edit,
  Eye,
  Plus,
  Search,
  ListFilter,
  DollarSign,
  Users,
  Bell,
  ListChecks,
  Grid,
  TrendingUp,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { sortSubEvents, countSubEvents } from '../pages/admin/AgendaPage';

// Priority order and styling
export const ALL_PRIORITIES = ['Fatal', 'Urgente', 'Alta', 'Média', 'Baixa'] as const;
export type PriorityType = typeof ALL_PRIORITIES[number];

const priorityConfig: Record<PriorityType, {
  label: string;
  badgeBg: string;
  border: string;
  columnHeaderBg: string;
  columnHeaderBorder: string;
  dotColor: string;
  textColor: string;
}> = {
  Fatal: {
    label: 'Fatal',
    badgeBg: 'bg-red-950/80 text-red-300 border-red-500/40',
    border: 'border-l-red-600',
    columnHeaderBg: 'bg-red-950/40',
    columnHeaderBorder: 'border-red-900/50',
    dotColor: 'bg-red-500',
    textColor: 'text-red-400'
  },
  Urgente: {
    label: 'Urgente',
    badgeBg: 'bg-orange-950/80 text-orange-300 border-orange-500/40',
    border: 'border-l-orange-500',
    columnHeaderBg: 'bg-orange-950/40',
    columnHeaderBorder: 'border-orange-900/50',
    dotColor: 'bg-orange-500',
    textColor: 'text-orange-400'
  },
  Alta: {
    label: 'Alta',
    badgeBg: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
    border: 'border-l-rose-500',
    columnHeaderBg: 'bg-rose-950/30',
    columnHeaderBorder: 'border-rose-900/40',
    dotColor: 'bg-rose-400',
    textColor: 'text-rose-400'
  },
  Média: {
    label: 'Média',
    badgeBg: 'bg-amber-950/70 text-amber-300 border-amber-500/30',
    border: 'border-l-amber-500',
    columnHeaderBg: 'bg-amber-950/30',
    columnHeaderBorder: 'border-amber-900/40',
    dotColor: 'bg-amber-400',
    textColor: 'text-amber-400'
  },
  Baixa: {
    label: 'Baixa',
    badgeBg: 'bg-blue-950/60 text-blue-300 border-blue-500/30',
    border: 'border-l-blue-500',
    columnHeaderBg: 'bg-blue-950/30',
    columnHeaderBorder: 'border-blue-900/40',
    dotColor: 'bg-blue-400',
    textColor: 'text-blue-400'
  }
};

const impreterivelConfig: Record<string, {
  label: string;
  columnHeaderBg: string;
  columnHeaderBorder: string;
  dotColor: string;
  textColor: string;
}> = {
  impreterivel: {
    label: 'Impreterível',
    columnHeaderBg: 'bg-yellow-950/40',
    columnHeaderBorder: 'border-yellow-900/50',
    dotColor: 'bg-yellow-400',
    textColor: 'text-yellow-300'
  },
  regular: {
    label: 'Não Impreterível (Comum)',
    columnHeaderBg: 'bg-neutral-900/90',
    columnHeaderBorder: 'border-neutral-800',
    dotColor: 'bg-neutral-400',
    textColor: 'text-neutral-300'
  }
};

interface LargeKanbanCardProps {
  evt: CalendarEvent;
  onSelectDetails: (evt: CalendarEvent) => void;
  onStartEdit: (evt: CalendarEvent) => void;
  onToggleComplete: (evt: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onToggleSubEvent: (evt: CalendarEvent, subId: string) => void;
  onMoveToToday: (evt: CalendarEvent) => void;
  onToggleImpreterivel: (evt: CalendarEvent) => void;
  isOverlay?: boolean;
}

export function LargeKanbanCard({
  evt,
  onSelectDetails,
  onStartEdit,
  onToggleComplete,
  onDeleteEvent,
  onToggleSubEvent,
  onMoveToToday,
  onToggleImpreterivel,
  isOverlay = false
}: LargeKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: evt.id, data: { event: evt } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  const isCompleted = evt.status === 'Concluído' || evt.executionStatus === 'concluido';
  const subCount = evt.subEvents ? countSubEvents(evt.subEvents) : { total: 0, completed: 0 };
  const subPercent = subCount.total > 0 ? Math.round((subCount.completed / subCount.total) * 100) : 0;

  // Format date DD/MM/YYYY
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Type styling
  const getTypeBadge = () => {
    switch (evt.type) {
      case 'audiência':
        return { label: 'Audiência', color: 'bg-orange-950/60 text-orange-400 border-orange-500/30', icon: Gavel };
      case 'prazo':
        return { label: 'Prazo', color: 'bg-red-950/60 text-red-400 border-red-500/30', icon: Clock };
      case 'reunião':
        return { label: 'Reunião', color: 'bg-blue-950/60 text-blue-400 border-blue-500/30', icon: Users };
      case 'lembrete':
        return { label: 'Lembrete', color: 'bg-yellow-950/60 text-yellow-400 border-yellow-500/30', icon: Bell };
      case 'tarefa':
        return { label: 'Tarefa', color: 'bg-purple-950/60 text-purple-400 border-purple-500/30', icon: ListChecks };
      case 'financeiro':
        return { label: 'Financeiro', color: 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30', icon: DollarSign };
      default:
        return { label: 'Outro', color: 'bg-neutral-800 text-neutral-300 border-neutral-700', icon: Grid };
    }
  };

  const typeInfo = getTypeBadge();
  const TypeIcon = typeInfo.icon;

  const priorityKey = (evt.priority || 'Média') as PriorityType;
  const pStyle = priorityConfig[priorityKey] || priorityConfig['Média'];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border text-neutral-200 transition-all select-none ${
        isOverlay ? 'shadow-2xl ring-2 ring-emerald-500 cursor-grabbing bg-neutral-900 border-neutral-700' : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 hover:shadow-lg'
      } ${
        evt.impreterivel ? 'border-l-4 border-l-yellow-400 shadow-yellow-500/5' : `${pStyle.border} border-l-4`
      } ${isCompleted ? 'opacity-65 bg-neutral-950/70' : ''} p-4 space-y-3 font-sans`}
    >
      {/* Top Header: Drag Handle + Badges */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-neutral-500 hover:text-neutral-300 rounded hover:bg-neutral-800 transition-colors"
            title="Segure para arrastar este evento entre as colunas"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Type Badge */}
          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase border ${typeInfo.color}`}>
            <TypeIcon className="w-3 h-3" />
            <span>{typeInfo.label}</span>
          </span>

          {/* Priority Badge */}
          {evt.priority && (
            <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wider uppercase border ${pStyle.badgeBg} ${
              evt.priority === 'Fatal' ? 'animate-pulse ring-1 ring-red-500/50' : ''
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pStyle.dotColor}`} />
              <span>{evt.priority}</span>
            </span>
          )}

          {/* Impreterível Flag Badge */}
          {evt.impreterivel && (
            <span className="inline-flex items-center space-x-1 bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider shadow-sm">
              <Flag className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              <span>IMPRETERÍVEL</span>
            </span>
          )}
        </div>

        {/* Date and Time Badge */}
        <div className="flex items-center space-x-1.5 shrink-0 text-[11px] font-mono">
          <span className="flex items-center space-x-1 text-neutral-400 bg-neutral-950 border border-neutral-850 px-2 py-0.5 rounded-md">
            <CalendarIcon className="w-3 h-3 text-emerald-500" />
            <span>{formatDateBR(evt.date)}</span>
          </span>
          {evt.time && (
            <span className="flex items-center space-x-1 text-neutral-300 bg-neutral-950 border border-neutral-850 px-2 py-0.5 rounded-md font-bold">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{evt.time}</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Title - Large and Prominent */}
      <div>
        <h4
          onClick={() => onSelectDetails(evt)}
          className={`text-sm font-bold tracking-tight text-neutral-100 hover:text-emerald-400 cursor-pointer transition-colors leading-snug ${
            isCompleted ? 'line-through text-neutral-400' : ''
          }`}
          title="Clique para abrir detalhes do compromisso"
        >
          {evt.title}
        </h4>

        {/* Client & Legal Case link */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
          {evt.caseTitle && (
            <span
              className="inline-flex items-center space-x-1 text-[11px] text-amber-400/90 bg-amber-950/30 border border-amber-900/40 px-2 py-0.5 rounded"
              title={`Processo vinculado: ${evt.caseTitle}`}
            >
              <Gavel className="w-3 h-3 text-amber-400" />
              <span className="truncate max-w-[170px]">{evt.caseTitle}</span>
            </span>
          )}

          {evt.clientName && (
            <span
              className="inline-flex items-center space-x-1 text-[11px] text-emerald-400/90 bg-emerald-950/30 border border-emerald-900/40 px-2 py-0.5 rounded"
              title={`Cliente: ${evt.clientName}`}
            >
              <User className="w-3 h-3 text-emerald-400" />
              <span className="truncate max-w-[150px]">{evt.clientName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Description Body */}
      {evt.description && (
        <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-850/80 text-xs text-neutral-300 leading-relaxed font-sans">
          <p className="line-clamp-3 whitespace-pre-wrap">{evt.description}</p>
        </div>
      )}

      {/* Interactive Subtasks / Checklist */}
      {evt.subEvents && evt.subEvents.length > 0 && (
        <div className="bg-neutral-950/70 p-3 rounded-lg border border-neutral-850 space-y-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-[10px] uppercase font-bold tracking-wider text-neutral-400 flex items-center space-x-1">
              <ListChecks className="w-3 h-3 text-emerald-500" />
              <span>Checklist ({subCount.completed}/{subCount.total})</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-emerald-400">{subPercent}%</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${subPercent}%` }}
            />
          </div>

          {/* Subtasks items */}
          <div className="space-y-1.5 pt-1 max-h-36 overflow-y-auto">
            {sortSubEvents(evt.subEvents).map((sub: SubEvent) => (
              <label
                key={sub.id}
                className="flex items-start space-x-2 text-xs text-neutral-300 cursor-pointer hover:text-white transition-colors group/item"
              >
                <input
                  type="checkbox"
                  checked={sub.completed}
                  onChange={() => onToggleSubEvent(evt, sub.id)}
                  className="mt-0.5 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-0 cursor-pointer"
                />
                <span className={`flex-1 break-words leading-tight ${sub.completed ? 'line-through text-neutral-400' : 'text-neutral-200'} ${sub.important ? 'font-semibold text-amber-300' : ''}`}>
                  {sub.title}
                </span>
                {sub.important && (
                  <Flag className="w-3 h-3 text-amber-400 fill-amber-400/20 shrink-0 mt-0.5" />
                )}
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Logs/Notes preview if present */}
      {evt.logs && evt.logs.length > 0 && (
        <div className="text-[10px] bg-neutral-950/40 px-2.5 py-1.5 rounded border border-neutral-850 text-neutral-400 flex items-center justify-between">
          <span className="truncate italic">
            "{evt.logs[0].text}"
          </span>
          <span className="shrink-0 text-[9px] font-mono text-neutral-400 ml-2">
            {evt.logs[0].createdAt}
          </span>
        </div>
      )}

      {/* Card Action Footer */}
      <div className="pt-2 border-t border-neutral-850 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {/* Complete / Reopen */}
          <button
            type="button"
            onClick={() => onToggleComplete(evt)}
            className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
              isCompleted
                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/40'
                : 'bg-neutral-800/80 text-neutral-300 hover:bg-emerald-600 hover:text-white'
            }`}
            title={isCompleted ? "Reabrir compromisso" : "Marcar como Concluído"}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{isCompleted ? 'Concluído' : 'Concluir'}</span>
          </button>

          {/* Move to Today */}
          <button
            type="button"
            onClick={() => onMoveToToday(evt)}
            className="p-1 px-2 rounded-md bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-white hover:border-neutral-700 text-[11px] font-mono transition-colors cursor-pointer"
            title="Reagendar este evento para o dia de hoje"
          >
            Hoje
          </button>

          {/* Toggle Impreterivel */}
          <button
            type="button"
            onClick={() => onToggleImpreterivel(evt)}
            className={`p-1 rounded-md transition-colors cursor-pointer ${
              evt.impreterivel
                ? 'text-yellow-400 bg-yellow-950/60 border border-yellow-500/40'
                : 'text-neutral-500 hover:text-yellow-400 hover:bg-neutral-800'
            }`}
            title={evt.impreterivel ? "Remover urgência IMPRETERÍVEL" : "Marcar como IMPRETERÍVEL"}
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-1">
          {/* Details */}
          <button
            type="button"
            onClick={() => onSelectDetails(evt)}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Abrir painel lateral com histórico e detalhes completos"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => onStartEdit(evt)}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Editar compromisso"
          >
            <Edit className="w-4 h-4" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Tem certeza que deseja excluir o compromisso "${evt.title}"?`)) {
                onDeleteEvent(evt.id);
              }
            }}
            className="p-1 rounded-md text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Excluir compromisso"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Droppable Kanban Column
interface DroppableKanbanColumnProps {
  id: string;
  title: string;
  count: number;
  headerBg: string;
  headerBorder: string;
  dotColor: string;
  textColor: string;
  events: CalendarEvent[];
  onSelectDetails: (evt: CalendarEvent) => void;
  onStartEdit: (evt: CalendarEvent) => void;
  onToggleComplete: (evt: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onToggleSubEvent: (evt: CalendarEvent, subId: string) => void;
  onMoveToToday: (evt: CalendarEvent) => void;
  onToggleImpreterivel: (evt: CalendarEvent) => void;
  onAddEventInColumn?: (colId: string) => void;
}

function DroppableKanbanColumn({
  id,
  title,
  count,
  headerBg,
  headerBorder,
  dotColor,
  textColor,
  events,
  onSelectDetails,
  onStartEdit,
  onToggleComplete,
  onDeleteEvent,
  onToggleSubEvent,
  onMoveToToday,
  onToggleImpreterivel,
  onAddEventInColumn
}: DroppableKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-neutral-925/80 border rounded-2xl overflow-hidden min-w-[320px] max-w-[420px] flex-1 transition-all ${
        isOver
          ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-950/10'
          : 'border-neutral-800/80 bg-neutral-950/40'
      }`}
    >
      {/* Column Header */}
      <div className={`p-3.5 border-b flex items-center justify-between ${headerBg} ${headerBorder}`}>
        <div className="flex items-center space-x-2">
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${textColor}`}>
            {title}
          </h3>
          <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-300">
            {count}
          </span>
        </div>

        {onAddEventInColumn && (
          <button
            type="button"
            onClick={() => onAddEventInColumn(id)}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title={`Adicionar novo compromisso em ${title}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Cards List in Column */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto min-h-[400px] max-h-[calc(100vh-280px)]">
        <SortableContext items={events.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {events.length > 0 ? (
            events.map((evt) => (
              <LargeKanbanCard
                key={evt.id}
                evt={evt}
                onSelectDetails={onSelectDetails}
                onStartEdit={onStartEdit}
                onToggleComplete={onToggleComplete}
                onDeleteEvent={onDeleteEvent}
                onToggleSubEvent={onToggleSubEvent}
                onMoveToToday={onMoveToToday}
                onToggleImpreterivel={onToggleImpreterivel}
              />
            ))
          ) : (
            <div className="h-44 border-2 border-dashed border-neutral-850 rounded-xl flex flex-col items-center justify-center p-4 text-center text-neutral-400">
              <span className="text-xs">Nenhum evento neste quadro</span>
              <span className="text-[11px] mt-1 text-neutral-400">Arraste um evento para cá</span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

/**
 * Normalizes event date strings to standard YYYY-MM-DD
 * Supports ISO (YYYY-MM-DD), Brazilian formats (DD/MM/YYYY, DD-MM-YYYY),
 * slashes (YYYY/MM/DD), timestamps, and values with space/time.
 */
export const normalizeEventDate = (d?: string | null | any): string => {
  if (!d) return '';
  let str = String(d).trim();
  if (!str) return '';

  // If ISO with time or space with time
  if (str.includes('T')) str = str.split('T')[0].trim();
  if (str.includes(' ')) str = str.split(' ')[0].trim();

  // Handle slash formats: DD/MM/YYYY or YYYY/MM/DD
  if (str.includes('/')) {
    const parts = str.split('/').map(p => p.trim());
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${y}-${m}-${day}`;
      } else {
        // DD/MM/YYYY or D/M/YYYY
        const day = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${y}-${m}-${day}`;
      }
    }
  }

  // Handle dash formats: DD-MM-YYYY or YYYY-MM-DD
  if (str.includes('-')) {
    const parts = str.split('-').map(p => p.trim());
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${y}-${m}-${day}`;
      } else {
        // DD-MM-YYYY or D-M-YYYY
        const day = parts[0].padStart(2, '0');
        const m = parts[1].padStart(2, '0');
        const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        return `${y}-${m}-${day}`;
      }
    }
  }

  return str;
};

/**
 * Checks if an event is completed across all status and executionStatus variations
 */
export const isEventCompleted = (e: CalendarEvent): boolean => {
  const s = (e.status || '').toLowerCase().trim();
  const es = (e.executionStatus || '').toLowerCase().trim();
  return (
    s === 'concluído' ||
    s === 'concluido' ||
    s === 'finalizado' ||
    es === 'concluído' ||
    es === 'concluido' ||
    es === 'finalizado'
  );
};

/**
 * Robust matching for event types including accents, case-insensitivity and "outros"
 */
export const matchEventType = (e: CalendarEvent, filter: string | null): boolean => {
  if (!filter) return true;
  if (filter === 'impreterivel') return !!e.impreterivel;
  const t = (e.type || '').toLowerCase().trim();
  if (filter === 'outro') {
    return (
      t === 'outro' ||
      t === 'outros' ||
      !['audiência', 'audiencia', 'reunião', 'reuniao', 'prazo', 'lembrete', 'tarefa', 'financeiro'].includes(t)
    );
  }
  if (filter === 'audiência') return t === 'audiência' || t === 'audiencia';
  if (filter === 'reunião') return t === 'reunião' || t === 'reuniao';
  return t === filter.toLowerCase().trim();
};

export interface KanbanBoardProps {
  events: CalendarEvent[];
  clients?: Client[];
  cases?: Case[];
  selectedDayStr: string | null;
  onUpdateEvent: (evtId: string, updates: Partial<CalendarEvent>) => Promise<void>;
  onSelectEventDetails: (evt: CalendarEvent) => void;
  onStartEdit: (evt: CalendarEvent) => void;
  onToggleComplete: (evt: CalendarEvent) => void;
  onDeleteEvent: (id: string) => void;
  onToggleSubEvent: (evt: CalendarEvent, subId: string) => void;
  onMoveToToday: (evt: CalendarEvent) => void;
  onToggleImpreterivel: (evt: CalendarEvent) => void;
  onAddNewEventWithDefaults?: (defaults: Partial<CalendarEvent>) => void;
  activeTypeFilter: string | null;
  setActiveTypeFilter: (filter: string | null) => void;
  hideCompleted?: boolean;
  setHideCompleted?: (hide: boolean) => void;
  agendaScope?: 'day' | 'month' | 'all' | 'unscheduled';
  setAgendaScope?: (scope: 'day' | 'month' | 'all' | 'unscheduled') => void;
}

export default function KanbanBoard({
  events,
  clients = [],
  cases = [],
  selectedDayStr,
  onUpdateEvent,
  onSelectEventDetails,
  onStartEdit,
  onToggleComplete,
  onDeleteEvent,
  onToggleSubEvent,
  onMoveToToday,
  onToggleImpreterivel,
  onAddNewEventWithDefaults,
  activeTypeFilter,
  setActiveTypeFilter,
  hideCompleted: propHideCompleted,
  setHideCompleted: propSetHideCompleted,
  agendaScope,
  setAgendaScope
}: KanbanBoardProps) {
  // Classification mode: 'urgencia' | 'impreterivel'
  const [groupingMode, setGroupingMode] = useState<'urgencia' | 'impreterivel'>('urgencia');

  // Dynamic columns toggle: show only priorities that have events, or all
  const [showOnlyPresentPriorities, setShowOnlyPresentPriorities] = useState(true);

  // Manually revealed columns if user clicks "+ Adicionar Coluna"
  const [manuallyRevealedPriorities, setManuallyRevealedPriorities] = useState<string[]>([]);

  // Date scope filter: 'all' | 'today' | 'selectedDay' - defaults to 'today' (or synced with agendaScope)
  const [dateScope, setDateScope] = useState<'all' | 'today' | 'selectedDay'>(() => {
    if (agendaScope === 'all') return 'all';
    return 'today';
  });

  // Sync dateScope when agendaScope changes from parent
  React.useEffect(() => {
    if (agendaScope === 'all') {
      setDateScope('all');
    } else if (agendaScope === 'day') {
      setDateScope('today');
    }
  }, [agendaScope]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Toggle show/hide completed - synced with parent prop if provided
  const [internalHideCompleted, setInternalHideCompleted] = useState(true);
  const hideCompleted = propHideCompleted !== undefined ? propHideCompleted : internalHideCompleted;
  const setHideCompleted = propSetHideCompleted || setInternalHideCompleted;

  // DnD Active item tracking
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor)
  );

  // Compute today string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Filter events by date scope, search, type, and completion
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (evt.deleted || evt.status === 'Cancelado') return false;

      // Completion filter
      if (hideCompleted && isEventCompleted(evt)) {
        return false;
      }

      const normDate = normalizeEventDate(evt.date);

      // Date scope filter
      if (dateScope === 'today') {
        if (normDate !== todayStr) return false;
      } else if (dateScope === 'selectedDay' && selectedDayStr) {
        if (normDate !== normalizeEventDate(selectedDayStr)) return false;
      }

      // Type filter
      if (activeTypeFilter) {
        if (!matchEventType(evt, activeTypeFilter)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = evt.title?.toLowerCase().includes(q);
        const matchesDesc = evt.description?.toLowerCase().includes(q);
        const matchesClient = evt.clientName?.toLowerCase().includes(q);
        const matchesCase = evt.caseTitle?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesClient && !matchesCase) {
          return false;
        }
      }

      return true;
    });
  }, [events, dateScope, selectedDayStr, todayStr, activeTypeFilter, searchQuery, hideCompleted]);

  // Determine which priority columns exist
  const presentPriorities = useMemo(() => {
    const existing = new Set<string>();
    filteredEvents.forEach((e) => {
      existing.add(e.priority || 'Média');
    });

    if (!showOnlyPresentPriorities) {
      return [...ALL_PRIORITIES];
    }

    // Keep the exact order of ALL_PRIORITIES, filtered to those with events or manually revealed
    const list = ALL_PRIORITIES.filter(
      (p) => existing.has(p) || manuallyRevealedPriorities.includes(p)
    );

    // If completely empty, at least show Média or Urgente
    if (list.length === 0) {
      return ['Urgente', 'Média'] as PriorityType[];
    }

    return list;
  }, [filteredEvents, showOnlyPresentPriorities, manuallyRevealedPriorities]);

  // Group events by Urgência (Priority)
  const eventsByPriority = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    ALL_PRIORITIES.forEach((p) => {
      map[p] = [];
    });

    filteredEvents.forEach((e) => {
      const p = e.priority || 'Média';
      if (!map[p]) map[p] = [];
      map[p].push(e);
    });

    return map;
  }, [filteredEvents]);

  // Group events by Impreterível (Impreterível vs Não Impreterível)
  const eventsByImpreterivel = useMemo(() => {
    const map = {
      impreterivel: [] as CalendarEvent[],
      regular: [] as CalendarEvent[]
    };

    filteredEvents.forEach((e) => {
      if (e.impreterivel) {
        map.impreterivel.push(e);
      } else {
        map.regular.push(e);
      }
    });

    return map;
  }, [filteredEvents]);

  // DnD Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const found = events.find((e) => e.id === active.id);
    if (found) {
      setActiveEvent(found);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveEvent(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const sourceEvent = events.find((e) => e.id === activeId);
    if (!sourceEvent) return;

    if (groupingMode === 'urgencia') {
      // Find target column: either overId IS a priority column, or overId is an event inside a column
      let targetPriority: PriorityType | null = null;

      if (ALL_PRIORITIES.includes(overId as PriorityType)) {
        targetPriority = overId as PriorityType;
      } else {
        const overEvent = events.find((e) => e.id === overId);
        if (overEvent) {
          targetPriority = (overEvent.priority || 'Média') as PriorityType;
        }
      }

      if (targetPriority && sourceEvent.priority !== targetPriority) {
        await onUpdateEvent(sourceEvent.id, { priority: targetPriority });
      }
    } else {
      // Grouping mode: 'impreterivel'
      let targetImpreterivel: boolean | null = null;

      if (overId === 'impreterivel') {
        targetImpreterivel = true;
      } else if (overId === 'regular') {
        targetImpreterivel = false;
      } else {
        const overEvent = events.find((e) => e.id === overId);
        if (overEvent) {
          targetImpreterivel = !!overEvent.impreterivel;
        }
      }

      if (targetImpreterivel !== null && !!sourceEvent.impreterivel !== targetImpreterivel) {
        await onUpdateEvent(sourceEvent.id, {
          impreterivel: targetImpreterivel
        });
      }
    }
  };

  const handleAddInColumn = (columnId: string) => {
    if (!onAddNewEventWithDefaults) return;

    if (groupingMode === 'urgencia') {
      onAddNewEventWithDefaults({
        priority: columnId as CalendarEvent['priority']
      });
    } else {
      onAddNewEventWithDefaults({
        impreterivel: columnId === 'impreterivel'
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Kanban Navigation & Control Bar */}
      <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-2xl shadow-sm space-y-4">
        
        {/* Row 1: Mode Switcher & Date Scope & Quick Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          
          {/* Grouping Mode Switcher */}
          <div className="flex items-center space-x-1.5 bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0">
            <span className="text-[10px] font-mono uppercase text-neutral-400 px-2 font-bold flex items-center space-x-1">
              <SlidersHorizontal className="w-3 h-3 text-emerald-500" />
              <span>Agrupar por:</span>
            </span>
            <button
              type="button"
              onClick={() => setGroupingMode('urgencia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                groupingMode === 'urgencia'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Classificação por Urgência</span>
            </button>

            <button
              type="button"
              onClick={() => setGroupingMode('impreterivel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                groupingMode === 'impreterivel'
                  ? 'bg-yellow-500 text-neutral-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flag className={`w-3.5 h-3.5 ${groupingMode === 'impreterivel' ? 'fill-neutral-950 text-neutral-950' : 'text-yellow-400 fill-yellow-400/20'}`} />
              <span>Impreterível ou Não</span>
            </button>
          </div>

          {/* Date Scope Filter */}
          <div className="flex items-center space-x-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800 shrink-0 text-xs">
            <span className="text-[10px] font-mono uppercase text-neutral-400 px-2 font-bold">Escopo:</span>
            <button
              type="button"
              onClick={() => {
                setDateScope('today');
                setAgendaScope?.('day');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                dateScope === 'today'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => {
                setDateScope('all');
                setAgendaScope?.('all');
              }}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                dateScope === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Todos ({events.filter(e => !e.deleted).length})
            </button>
            {selectedDayStr && (
              <button
                type="button"
                onClick={() => {
                  setDateScope('selectedDay');
                  setAgendaScope?.('day');
                }}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  dateScope === 'selectedDay'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
                title={`Filtrar para o dia ${selectedDayStr}`}
              >
                Dia Selecionado
              </button>
            )}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em todos os quadros..."
              className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs text-neutral-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Secondary controls (Dynamic columns toggle, hide completed, legend filter) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-850/60 text-xs">
          
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            {/* Dynamic Columns Configuration for Urgência */}
            {groupingMode === 'urgencia' && (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setShowOnlyPresentPriorities(!showOnlyPresentPriorities)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                    showOnlyPresentPriorities
                      ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                  }`}
                  title={showOnlyPresentPriorities ? "Exibindo apenas quadros das prioridades que têm eventos no momento" : "Exibindo todas as colunas de prioridade"}
                >
                  {showOnlyPresentPriorities ? "Quadros Dinâmicos (Só c/ Eventos)" : "Mostrar Todos os 5 Quadros"}
                </button>

                {/* Quick chip buttons to reveal any hidden priority on the fly */}
                {showOnlyPresentPriorities && (
                  <div className="flex items-center space-x-1">
                    {ALL_PRIORITIES.filter((p) => !presentPriorities.includes(p)).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setManuallyRevealedPriorities((prev) => [...prev, p])}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-emerald-400 hover:border-emerald-600 transition-colors"
                        title={`Revelar coluna ${p}`}
                      >
                        + {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Toggle Hide Completed */}
            <button
              type="button"
              onClick={() => setHideCompleted(!hideCompleted)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                hideCompleted
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
              }`}
              title={hideCompleted ? "Concluídos estão ocultos. Clique para exibir compromissos concluídos" : "Concluídos estão visíveis. Clique para ocultá-los"}
            >
              {hideCompleted ? "Ocultando Concluídos" : "Exibindo Concluídos"}
            </button>
          </div>

          {/* Quick Summary Counter */}
          <div className="text-neutral-400 text-xs font-mono flex items-center space-x-2">
            <span>Total nos quadros: <strong className="text-emerald-400">{filteredEvents.length}</strong></span>
            {activeTypeFilter && (
              <span className="text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded text-[10px]">
                Filtro ativo: {activeTypeFilter}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Kanban Board Columns Area */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 items-start">
          
          {groupingMode === 'urgencia' ? (
            // Render columns by Urgency / Priority
            presentPriorities.map((priority) => {
              const cfg = priorityConfig[priority];
              const colEvents = eventsByPriority[priority] || [];

              return (
                <DroppableKanbanColumn
                  key={priority}
                  id={priority}
                  title={`Urgência: ${cfg.label}`}
                  count={colEvents.length}
                  headerBg={cfg.columnHeaderBg}
                  headerBorder={cfg.columnHeaderBorder}
                  dotColor={cfg.dotColor}
                  textColor={cfg.textColor}
                  events={colEvents}
                  onSelectDetails={onSelectEventDetails}
                  onStartEdit={onStartEdit}
                  onToggleComplete={onToggleComplete}
                  onDeleteEvent={onDeleteEvent}
                  onToggleSubEvent={onToggleSubEvent}
                  onMoveToToday={onMoveToToday}
                  onToggleImpreterivel={onToggleImpreterivel}
                  onAddEventInColumn={handleAddInColumn}
                />
              );
            })
          ) : (
            // Render columns by Impreterível (Impreterível vs Não Impreterível)
            <>
              <DroppableKanbanColumn
                id="impreterivel"
                title={impreterivelConfig.impreterivel.label}
                count={eventsByImpreterivel.impreterivel.length}
                headerBg={impreterivelConfig.impreterivel.columnHeaderBg}
                headerBorder={impreterivelConfig.impreterivel.columnHeaderBorder}
                dotColor={impreterivelConfig.impreterivel.dotColor}
                textColor={impreterivelConfig.impreterivel.textColor}
                events={eventsByImpreterivel.impreterivel}
                onSelectDetails={onSelectEventDetails}
                onStartEdit={onStartEdit}
                onToggleComplete={onToggleComplete}
                onDeleteEvent={onDeleteEvent}
                onToggleSubEvent={onToggleSubEvent}
                onMoveToToday={onMoveToToday}
                onToggleImpreterivel={onToggleImpreterivel}
                onAddEventInColumn={handleAddInColumn}
              />

              <DroppableKanbanColumn
                id="regular"
                title={impreterivelConfig.regular.label}
                count={eventsByImpreterivel.regular.length}
                headerBg={impreterivelConfig.regular.columnHeaderBg}
                headerBorder={impreterivelConfig.regular.columnHeaderBorder}
                dotColor={impreterivelConfig.regular.dotColor}
                textColor={impreterivelConfig.regular.textColor}
                events={eventsByImpreterivel.regular}
                onSelectDetails={onSelectEventDetails}
                onStartEdit={onStartEdit}
                onToggleComplete={onToggleComplete}
                onDeleteEvent={onDeleteEvent}
                onToggleSubEvent={onToggleSubEvent}
                onMoveToToday={onMoveToToday}
                onToggleImpreterivel={onToggleImpreterivel}
                onAddEventInColumn={handleAddInColumn}
              />
            </>
          )}
        </div>

        {/* Drag Overlay for realistic card dragging preview */}
        <DragOverlay>
          {activeEvent ? (
            <LargeKanbanCard
              evt={activeEvent}
              onSelectDetails={() => {}}
              onStartEdit={() => {}}
              onToggleComplete={() => {}}
              onDeleteEvent={() => {}}
              onToggleSubEvent={() => {}}
              onMoveToToday={() => {}}
              onToggleImpreterivel={() => {}}
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
