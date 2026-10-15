import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  X, 
  FolderLock, 
  CheckCircle, 
  XCircle, 
  User, 
  Mail, 
  Phone,
  Grid,
  ListFilter,
  ArrowDownToLine,
  Compass,
  Trash2, Edit2,
  Edit,
  Bell,
  BellRing,
  BellOff,
  ListChecks,
  GripVertical,
  ArrowUpDown,
  DollarSign,
  Gavel,
  Users,
  Flag,
  ChevronUp,
  CornerUpLeft,
  ChevronDown,
  Eye,
  EyeOff,
  FileText,
  MessageSquare,
  History,
  Send,
  Notebook,
  Search,
  Play,
  PlayCircle
} from 'lucide-react';
import { CalendarEvent, Client, Case, SubEvent, EventLog } from '../../types';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { toast } from 'sonner';
import KanbanBoard, { normalizeEventDate, isEventCompleted, matchEventType } from '../../components/KanbanBoard';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const priorityWeights: Record<string, number> = {
  'Fatal': 1,
  'Urgente': 2,
  'Alta': 3,
  'Média': 4,
  'Baixa': 5,
};

const isValidCalendarDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
};

const isValidTime = (value: string) => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (dateStr?: string | null) => {
  if (!dateStr) return 'Sem data definida';
  const norm = normalizeEventDate(dateStr);
  if (!norm) return dateStr || 'Sem data definida';
  const parts = norm.split('-');
  if (parts.length !== 3) return norm;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

// SubEvent Tree Helpers
export const sortSubEvents = (items?: SubEvent[], hideCompleted = false): SubEvent[] => {
  if (!items) return [];
  let list = items;
  if (hideCompleted) {
    list = list.filter(item => !item.completed);
  }
  return list
    .map(item => ({
      ...item,
      subEvents: sortSubEvents(item.subEvents, hideCompleted)
    }))
    .sort((a, b) => {
      if (a.completed !== b.completed) {
        return Number(a.completed) - Number(b.completed);
      }
      if (Boolean(a.important) !== Boolean(b.important)) {
        return a.important ? -1 : 1;
      }
      const posA = a.position ?? 0;
      const posB = b.position ?? 0;
      return posA - posB;
    });
};

export const addNestedSubEventToList = (list: SubEvent[], parentId: string, title: string): SubEvent[] => {
  return list.map(item => {
    if (item.id === parentId) {
      const child: SubEvent = {
        id: Math.random().toString(36).substring(2, 9),
        title,
        completed: false
      };
      return {
        ...item,
        subEvents: [...(item.subEvents || []), child]
      };
    }
    if (item.subEvents && item.subEvents.length > 0) {
      return {
        ...item,
        subEvents: addNestedSubEventToList(item.subEvents, parentId, title)
      };
    }
    return item;
  });
};

export const toggleSubEventInList = (list: SubEvent[], targetId: string): SubEvent[] => {
  return list.map(item => {
    if (item.id === targetId) {
      return {
        ...item,
        completed: !item.completed
      };
    }
    if (item.subEvents && item.subEvents.length > 0) {
      return {
        ...item,
        subEvents: toggleSubEventInList(item.subEvents, targetId)
      };
    }
    return item;
  });
};

export const toggleSubEventImportanceInList = (list: SubEvent[], targetId: string): SubEvent[] => {
  return list.map(item => {
    if (item.id === targetId) {
      return {
        ...item,
        important: !item.important
      };
    }
    if (item.subEvents && item.subEvents.length > 0) {
      return {
        ...item,
        subEvents: toggleSubEventImportanceInList(item.subEvents, targetId)
      };
    }
    return item;
  });
};

export const reorderSubEventsInList = (list: SubEvent[], targetId: string, direction: 'up' | 'down'): SubEvent[] => {
  const idx = list.findIndex(item => item.id === targetId);
  if (idx !== -1) {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= list.length) return list;
    const newList = [...list];
    const [moved] = newList.splice(idx, 1);
    newList.splice(newIdx, 0, moved);
    return newList.map((item, index) => ({ ...item, position: index }));
  }

  return list.map(item => {
    if (item.subEvents && item.subEvents.length > 0) {
      return {
        ...item,
        subEvents: reorderSubEventsInList(item.subEvents, targetId, direction)
      };
    }
    return item;
  });
};

export const editSubEventTitleInList = (list: SubEvent[], targetId: string, newTitle: string): SubEvent[] => {
  return list.map(item => {
    if (item.id === targetId) {
      return { ...item, title: newTitle };
    }
    if (item.subEvents && item.subEvents.length > 0) {
      return {
        ...item,
        subEvents: editSubEventTitleInList(item.subEvents, targetId, newTitle)
      };
    }
    return item;
  });
};

export const promoteSubEventInList = (list: SubEvent[], targetId: string): SubEvent[] => {
  let newList: SubEvent[] = [];
  
  for (const item of list) {
    if (item.subEvents && item.subEvents.length > 0) {
      const targetIndex = item.subEvents.findIndex(sub => sub.id === targetId);
      
      if (targetIndex > -1) {
        const target = item.subEvents[targetIndex];
        const newSubEvents = [...item.subEvents];
        newSubEvents.splice(targetIndex, 1);
        
        newList.push({ ...item, subEvents: newSubEvents });
        newList.push(target);
      } else {
        const updatedSubEvents = promoteSubEventInList(item.subEvents, targetId);
        newList.push({ ...item, subEvents: updatedSubEvents });
      }
    } else {
      newList.push(item);
    }
  }
  
  return newList;
};

export const deleteSubEventFromList = (list: SubEvent[], targetId: string): SubEvent[] => {
  return list
    .filter(item => item.id !== targetId)
    .map(item => {
      if (item.subEvents && item.subEvents.length > 0) {
        return {
          ...item,
          subEvents: deleteSubEventFromList(item.subEvents, targetId)
        };
      }
      return item;
    });
};

export const countSubEvents = (list?: SubEvent[]): { total: number; completed: number } => {
  if (!list) return { total: 0, completed: 0 };
  let total = 0;
  let completed = 0;
  for (const item of list) {
    total += 1;
    if (item.completed) completed += 1;
    if (item.subEvents && item.subEvents.length > 0) {
      const sub = countSubEvents(item.subEvents);
      total += sub.total;
      completed += sub.completed;
    }
  }
  return { total, completed };
};

// Helper component for rendering subevents on event card
function SubEventCardItem({
  sub,
  depth = 0,
  evt,
  onToggleSubEvent
}: {
  sub: SubEvent;
  depth?: number;
  evt: CalendarEvent;
  onToggleSubEvent: (evt: CalendarEvent, subId: string) => void;
}) {
  const sortedChildren = sortSubEvents(sub.subEvents);



  
  return (
    <div className={`space-y-0.5 ${depth > 0 ? 'ml-2.5 pl-1.5 border-l border-neutral-800/60' : ''}`}>
      <label className="flex items-start space-x-1.5 text-neutral-300 cursor-pointer py-0.5">
        <input
          type="checkbox"
          checked={sub.completed}
          onChange={() => onToggleSubEvent(evt, sub.id)}
          className="mt-0.5 rounded border-neutral-800 text-emerald-500 focus:ring-0 cursor-pointer"
        />
        <span className={`text-[10px] leading-tight ${sub.completed ? "line-through text-neutral-500" : "text-neutral-300"} ${sub.important ? "font-bold text-amber-400" : ""}`}>
          {sub.title}
        </span>
        {sub.important && (
          <Flag className="w-2.5 h-2.5 text-amber-400 fill-amber-400/20 shrink-0 mt-0.5" />
        )}
      </label>
      {sortedChildren.length > 0 && (
        <div className="space-y-0.5">
          {sortedChildren.map(child => (
            <SubEventCardItem
              key={child.id}
              sub={child}
              depth={depth + 1}
              evt={evt}
              onToggleSubEvent={onToggleSubEvent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component for subevents in modal form
function SubEventFormItem({
  sub,
  depth = 0,
  onToggle,
  onDelete,
  onAddChild,
  onToggleImportance,
  onReorder,
  onEdit,
  onPromote,
  isFirst,
  isLast
}: {
  sub: SubEvent;
  depth?: number;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, title: string) => void;
  onToggleImportance: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onEdit: (id: string, newTitle: string) => void;
  onPromote: (id: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(sub.title);

  const sortedChildren = sortSubEvents(sub.subEvents);

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== sub.title) {
      onEdit(sub.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={`space-y-1 ${depth > 0 ? 'ml-3 pl-2 border-l border-neutral-800' : ''}`}>
      <div className="flex items-center justify-between text-xs group py-0.5 gap-1">
        <label className="flex items-center space-x-2 text-neutral-300 cursor-pointer min-w-0 flex-1">
          <input
            type="checkbox"
            checked={sub.completed}
            onChange={() => onToggle(sub.id)}
            className="rounded border-neutral-800 text-emerald-500 focus:ring-0 cursor-pointer shrink-0"
          />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditTitle(sub.title);
                }
              }}
              onBlur={handleSaveEdit}
              autoFocus
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          ) : (
            <span 
              onDoubleClick={() => {
                setIsEditing(true);
                setEditTitle(sub.title);
              }}
              className={`truncate ${sub.completed ? "line-through text-neutral-500" : "text-neutral-200"} ${sub.important ? "font-bold text-amber-400" : ""}`}
            >
              {sub.title}
            </span>
          )}
          {sub.important && (
            <span title="Importante"><Flag className="w-3 h-3 text-amber-400 fill-amber-400/20 shrink-0" /></span>
          )}
        </label>
        
        <div className="flex items-center space-x-1 shrink-0">
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setEditTitle(sub.title);
              }}
              className="text-neutral-500 hover:text-emerald-400 p-0.5 cursor-pointer"
              title="Editar"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleImportance(sub.id)}
            className={`p-1 rounded transition-colors cursor-pointer ${
              sub.important 
                ? 'text-amber-400 bg-amber-950/50 border border-amber-500/30' 
                : 'text-neutral-500 hover:text-amber-400 hover:bg-neutral-800'
            }`}
            title={sub.important ? "Remover marcação de importância" : "Marcar como Importante"}
          >
            <Flag className="w-3 h-3" />
          </button>

          <button
            type="button"
            disabled={isFirst}
            onClick={() => onReorder(sub.id, 'up')}
            className={`p-0.5 rounded cursor-pointer ${isFirst ? 'text-neutral-700 cursor-not-allowed' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'}`}
            title="Mover para cima"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            disabled={isLast}
            onClick={() => onReorder(sub.id, 'down')}
            className={`p-0.5 rounded cursor-pointer ${isLast ? 'text-neutral-700 cursor-not-allowed' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'}`}
            title="Mover para baixo"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {depth > 0 && (
            <button
              type="button"
              onClick={() => onPromote(sub.id)}
              className="p-0.5 rounded cursor-pointer text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800"
              title="Promover (Subir um nível)"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setAddingChild(!addingChild)}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/30 font-semibold cursor-pointer"
            title="Adicionar sub-tarefa"
          >
            + Sub
          </button>
          
          <button
            type="button"
            onClick={() => onDelete(sub.id)}
            className="text-red-400 hover:text-red-350 p-0.5 cursor-pointer"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {addingChild && (
        <div className="flex gap-1.5 ml-4 my-1">
          <input
            type="text"
            value={childTitle}
            onChange={e => setChildTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && childTitle.trim()) {
                e.preventDefault();
                onAddChild(sub.id, childTitle.trim());
                setChildTitle('');
                setAddingChild(false);
              }
              if (e.key === 'Escape') setAddingChild(false);
            }}
            placeholder="Nova sub-tarefa..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              if (childTitle.trim()) {
                onAddChild(sub.id, childTitle.trim());
                setChildTitle('');
                setAddingChild(false);
              }
            }}
            disabled={!childTitle.trim()}
            className="px-2 py-1 bg-emerald-600/20 text-emerald-500 rounded text-xs hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {sortedChildren.length > 0 && (
        <div className="space-y-1">
          {sortedChildren.map((child, idx) => (
            <SubEventFormItem
              key={child.id}
              sub={child}
              depth={depth + 1}
              onToggle={onToggle}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onToggleImportance={onToggleImportance}
              onReorder={onReorder}
              onEdit={onEdit}
              onPromote={onPromote}
              isFirst={idx === 0}
              isLast={idx === sortedChildren.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component for subevents in details view
function SubEventDetailItem({
  sub,
  depth = 0,
  evt,
  onToggle,
  onAddChild,
  onToggleImportance,
  onReorder,
  onEdit,
  onPromote,
  isFirst,
  isLast
}: {
  sub: SubEvent;
  depth?: number;
  evt: CalendarEvent;
  onToggle: (evt: CalendarEvent, subId: string) => void;
  onAddChild: (evt: CalendarEvent, parentId: string, title: string) => void;
  onToggleImportance: (evt: CalendarEvent, subId: string) => void;
  onReorder: (evt: CalendarEvent, subId: string, direction: 'up' | 'down') => void;
  onEdit: (evt: CalendarEvent, subId: string, newTitle: string) => void;
  onPromote: (evt: CalendarEvent, subId: string) => void;
  isFirst?: boolean;
  isLast?: boolean;
}) {
  const [addingChild, setAddingChild] = useState(false);
  const [childTitle, setChildTitle] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(sub.title);

  const sortedChildren = sortSubEvents(sub.subEvents);

  const handleSaveEdit = () => {
    if (editTitle.trim() && editTitle !== sub.title) {
      onEdit(evt, sub.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  return (
    <div className={`space-y-1 ${depth > 0 ? 'ml-3 pl-2 border-l border-neutral-850' : ''}`}>
      <div className="flex items-center justify-between text-xs py-0.5 group gap-1">
        <label className="flex items-start space-x-2 text-neutral-300 cursor-pointer min-w-0 flex-1">
          <input
            type="checkbox"
            checked={sub.completed}
            onChange={() => onToggle(evt, sub.id)}
            className="mt-0.5 rounded border-neutral-850 text-emerald-500 focus:ring-0 cursor-pointer shrink-0"
          />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveEdit();
                }
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditTitle(sub.title);
                }
              }}
              onBlur={handleSaveEdit}
              autoFocus
              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-emerald-500 min-w-0"
            />
          ) : (
            <span 
              onDoubleClick={() => {
                setIsEditing(true);
                setEditTitle(sub.title);
              }}
              className={`text-xs break-words ${sub.completed ? "line-through text-neutral-500" : "text-neutral-300"} ${sub.important ? "font-bold text-amber-400" : ""}`}
            >
              {sub.title}
            </span>
          )}
          {sub.important && (
            <span title="Importante"><Flag className="w-3 h-3 text-amber-400 fill-amber-400/20 shrink-0 mt-0.5" /></span>
          )}
        </label>
        
        <div className="flex items-center space-x-1 shrink-0">
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setEditTitle(sub.title);
              }}
              className="text-neutral-500 hover:text-emerald-400 p-0.5 cursor-pointer"
              title="Editar"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onToggleImportance(evt, sub.id)}
            className={`p-1 rounded transition-colors cursor-pointer ${
              sub.important 
                ? 'text-amber-400 bg-amber-950/50 border border-amber-500/30' 
                : 'text-neutral-500 hover:text-amber-400 hover:bg-neutral-800'
            }`}
            title={sub.important ? "Remover marcação de importância" : "Marcar como Importante"}
          >
            <Flag className="w-3 h-3" />
          </button>

          <button
            type="button"
            disabled={isFirst}
            onClick={() => onReorder(evt, sub.id, 'up')}
            className={`p-0.5 rounded cursor-pointer ${isFirst ? 'text-neutral-700 cursor-not-allowed' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'}`}
            title="Mover para cima"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            disabled={isLast}
            onClick={() => onReorder(evt, sub.id, 'down')}
            className={`p-0.5 rounded cursor-pointer ${isLast ? 'text-neutral-700 cursor-not-allowed' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'}`}
            title="Mover para baixo"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {depth > 0 && (
            <button
              type="button"
              onClick={() => onPromote(evt, sub.id)}
              className="p-0.5 rounded cursor-pointer text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800"
              title="Promover (Subir um nível)"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setAddingChild(!addingChild)}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/30 font-semibold cursor-pointer"
            title="Adicionar sub-tarefa"
          >
            + Sub
          </button>
        </div>
      </div>

      {addingChild && (
        <div className="flex gap-1.5 ml-4 my-1">
          <input
            type="text"
            value={childTitle}
            onChange={e => setChildTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && childTitle.trim()) {
                e.preventDefault();
                onAddChild(evt, sub.id, childTitle.trim());
                setChildTitle('');
                setAddingChild(false);
              }
              if (e.key === 'Escape') setAddingChild(false);
            }}
            placeholder="Nova sub-tarefa..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-emerald-500"
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              if (childTitle.trim()) {
                onAddChild(evt, sub.id, childTitle.trim());
                setChildTitle('');
                setAddingChild(false);
              }
            }}
            disabled={!childTitle.trim()}
            className="px-2 py-1 bg-emerald-600/20 text-emerald-500 rounded text-xs hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {sortedChildren.length > 0 && (
        <div className="space-y-1">
          {sortedChildren.map((child, idx) => (
            <SubEventDetailItem
              key={child.id}
              sub={child}
              depth={depth + 1}
              evt={evt}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onToggleImportance={onToggleImportance}
              onReorder={onReorder}
              onEdit={onEdit}
              onPromote={onPromote}
              isFirst={idx === 0}
              isLast={idx === sortedChildren.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface EventLogsSectionProps {
  evt: CalendarEvent;
  onAddLog: (evt: CalendarEvent, text: string) => void;
  onDeleteLog: (evt: CalendarEvent, logId: string) => void;
  onEditLog: (evt: CalendarEvent, logId: string, newText: string) => void;
}

function EventLogsSection({ evt, onAddLog, onDeleteLog, onEditLog }: EventLogsSectionProps) {
  const [inputText, setInputText] = useState('');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const logs = evt.logs || [];
  const totalNotes = logs.length + (evt.description ? 1 : 0);

  const handleAdd = () => {
    if (!inputText.trim()) return;
    onAddLog(evt, inputText.trim());
    setInputText('');
  };

  const handleStartEdit = (log: EventLog) => {
    setEditingLogId(log.id);
    setEditingText(log.text);
  };

  const handleSaveEdit = (logId: string) => {
    if (editingText.trim()) {
      onEditLog(evt, logId, editingText.trim());
    }
    setEditingLogId(null);
    setEditingText('');
  };

  return (
    <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-3 font-sans">
      <div className="flex justify-between items-center text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-400 border-b border-neutral-850 pb-2">
        <span className="flex items-center space-x-1.5">
          <Notebook className="w-3.5 h-3.5 text-emerald-500" />
          <span>Anotações & Registros de Logs</span>
        </span>
        <span className="text-neutral-400 font-mono text-[9px] bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded">
          {totalNotes} {totalNotes === 1 ? 'anotação' : 'anotações'}
        </span>
      </div>

      {/* Input box for new note / log */}
      <div className="space-y-2">
        <textarea
          rows={2}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Escreva uma nova anotação / log para salvar neste compromisso..."
          className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-600/60 placeholder-neutral-500 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono">
          <span className="hidden sm:inline">Pressione Ctrl+Enter para enviar</span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!inputText.trim()}
            className="ml-auto px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            <Send className="w-3 h-3" />
            <span>Salvar Anotação</span>
          </button>
        </div>
      </div>

      {/* Logs timeline list */}
      <div className="space-y-2 max-h-52 overflow-y-auto pt-2 border-t border-neutral-900">
        {/* Primary description note if available */}
        {evt.description && (
          <div className="bg-neutral-900/80 p-3 rounded-lg border border-neutral-800 text-xs space-y-1">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold">
              <span className="flex items-center space-x-1 text-emerald-400">
                <FileText className="w-3 h-3" />
                <span>Descrição Inicial</span>
              </span>
              <span className="text-neutral-500">Fixa</span>
            </div>
            <p className="text-neutral-300 whitespace-pre-wrap leading-relaxed">{evt.description}</p>
          </div>
        )}

        {/* Dynamic saved logs */}
        {logs.length > 0 ? (
          logs.map((log) => (
            <div key={log.id} className="bg-neutral-900/90 p-3 rounded-lg border border-neutral-850 text-xs space-y-1.5 relative">
              <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                <span className="flex items-center space-x-1 text-emerald-400">
                  <Clock className="w-3 h-3 text-emerald-500" />
                  <span>{log.createdAt}</span>
                </span>
                <div className="flex items-center space-x-2">
                  {editingLogId !== log.id && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(log)}
                        className="text-neutral-400 hover:text-neutral-200 transition-colors p-0.5 cursor-pointer"
                        title="Editar esta anotação"
                      >
                        <Edit className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteLog(evt, log.id)}
                        className="text-neutral-500 hover:text-red-400 transition-colors p-0.5 cursor-pointer"
                        title="Excluir esta anotação"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingLogId === log.id ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded text-xs text-neutral-200 focus:outline-none"
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setEditingLogId(null)}
                      className="px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded text-[10px] font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(log.id)}
                      className="px-2.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-neutral-200 whitespace-pre-wrap leading-relaxed">{log.text}</p>
              )}
            </div>
          ))
        ) : !evt.description ? (
          <p className="text-neutral-500 italic text-[11px] text-center py-2">
            Nenhuma anotação registrada. Escreva acima para criar o primeiro registro deste compromisso.
          </p>
        ) : null}
      </div>
    </div>
  );
}

interface SortableEventCardProps {
  evt: CalendarEvent;
  onClick: () => void;
  onStartEdit: (evt: CalendarEvent) => void;
  onToggleComplete: (evt: CalendarEvent) => void;
  onMoveToEnd: (evt: CalendarEvent) => void;
  onDelete: (id: string) => void;
  onToggleSubEvent: (evt: CalendarEvent, subId: string) => void;
  isSelected: boolean;
  isDragEnabled: boolean;
  onMoveToToday: (evt: CalendarEvent) => void;
  onToggleImpreterivel?: (evt: CalendarEvent) => void;
  onToggleEmAndamento?: (evt: CalendarEvent) => void;
  showDateBadge?: boolean;
}

function SortableEventCard({
  evt,
  onClick,
  onStartEdit,
  onToggleComplete,
  onMoveToEnd,
  onDelete,
  onToggleSubEvent,
  isSelected,
  isDragEnabled,
  onMoveToToday,
  onToggleImpreterivel,
  onToggleEmAndamento,
  showDateBadge
}: SortableEventCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: evt.id, disabled: !isDragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const isLembrete = evt.type === 'lembrete';
  const isCompleted = isEventCompleted(evt);
  const isEmAndamento = !!(evt.emAndamento || evt.executionStatus === 'iniciado');

  let typeColor = 'border-l-blue-500';
  if (evt.impreterivel) typeColor = 'border-l-yellow-400';
  else if (isEmAndamento) typeColor = 'border-l-sky-400';
  else if (evt.type === 'audiência') typeColor = 'border-l-orange-500';
  else if (evt.type === 'prazo') typeColor = 'border-l-red-500';
  else if (evt.type === 'lembrete') typeColor = 'border-l-yellow-500';
  else if (evt.type === 'tarefa') typeColor = 'border-l-purple-500';
  else if (evt.type === 'financeiro') typeColor = 'border-l-emerald-500';
  else if (evt.type === 'reunião') typeColor = 'border-l-blue-550';

  const cardBorderBg = evt.impreterivel
    ? isSelected
      ? 'border-yellow-400 bg-yellow-950/40 ring-1 ring-yellow-400/60 shadow-md shadow-yellow-500/10'
      : 'border-yellow-500/60 bg-yellow-950/25 hover:border-yellow-400 hover:bg-yellow-900/30 shadow-sm shadow-yellow-500/10'
    : isEmAndamento
      ? isSelected
        ? 'border-sky-400 bg-sky-950/40 ring-1 ring-sky-400/60 shadow-md shadow-sky-500/10'
        : 'border-sky-500/60 bg-sky-950/20 hover:border-sky-400 hover:bg-sky-900/30 shadow-sm shadow-sky-500/10'
      : isSelected
        ? (isLembrete ? 'border-yellow-500/80 bg-yellow-950/20 ring-1 ring-yellow-500/40' : 'border-emerald-600 bg-neutral-900')
        : (isLembrete ? 'border-yellow-900/30 bg-neutral-950 hover:border-yellow-600/50 hover:bg-yellow-950/10' : 'border-neutral-800 bg-neutral-950 hover:border-emerald-500 hover:bg-neutral-900/40');

  // RENDERIZAÇÃO COMPACTA / MINIMALISTA PARA LEMBRETES: Apenas Título e Subtarefas
  if (isLembrete) {
    const subCount = evt.subEvents ? countSubEvents(evt.subEvents) : { total: 0, completed: 0 };
    return (
      <div
        ref={setNodeRef}
        style={style}
        onClick={onClick}
        className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${cardBorderBg} ${typeColor} border-l-4 group relative ${isCompleted ? 'opacity-60' : ''}`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            {isDragEnabled && (
              <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-neutral-600 hover:text-neutral-400 rounded transition-colors shrink-0"
                title="Arrastar para reordenar"
                onClick={(e) => { e.stopPropagation(); }}
              >
                <GripVertical className="w-3 3" />
              </div>
            )}
            <Bell className="w-3 h-3 text-yellow-500 shrink-0" />
            <strong className={`text-neutral-200 block truncate text-xs font-semibold ${isCompleted ? 'line-through text-neutral-500' : ''}`}>
              {evt.title}
            </strong>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {isEmAndamento && (
              <span className="text-[10px] font-mono font-medium text-sky-400 bg-sky-950/40 border border-sky-500/30 px-1.5 py-0.2 rounded inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                Andamento
              </span>
            )}
            {subCount.total > 0 && (
              <span className="text-[10px] font-mono font-medium text-yellow-500/90 bg-yellow-950/40 border border-yellow-500/20 px-1.5 py-0.2 rounded" title={`${subCount.completed} de ${subCount.total} subtarefas concluídas`}>
                {subCount.completed}/{subCount.total}
              </span>
            )}
            {showDateBadge && (
              <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                normalizeEventDate(evt.date)
                  ? 'text-emerald-400 bg-neutral-900 border border-neutral-800'
                  : 'text-amber-400 bg-amber-950/40 border border-amber-500/30 font-semibold'
              }`}>
                {formatDisplayDate(evt.date)}
              </span>
            )}
            {evt.time && (
              <span className="font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded text-[10px]">
                {evt.time}
              </span>
            )}
            
            {/* Quick Actions no Hover para Lembrete */}
            <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onToggleEmAndamento && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleEmAndamento(evt); }}
                  title={isEmAndamento ? "Remover flag Em Andamento" : "Marcar como Em Andamento"}
                  className={`p-1 rounded hover:bg-neutral-800 cursor-pointer transition-colors ${isEmAndamento ? 'text-sky-400' : 'text-neutral-400 hover:text-sky-400'}`}
                >
                  <Play className={`w-3.5 h-3.5 ${isEmAndamento ? 'fill-sky-400' : ''}`} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onToggleComplete(evt); }}
                title={isCompleted ? "Reabrir lembrete" : "Marcar como concluído"}
                className={`p-1 rounded hover:bg-neutral-800 cursor-pointer transition-colors ${isCompleted ? 'text-emerald-400' : 'text-neutral-400 hover:text-emerald-400'}`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onStartEdit(evt); }}
                title="Editar este lembrete"
                className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(evt.id); }}
                title="Excluir este lembrete"
                className="p-1 rounded text-neutral-400 hover:text-red-400 hover:bg-neutral-800 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-tarefas / Checklist do Lembrete */}
        {evt.subEvents && evt.subEvents.length > 0 && (
          <div className="mt-2 space-y-1 bg-neutral-900/70 p-2 rounded-md border border-neutral-850/80 text-left" onClick={(e) => e.stopPropagation()}>
            {sortSubEvents(evt.subEvents).map(sub => (
              <SubEventCardItem
                key={sub.id}
                sub={sub}
                evt={evt}
                onToggleSubEvent={onToggleSubEvent}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${cardBorderBg} ${typeColor} border-l-4 ${isCompleted ? 'opacity-60' : ''}`}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          {isDragEnabled && (
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-neutral-600 hover:text-neutral-400 rounded transition-colors"
              title="Arrastar para reordenar"
              onClick={(e) => { e.stopPropagation(); }}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}
          <strong className={`text-neutral-250 block truncate max-w-[150px] ${evt.impreterivel ? 'text-yellow-200 font-bold' : 'text-neutral-250'} ${isCompleted ? 'line-through text-neutral-500' : ''}`}>
            {evt.title}
          </strong>
          {evt.impreterivel && (
            <span className="inline-flex items-center space-x-1 bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase shadow-sm">
              <Flag className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
              <span>IMPRETERÍVEL</span>
            </span>
          )}
          {isEmAndamento && (
            <span className="inline-flex items-center space-x-1 bg-sky-400/20 text-sky-300 border border-sky-400/50 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase shadow-sm">
              <span className="relative flex h-2 w-2 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
              </span>
              <Play className="w-2.5 h-2.5 fill-sky-400 text-sky-400" />
              <span>EM ANDAMENTO</span>
            </span>
          )}
          {evt.priority && (
            <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold tracking-wider uppercase border ${
              evt.priority === 'Fatal' ? 'bg-red-950/60 text-red-400 border-red-500/30 animate-pulse' :
              evt.priority === 'Urgente' ? 'bg-orange-950/40 text-orange-400 border-orange-500/20' :
              evt.priority === 'Alta' ? 'bg-red-950/40 text-red-400 border-red-500/20' :
              evt.priority === 'Média' ? 'bg-yellow-950/30 text-yellow-500 border-yellow-500/20' :
              'bg-neutral-950 text-neutral-400 border-neutral-800'
            }`}>
              {evt.priority}
            </span>
          )}
          {((evt as any).transactionId || evt.type === 'financeiro') && (
            <span className="inline-flex items-center space-x-0.5 bg-emerald-950/60 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider">
              <DollarSign className="w-2.5 h-2.5 text-emerald-500" />
              <span>Finanças</span>
            </span>
          )}
          {evt.caseId && (
            <span 
              className="inline-flex items-center space-x-1 bg-amber-950/40 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider"
              title={`Processo vinculado: ${evt.caseTitle || 'Ver Detalhes'}`}
            >
              <Gavel className="w-2.5 h-2.5 text-amber-500" />
              <span className="truncate max-w-[80px]">{evt.caseTitle || 'Processo'}</span>
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          {showDateBadge && (
            <span className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
              normalizeEventDate(evt.date)
                ? 'text-emerald-400 bg-neutral-900 border border-neutral-800'
                : 'text-amber-400 bg-amber-950/40 border border-amber-500/30 font-semibold'
            }`}>
              {formatDisplayDate(evt.date)}
            </span>
          )}
          {evt.time ? (
            <span className="font-mono text-neutral-400 bg-neutral-900 border border-neutral-850 px-1.5 py-0.5 rounded text-[10px] font-bold">
              {evt.time}
            </span>
          ) : (
            <span className="font-mono text-neutral-500 bg-neutral-950 border border-neutral-900/40 px-1.5 py-0.5 rounded text-[10px] italic">
              Sem Horário
            </span>
          )}
        </div>
      </div>

      <p className={`text-[11px] mt-1 ${isCompleted ? 'text-neutral-500 line-through' : 'text-neutral-400'}`}>{evt.description}</p>
      
      {/* Logs/Anotações Preview */}
      {evt.logs && evt.logs.length > 0 && (
        <div className="mt-2 text-[10px] bg-neutral-900/90 p-2 rounded-lg border border-neutral-850 text-neutral-300 space-y-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between text-[8px] font-mono font-bold uppercase text-emerald-400">
            <span className="flex items-center space-x-1">
              <Notebook className="w-2.5 h-2.5 text-emerald-500" />
              <span>Anotação Recente ({evt.logs.length})</span>
            </span>
            <span className="text-neutral-500">{evt.logs[0].createdAt}</span>
          </div>
          <p className="line-clamp-2 text-neutral-300 font-sans italic text-[10px]">"{evt.logs[0].text}"</p>
          {evt.logs.length > 1 && (
            <span className="text-[8px] font-mono text-neutral-500 block text-right font-semibold">+ {evt.logs.length - 1} mais registro(s)</span>
          )}
        </div>
      )}

      {evt.clientName && (
        <p className="text-[10px] text-emerald-500 font-semibold font-sans mt-2">Cliente: {evt.clientName}</p>
      )}

      {/* Subeventos Checklist */}
      {evt.subEvents && evt.subEvents.length > 0 && (
        <div className="mt-2.5 space-y-1 bg-neutral-900/60 p-2 rounded-lg border border-neutral-850/80 text-left" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center text-[9px] uppercase font-mono font-bold tracking-wider text-neutral-400 mb-1">
            <span>Sub-tarefas</span>
            <span>
              {countSubEvents(evt.subEvents).completed}/{countSubEvents(evt.subEvents).total}
            </span>
          </div>
          {sortSubEvents(evt.subEvents).map(sub => (
            <SubEventCardItem
              key={sub.id}
              sub={sub}
              evt={evt}
              onToggleSubEvent={onToggleSubEvent}
            />
          ))}
        </div>
      )}

      {/* Quick actions on card */}
      <div className="flex flex-wrap gap-2 items-center justify-between border-t border-neutral-900 mt-2.5 pt-2 text-[10px]">
        <div className="flex flex-wrap items-center gap-1">
          {/* Move to Today Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onMoveToToday(evt); }}
            title="Mover este compromisso para o dia de hoje"
            className="inline-flex items-center space-x-1 text-emerald-450 hover:text-emerald-400 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-850 hover:border-emerald-900/30 cursor-pointer transition-all"
          >
            <Compass className="w-3 h-3 text-emerald-500" />
            <span>Mover p/ Hoje</span>
          </button>

          {/* Move to End Button */}
          {isDragEnabled && (
            <button
              onClick={(e) => { e.stopPropagation(); onMoveToEnd(evt); }}
              title="Deslocar este compromisso para o fim da fila do dia"
              className="inline-flex items-center space-x-1 text-neutral-400 hover:text-neutral-200 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-850 cursor-pointer transition-all"
            >
              <ArrowDownToLine className="w-3 h-3 text-neutral-400" />
              <span>Mover p/ Fim</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {/* Impreterível Flag Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleImpreterivel?.(evt); }}
            title={evt.impreterivel ? "Remover flag Impreterível" : "Marcar como Impreterível (Amarelado)"}
            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border cursor-pointer transition-all ${
              evt.impreterivel
                ? 'bg-yellow-950/60 text-yellow-300 border-yellow-500/50 hover:bg-yellow-900/40'
                : 'bg-neutral-900 text-neutral-450 hover:text-yellow-400 hover:border-yellow-500/30 border-neutral-850'
            }`}
          >
            <Flag className={`w-3 h-3 ${evt.impreterivel ? 'fill-yellow-400 text-yellow-400' : 'text-neutral-500'}`} />
            <span>Impreterível</span>
          </button>

          {/* Em Andamento Flag Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleEmAndamento?.(evt); }}
            title={isEmAndamento ? "Remover flag Em Andamento" : "Marcar como Em Andamento (Azul Celeste)"}
            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border cursor-pointer transition-all ${
              isEmAndamento
                ? 'bg-sky-950/60 text-sky-300 border-sky-500/50 hover:bg-sky-900/40 shadow-xs'
                : 'bg-neutral-900 text-neutral-450 hover:text-sky-400 hover:border-sky-500/30 border-neutral-850'
            }`}
          >
            <Play className={`w-3 h-3 ${isEmAndamento ? 'fill-sky-400 text-sky-400' : 'text-neutral-500'}`} />
            <span>Em Andamento</span>
          </button>

          {/* Editar Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onStartEdit(evt); }}
            title="Editar este compromisso"
            className="inline-flex items-center space-x-1 text-neutral-400 hover:text-neutral-200 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-850 hover:border-neutral-700 cursor-pointer transition-all"
          >
            <Edit className="w-3 h-3 text-neutral-400" />
            <span>Editar</span>
          </button>

          {/* Marcar Concluído Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleComplete(evt); }}
            title={isCompleted ? "Reabrir compromisso" : "Marcar como concluído"}
            className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border cursor-pointer transition-all ${
              isCompleted
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/60 hover:bg-emerald-900/20'
                : 'bg-neutral-900 text-neutral-450 hover:text-emerald-450 hover:border-emerald-900/30 border-neutral-850'
            }`}
          >
            <CheckCircle className={`w-3 h-3 ${isCompleted ? 'text-emerald-450' : 'text-neutral-500'}`} />
            <span>{isCompleted ? 'Concluído' : 'Concluir'}</span>
          </button>

          {/* Excluir Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(evt.id); }}
            title="Excluir este compromisso definitivamente"
            className="inline-flex items-center space-x-1 text-red-400 hover:text-red-350 bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-850 hover:border-red-950/40 cursor-pointer transition-all"
          >
            <Trash2 className="w-3 h-3 text-red-500" />
            <span>Excluir</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface DatePickerPopoverProps {
  value: string;
  onChange: (val: string) => void;
  label?: string;
}

function DatePickerPopover({ value, onChange, label = "Data" }: DatePickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getInitialMonth = () => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    }
    return new Date();
  };

  const [currentMonth, setCurrentMonth] = useState<Date>(getInitialMonth());

  useEffect(() => {
    if (isOpen) {
      setCurrentMonth(getInitialMonth());
    }
  }, [isOpen, value]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDayClick = (dayNum: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const getDisplayValue = () => {
    if (!value) return "Selecione uma data...";
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const isSelectedDay = (dayNum: number) => {
    if (!value) return false;
    const parts = value.split('-');
    if (parts.length !== 3) return false;
    return parseInt(parts[0], 10) === year &&
           parseInt(parts[1], 10) - 1 === month &&
           parseInt(parts[2], 10) === dayNum;
  };

  const isTodayDay = (dayNum: number) => {
    const today = new Date();
    return today.getFullYear() === year &&
           today.getMonth() === month &&
           today.getDate() === dayNum;
  };

  const blanks = Array.from({ length: firstDayIndex }, (_, i) => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const cells = [...blanks, ...days];

  return (
    <div className="relative font-sans">
      <label className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans">{label}</label>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 border border-neutral-800 bg-neutral-950/80 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none cursor-pointer hover:border-neutral-700 transition-colors text-left"
      >
        <span>{getDisplayValue()}</span>
        <Calendar className="w-4 h-4 text-emerald-500" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="absolute left-0 mt-1.5 w-64 bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 shadow-2xl z-50 font-sans">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-bold text-neutral-200 font-sans">
                {monthNames[month]} {year}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-semibold text-neutral-400 font-sans">
              {weekdayNames.map(wd => (
                <div key={wd}>{wd}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-3">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`blank-${idx}`} className="w-7 h-7" />;
                }
                const selected = isSelectedDay(day);
                const isToday = isTodayDay(day);
                return (
                  <button
                    key={`day-${day}`}
                    type="button"
                    onClick={(e) => handleDayClick(day, e)}
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-sans transition-all cursor-pointer ${
                      selected 
                        ? 'bg-emerald-600 text-white font-bold' 
                        : isToday
                          ? 'border border-emerald-500/50 text-emerald-400 font-bold hover:bg-neutral-800'
                          : 'text-neutral-300 hover:bg-neutral-800 hover:text-emerald-400'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between items-center border-t border-neutral-850 pt-2 text-[10px]">
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-emerald-500 hover:text-emerald-400 font-semibold text-xs font-sans cursor-pointer bg-transparent border-0"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-neutral-500 hover:text-neutral-400 font-medium font-sans cursor-pointer bg-transparent border-0"
              >
                Fechar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface AgendaPageProps {
  events: CalendarEvent[];
  clients?: Client[];
  cases?: Case[];
  sidebarCollapsed?: boolean;
  toggleSidebar?: () => void;
}

export default function AgendaPage({ events, clients = [], cases = [], sidebarCollapsed, toggleSidebar }: AgendaPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  const filteredClients = clients.filter(cli => {
    if (cli.deleted) return false;
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (cli.name && cli.name.toLowerCase().includes(q)) ||
      (cli.cpf && cli.cpf.includes(q)) ||
      (cli.email && cli.email.toLowerCase().includes(q))
    );
  });

  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[]>([]);
  const [selectedDayStr, setSelectedDayStr] = useState<string | null>(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [sortMode, setSortMode] = useState<'manual' | 'priority'>('priority');
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'agenda' | 'quadro'>('agenda');
  const [agendaScope, setAgendaScope] = useState<'day' | 'month' | 'all' | 'unscheduled'>('day');
  const [agendaSearchQuery, setAgendaSearchQuery] = useState('');

  const handleUpdateEventFromKanban = async (evtId: string, updates: Partial<CalendarEvent>) => {
    try {
      await updateDoc(doc(db, 'events', evtId), updates);
      if (updates.priority) {
        toast.success(`Prioridade alterada para Urgência: ${updates.priority}`);
      } else if (updates.impreterivel !== undefined) {
        toast.success(updates.impreterivel ? 'Compromisso marcado como IMPRETERÍVEL!' : 'Compromisso alterado para Não Impreterível.');
      } else if (updates.status || updates.executionStatus) {
        const label = updates.status === 'Concluído' ? 'Concluídos' : (updates.executionStatus === 'iniciado' || updates.status === 'Confirmado' ? 'Iniciados' : 'A Fazer');
        toast.success(`Compromisso movido para ${label}`);
      } else {
        toast.success('Compromisso atualizado.');
      }
    } catch (err) {
      console.error('Error updating event from Kanban:', err);
      toast.error('Erro ao atualizar compromisso.');
    }
  };

  const displayedEvents = useMemo(() => {
    return events.filter(e => {
      if (e.deleted) return false;
      if (!matchEventType(e, activeTypeFilter)) return false;
      return true;
    });
  }, [events, activeTypeFilter]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const sortEventsByMode = (list: CalendarEvent[], mode: 'manual' | 'priority') => {
    return [...list].sort((a, b) => {
      if (mode === 'priority') {
        const impA = a.impreterivel ? 0 : 1;
        const impB = b.impreterivel ? 0 : 1;
        if (impA !== impB) return impA - impB;
        const weightA = priorityWeights[a.priority || 'Média'] || 3;
        const weightB = priorityWeights[b.priority || 'Média'] || 3;
        if (weightA !== weightB) return weightA - weightB;
      } else {
        const posA = a.position !== undefined ? a.position : 0;
        const posB = b.position !== undefined ? b.position : 0;
        if (posA !== posB) return posA - posB;
      }
      return (a.time || '').localeCompare(b.time || '');
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Transition to manual mode immediately on drag
    setSortMode('manual');

    const oldIndex = selectedDayEvents.findIndex((item) => item.id === active.id);
    const newIndex = selectedDayEvents.findIndex((item) => item.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(selectedDayEvents, oldIndex, newIndex);
      setSelectedDayEvents(reordered);

      try {
        const promises = reordered.map((evt, idx) => {
          return updateDoc(doc(db, 'events', evt.id), { position: idx });
        });
        await Promise.all(promises);
        toast.success('Agenda reordenada com sucesso (Modo Manual)!');
      } catch (err) {
        console.error('Error saving manual order:', err);
        toast.error('Erro ao salvar nova ordenação.');
      }
    }
  };

  const handleToggleSortMode = (mode: 'manual' | 'priority') => {
    setSortMode(mode);
    toast.info(mode === 'priority' ? 'Exibindo em ordem de Prioridade' : 'Exibindo em Ordem Manual / Personalizada');
  };

  const [hideCompleted, setHideCompleted] = useState(true);
  const [hideCompletedInForm, setHideCompletedInForm] = useState(false);
  const [hideCompletedInDetails, setHideCompletedInDetails] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  
  const [selectedEventDetails, setSelectedEventDetails] = useState<CalendarEvent | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingEvent, setIsSavingEvent] = useState(false);
  const [newSubEventTitle, setNewSubEventTitle] = useState('');
  const [newEvent, setNewEvent] = useState<{
    title: string;
    date: string;
    time: string;
    description: string;
    type: CalendarEvent['type'];
    clientName: string;
    clientEmail: string;
    clientPhone: string;
    clientId: string;
    priority: 'Fatal' | 'Urgente' | 'Alta' | 'Média' | 'Baixa';
    impreterivel?: boolean;
    emAndamento?: boolean;
    subEvents: CalendarEvent['subEvents'];
    logs: CalendarEvent['logs'];
    caseId?: string;
    caseTitle?: string;
  }>({
    title: '',
    date: '',
    time: '',
    description: '',
    type: 'tarefa',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientId: '',
    priority: 'Média',
    impreterivel: false,
    emAndamento: false,
    subEvents: [],
    logs: [],
    caseId: '',
    caseTitle: ''
  });

  const [formLogInput, setFormLogInput] = useState('');

  const handleAddFormLog = () => {
    if (!formLogInput.trim()) return;
    const nowStr = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const newLog: EventLog = {
      id: Date.now().toString(),
      text: formLogInput.trim(),
      createdAt: nowStr
    };
    setNewEvent(prev => ({
      ...prev,
      logs: [newLog, ...(prev.logs || [])]
    }));
    setFormLogInput('');
    toast.success('Anotação adicionada ao formulário!');
  };

  const handleRemoveFormLog = (logId: string) => {
    setNewEvent(prev => ({
      ...prev,
      logs: (prev.logs || []).filter(l => l.id !== logId)
    }));
  };

  // Calendar math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  const daysGrid: (number | null)[] = [];
  // Pad preceding
  for (let i = 0; i < firstDayIndex; i++) {
    daysGrid.push(null);
  }
  // Populate days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    daysGrid.push(i);
  }

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const selectDay = (day: number) => {
    const formattedDay = day < 10 ? `0${day}` : `${day}`;
    const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
    const dayStr = `${year}-${formattedMonth}-${formattedDay}`;
    setSelectedDayStr(dayStr);
    setAgendaScope('day');

    let filtered = displayedEvents.filter(e => {
      if (e.deleted || e.status === 'Cancelado') return false;
      return normalizeEventDate(e.date) === dayStr;
    });
    if (hideCompleted) {
      filtered = filtered.filter(e => !isEventCompleted(e));
    }
    const sorted = sortEventsByMode(filtered, sortMode);
    setSelectedDayEvents(sorted);
  };

  // Keep selectedDayEvents in sync when events prop changes, selectedDayStr updates, or hideCompleted changes
  React.useEffect(() => {
    if (selectedDayStr) {
      const normSelected = normalizeEventDate(selectedDayStr);
      let filtered = displayedEvents.filter(e => {
        if (e.status === 'Cancelado') return false;
        return normalizeEventDate(e.date) === normSelected;
      });
      if (hideCompleted) {
        filtered = filtered.filter(e => !isEventCompleted(e));
      }
      const sorted = sortEventsByMode(filtered, sortMode);
      setSelectedDayEvents(sorted);
    } else {
      setSelectedDayEvents([]);
    }
  }, [displayedEvents, selectedDayStr, hideCompleted, sortMode]);

  const currentMonthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;

  const monthEvents = useMemo(() => {
    let list = displayedEvents.filter(e => {
      if (e.status === 'Cancelado') return false;
      const nDate = normalizeEventDate(e.date);
      return nDate.startsWith(currentMonthPrefix);
    });
    if (hideCompleted) {
      list = list.filter(e => !isEventCompleted(e));
    }
    return sortEventsByMode(list, sortMode);
  }, [displayedEvents, currentMonthPrefix, hideCompleted, sortMode]);

  const unscheduledEvents = useMemo(() => {
    let list = displayedEvents.filter(e => {
      if (e.status === 'Cancelado') return false;
      const nDate = normalizeEventDate(e.date);
      return !nDate;
    });
    if (hideCompleted) {
      list = list.filter(e => !isEventCompleted(e));
    }
    return sortEventsByMode(list, sortMode);
  }, [displayedEvents, hideCompleted, sortMode]);

  const allActiveEvents = useMemo(() => {
    let list = displayedEvents.filter(e => e.status !== 'Cancelado');
    if (hideCompleted) {
      list = list.filter(e => !isEventCompleted(e));
    }
    return sortEventsByMode(list, sortMode);
  }, [displayedEvents, hideCompleted, sortMode]);

  const activeListEvents = useMemo(() => {
    if (agendaSearchQuery.trim()) {
      const q = agendaSearchQuery.toLowerCase().trim();
      return allActiveEvents.filter(e => {
        const matchTitle = e.title?.toLowerCase().includes(q);
        const matchDesc = e.description?.toLowerCase().includes(q);
        const matchClient = e.clientName?.toLowerCase().includes(q);
        const matchCase = e.caseTitle?.toLowerCase().includes(q);
        return matchTitle || matchDesc || matchClient || matchCase;
      });
    }
    if (agendaScope === 'all') return allActiveEvents;
    if (agendaScope === 'month') return monthEvents;
    if (agendaScope === 'unscheduled') return unscheduledEvents;
    return selectedDayEvents;
  }, [agendaScope, allActiveEvents, monthEvents, selectedDayEvents, unscheduledEvents, agendaSearchQuery]);

  const handleDayContextMenu = (e: React.MouseEvent, day: number, dayStr: string) => {
    e.preventDefault();
    selectDay(day);
    setNewEvent(prev => ({
      ...prev,
      date: dayStr
    }));
    setIsAdding(true);
    toast.info(`Agendando diretamente para ${dayStr}`);
  };

  const jumpToToday = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const today = new Date();
    setCurrentDate(today);
    
    // Select today's date
    const tYear = today.getFullYear();
    const tMonth = today.getMonth();
    const tDay = today.getDate();
    
    const formattedDay = tDay < 10 ? `0${tDay}` : `${tDay}`;
    const formattedMonth = tMonth + 1 < 10 ? `0${tMonth + 1}` : `${tMonth + 1}`;
    const dayStr = `${tYear}-${formattedMonth}-${formattedDay}`;
    setSelectedDayStr(dayStr);
    setAgendaScope('day');

    let filtered = displayedEvents.filter(e => {
      if (e.deleted || e.status === 'Cancelado') return false;
      return normalizeEventDate(e.date) === dayStr;
    });
    if (hideCompleted) {
      filtered = filtered.filter(e => !isEventCompleted(e));
    }
    const sorted = sortEventsByMode(filtered, sortMode);
    setSelectedDayEvents(sorted);
    
    toast.success('Retornou para a data de hoje.');
  };

  const handleMoveToEnd = async (evt: CalendarEvent) => {
    const dayStr = evt.date;
    const dayEvents = events.filter(e => e.date === dayStr && e.status !== 'Cancelado');
    
    const sortedDayEvents = [...dayEvents].sort((a, b) => {
      const posA = a.position !== undefined ? a.position : 0;
      const posB = b.position !== undefined ? b.position : 0;
      if (posA !== posB) return posA - posB;
      return (a.time || '').localeCompare(b.time || '');
    });

    const reordered = sortedDayEvents.filter(e => e.id !== evt.id);
    reordered.push(evt);

    try {
      const promises = reordered.map((e, index) => {
        const docRef = doc(db, 'events', e.id);
        return updateDoc(docRef, { position: index });
      });
      await Promise.all(promises);
      toast.success('Evento deslocado para o fim do dia!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao reordenar evento.');
    }
  };

  const handleMoveToToday = async (evt: CalendarEvent) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (evt.date === todayStr) {
      toast.info('Este compromisso já está agendado para hoje.');
      return;
    }

    try {
      await updateDoc(doc(db, 'events', evt.id), { date: todayStr });
      toast.success(`Compromisso "${evt.title}" movido para hoje!`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao mover compromisso para hoje.');
    }
  };

  const handleToggleComplete = async (evt: CalendarEvent) => {
    try {
      const isCurrentlyCompleted = isEventCompleted(evt);
      const newStatus = isCurrentlyCompleted ? 'Confirmado' : 'Concluído';
      const newExecStatus = isCurrentlyCompleted ? 'a_fazer' : 'concluido';
      await updateDoc(doc(db, 'events', evt.id), {
        status: newStatus,
        executionStatus: newExecStatus
      });
      toast.success(newStatus === 'Concluído' ? 'Compromisso marcado como concluído!' : 'Compromisso reaberto.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status do compromisso.');
    }
  };

  const handleToggleImpreterivel = async (evt: CalendarEvent) => {
    const newVal = !evt.impreterivel;
    try {
      await updateDoc(doc(db, 'events', evt.id), { impreterivel: newVal });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, impreterivel: newVal });
      }
      setSelectedDayEvents(prev => prev.map(e => e.id === evt.id ? { ...e, impreterivel: newVal } : e));
      toast.success(newVal ? 'Evento marcado como IMPRETERÍVEL!' : 'Flag Impreterível removida.');
    } catch (err) {
      console.error('Erro ao alternar flag impreterível:', err);
      toast.error('Erro ao atualizar flag impreterível.');
    }
  };

  const handleToggleEmAndamento = async (evt: CalendarEvent) => {
    const isCurrent = !!(evt.emAndamento || evt.executionStatus === 'iniciado');
    const newVal = !isCurrent;
    const updates: Partial<CalendarEvent> = {
      emAndamento: newVal,
      executionStatus: (newVal ? 'iniciado' : (evt.status === 'Concluído' ? 'concluido' : 'a_fazer')) as any
    };
    try {
      await updateDoc(doc(db, 'events', evt.id), updates);
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, ...updates });
      }
      setSelectedDayEvents(prev => prev.map(e => e.id === evt.id ? { ...e, ...updates } : e));
      toast.success(newVal ? 'Compromisso marcado como Em Andamento!' : 'Flag Em Andamento removida.');
    } catch (err) {
      console.error('Erro ao alternar flag em andamento:', err);
      toast.error('Erro ao atualizar flag em andamento.');
    }
  };

  const handleDeleteEvent = async (evtId: string) => {
    try {
      await updateDoc(doc(db, 'events', evtId), {
        deleted: true,
        deletedAt: new Date().toISOString()
      });
      toast.success('Compromisso excluído com sucesso (Soft Delete).');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir compromisso.');
    }
  };

  const handleAddSubEvent = () => {
    if (!newSubEventTitle.trim()) return;
    const sub: SubEvent = {
      id: Math.random().toString(36).substring(2, 9),
      title: newSubEventTitle.trim(),
      completed: false
    };
    setNewEvent(prev => ({
      ...prev,
      subEvents: [...(prev.subEvents || []), sub]
    }));
    setNewSubEventTitle('');
  };

  const handleAddNestedSubEventInForm = (parentId: string, title: string) => {
    setNewEvent(prev => ({
      ...prev,
      subEvents: addNestedSubEventToList(prev.subEvents || [], parentId, title)
    }));
  };

  const handleToggleSubEventInForm = (id: string) => {
    setNewEvent(prev => ({
      ...prev,
      subEvents: toggleSubEventInList(prev.subEvents || [], id)
    }));
  };

  const handleDeleteSubEventInForm = (id: string) => {
    setNewEvent(prev => ({
      ...prev,
      subEvents: deleteSubEventFromList(prev.subEvents || [], id)
    }));
  };

  const handleToggleSubEventImportanceInForm = (id: string) => {
    setNewEvent(prev => ({
      ...prev,
      subEvents: toggleSubEventImportanceInList(prev.subEvents || [], id)
    }));
  };

  const handleReorderSubEventInForm = (id: string, direction: 'up' | 'down') => {
    setNewEvent(prev => ({
      ...prev,
      subEvents: reorderSubEventsInList(prev.subEvents || [], id, direction)
    }));
  };
  const handlePromoteSubEventInForm = (id: string) => {
    setNewEvent(prev => ({
      ...prev,
      subEvents: promoteSubEventInList(prev.subEvents || [], id)
    }));
  };

  const handleEditSubEventInForm = (id: string, newTitle: string) => {
    setNewEvent(prev => ({
      ...prev,
      subEvents: editSubEventTitleInList(prev.subEvents || [], id, newTitle)
    }));
  };


  const handleToggleSubEventOnDatabase = async (evt: CalendarEvent, subId: string) => {
    const updatedSubEvents = toggleSubEventInList(evt.subEvents || [], subId);
    try {
      await updateDoc(doc(db, 'events', evt.id), { subEvents: updatedSubEvents });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, subEvents: updatedSubEvents });
      }
      toast.success('Checklist atualizado.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar checklist.');
    }
  };

  const handlePromoteSubEventOnDatabase = async (evt: CalendarEvent, subId: string) => {
    const updatedSubEvents = promoteSubEventInList(evt.subEvents || [], subId);
    try {
      await updateDoc(doc(db, 'events', evt.id), { subEvents: updatedSubEvents });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, subEvents: updatedSubEvents });
      }
      toast.success('Sub-tarefa promovida.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao promover sub-tarefa.');
    }
  };

  const handleEditSubEventOnDatabase = async (evt: CalendarEvent, subId: string, newTitle: string) => {
    const updatedSubEvents = editSubEventTitleInList(evt.subEvents || [], subId, newTitle);
    try {
      await updateDoc(doc(db, 'events', evt.id), { subEvents: updatedSubEvents });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, subEvents: updatedSubEvents });
      }
      toast.success('Sub-tarefa editada.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao editar sub-tarefa.');
    }
  };

  const handleToggleSubEventImportanceOnDatabase = async (evt: CalendarEvent, subId: string) => {
    const updatedSubEvents = toggleSubEventImportanceInList(evt.subEvents || [], subId);
    try {
      await updateDoc(doc(db, 'events', evt.id), { subEvents: updatedSubEvents });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, subEvents: updatedSubEvents });
      }
      toast.success('Importância atualizada.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar importância.');
    }
  };

  const handleReorderSubEventOnDatabase = async (evt: CalendarEvent, subId: string, direction: 'up' | 'down') => {
    const updatedSubEvents = reorderSubEventsInList(evt.subEvents || [], subId, direction);
    try {
      await updateDoc(doc(db, 'events', evt.id), { subEvents: updatedSubEvents });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, subEvents: updatedSubEvents });
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao reordenar sub-tarefa.');
    }
  };

  const handleAddNestedSubEventOnDatabase = async (evt: CalendarEvent, parentId: string, title: string) => {
    const updatedSubEvents = addNestedSubEventToList(evt.subEvents || [], parentId, title);
    try {
      await updateDoc(doc(db, 'events', evt.id), { subEvents: updatedSubEvents });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, subEvents: updatedSubEvents });
      }
      toast.success('Sub-tarefa adicionada.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar sub-tarefa.');
    }
  };

  const handleAddLogOnDatabase = async (evt: CalendarEvent, text: string) => {
    if (!text.trim()) return;
    const nowStr = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    const newLog: EventLog = {
      id: Date.now().toString(),
      text: text.trim(),
      createdAt: nowStr
    };
    const updatedLogs = [newLog, ...(evt.logs || [])];
    try {
      await updateDoc(doc(db, 'events', evt.id), { logs: updatedLogs });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, logs: updatedLogs });
      }
      setSelectedDayEvents(prev => prev.map(e => e.id === evt.id ? { ...e, logs: updatedLogs } : e));
      toast.success('Anotação/log salva com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar anotação.');
    }
  };

  const handleDeleteLogOnDatabase = async (evt: CalendarEvent, logId: string) => {
    const updatedLogs = (evt.logs || []).filter(l => l.id !== logId);
    try {
      await updateDoc(doc(db, 'events', evt.id), { logs: updatedLogs });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, logs: updatedLogs });
      }
      setSelectedDayEvents(prev => prev.map(e => e.id === evt.id ? { ...e, logs: updatedLogs } : e));
      toast.success('Anotação/log removida.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao remover anotação.');
    }
  };

  const handleEditLogOnDatabase = async (evt: CalendarEvent, logId: string, updatedText: string) => {
    const updatedLogs = (evt.logs || []).map(l => l.id === logId ? { ...l, text: updatedText } : l);
    try {
      await updateDoc(doc(db, 'events', evt.id), { logs: updatedLogs });
      if (selectedEventDetails && selectedEventDetails.id === evt.id) {
        setSelectedEventDetails({ ...selectedEventDetails, logs: updatedLogs });
      }
      setSelectedDayEvents(prev => prev.map(e => e.id === evt.id ? { ...e, logs: updatedLogs } : e));
      toast.success('Anotação atualizada.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar anotação.');
    }
  };

  const handleStartEdit = (evt: CalendarEvent) => {
    setNewEvent({
      title: evt.title || '',
      date: evt.date || '',
      time: evt.time || '',
      description: evt.description || '',
      type: evt.type || 'tarefa',
      clientName: evt.clientName || '',
      clientEmail: evt.clientEmail || '',
      clientPhone: evt.clientPhone || '',
      clientId: evt.clientId || '',
      priority: evt.priority || 'Média',
      impreterivel: !!evt.impreterivel,
      emAndamento: !!(evt.emAndamento || evt.executionStatus === 'iniciado'),
      subEvents: evt.subEvents || [],
      logs: evt.logs || [],
      caseId: evt.caseId || '',
      caseTitle: evt.caseTitle || ''
    });
    setEditingEventId(evt.id);
    setIsAdding(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingEvent) return;
    const finalTitle = newEvent.title.trim();
    const finalDate = newEvent.date || selectedDayStr || getLocalDateString();
    const finalTime = newEvent.time || '';

    if (!finalTitle) {
      toast.error('Informe um título para o compromisso.');
      return;
    }
    if (!isValidCalendarDate(finalDate)) {
      toast.error('Informe uma data válida para o compromisso.');
      return;
    }
    if (!isValidTime(finalTime)) {
      toast.error('Informe um horário válido.');
      return;
    }
    if (newEvent.clientId && !clients.some(client => client.id === newEvent.clientId && !client.deleted)) {
      toast.error('O cliente vinculado não está mais disponível. Selecione outro cliente ou remova o vínculo.');
      return;
    }
    if (newEvent.caseId && !cases.some(caseItem => caseItem.id === newEvent.caseId && !caseItem.deleted)) {
      toast.error('O processo vinculado não está mais disponível. Selecione outro processo ou remova o vínculo.');
      return;
    }

    setIsSavingEvent(true);
    try {
      const docPayload: Record<string, any> = {
        title: finalTitle,
        date: finalDate,
        time: finalTime,
        description: newEvent.description || '',
        type: newEvent.type,
        status: editingEventId ? (events.find(ev => ev.id === editingEventId)?.status || 'Confirmado') : 'Confirmado',
        createdAt: editingEventId ? (events.find(ev => ev.id === editingEventId)?.createdAt || new Date().toISOString()) : new Date().toISOString()
      };

      // Set fields or empty strings if cleared
      docPayload.clientName = newEvent.clientName || '';
      docPayload.clientEmail = newEvent.clientEmail || '';
      docPayload.clientPhone = newEvent.clientPhone || '';
      docPayload.clientId = newEvent.clientId || '';
      docPayload.priority = newEvent.priority || 'Média';
      docPayload.impreterivel = !!newEvent.impreterivel;
      docPayload.emAndamento = !!newEvent.emAndamento;
      if (newEvent.emAndamento && docPayload.status !== 'Concluído') {
        docPayload.executionStatus = 'iniciado';
      }
      docPayload.subEvents = newEvent.subEvents || [];
      docPayload.logs = newEvent.logs || [];
      docPayload.caseId = newEvent.caseId || '';
      docPayload.caseTitle = newEvent.caseTitle || '';
      if (!editingEventId) {
        docPayload.userId = auth.currentUser?.uid || '';
        docPayload.createdBy = auth.currentUser?.email || '';
      }

      // Clean undefined fields to prevent Firestore errors
      const cleanPayload = Object.entries(docPayload).reduce((acc, [key, val]) => {
        if (val !== undefined) {
          acc[key] = val;
        }
        return acc;
      }, {} as any);

      if (editingEventId) {
        await updateDoc(doc(db, 'events', editingEventId), cleanPayload);
        toast.success('Compromisso atualizado com sucesso.');
      } else {
        await addDoc(collection(db, 'events'), cleanPayload);
        toast.success('Tarefa/Compromisso registrado na agenda.');
      }

      setIsAdding(false);
      setEditingEventId(null);
      setNewEvent({
        title: '',
        date: '',
        time: '',
        description: '',
        type: 'tarefa',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientId: '',
        priority: 'Média',
        impreterivel: false,
        emAndamento: false,
        subEvents: [],
        logs: [],
        caseId: '',
        caseTitle: ''
      });
    } catch (err) {
      console.error(err);
      toast.error(editingEventId ? 'Erro ao atualizar compromisso.' : 'Erro ao registrar compromisso.');
    } finally {
      setIsSavingEvent(false);
    }
  };

  const handleApprovePublicRequest = async (evtId: string) => {
    try {
      await updateDoc(doc(db, 'events', evtId), { 
        status: 'Confirmado',
        isPublicRequest: false,
        executionStatus: 'a_fazer'
      });
      toast.success('Horário de consulta pré-agendada confirmado e homologado no ERP!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectPublicRequest = async (evtId: string) => {
    try {
      await updateDoc(doc(db, 'events', evtId), { status: 'Cancelado' });
      toast.error('Pré-agendamento cancelado / recusado.');
    } catch (err) {
      console.error(err);
    }
  };

  // Extract pending public requests from website (NEVER reminders, tasks, deadlines, etc.)
  const pendingRequests = events.filter(e => 
    !e.deleted &&
    e.status === 'Pendente' &&
    e.type !== 'lembrete' &&
    e.type !== 'tarefa' &&
    e.type !== 'prazo' &&
    e.type !== 'financeiro' &&
    (e.isPublicRequest || (Boolean(e.clientEmail || e.clientPhone) && !e.caseId))
  );

  // Auto-normalize any reminders in Firestore that may have been saved with 'Pendente' status
  useEffect(() => {
    const pendenteLembretes = events.filter(e => !e.deleted && e.type === 'lembrete' && e.status === 'Pendente');
    if (pendenteLembretes.length > 0) {
      pendenteLembretes.forEach(async (lem) => {
        try {
          await updateDoc(doc(db, 'events', lem.id), {
            status: 'Confirmado',
            executionStatus: lem.executionStatus || 'a_fazer'
          });
        } catch (err) {
          console.error('Error normalizing lembrete status in database:', err);
        }
      });
    }
  }, [events]);

  return (
    <div className="space-y-6 text-neutral-100 agenda-font-inter">
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
        <div className="flex items-center space-x-3.5 flex-wrap gap-y-2">
          <h2 className="text-sm font-semibold font-display text-neutral-200">Agenda Judicial & Pré-Agendamento</h2>
          {toggleSidebar && (
            <button
              onClick={toggleSidebar}
              className="hidden md:flex items-center space-x-1.5 px-2.5 py-1.5 text-[11px] font-mono font-semibold uppercase tracking-wider bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-neutral-400 hover:text-white rounded-lg transition-all cursor-pointer"
              title={sidebarCollapsed ? "Mostrar barra lateral" : "Recolher barra lateral"}
            >
              {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-emerald-500" /> : <ChevronLeft className="w-3.5 h-3.5 text-emerald-500" />}
              <span>{sidebarCollapsed ? "Mostrar Barra" : "Recolher Barra"}</span>
            </button>
          )}

          {/* View Mode Switcher */}
          <div className="flex items-center space-x-1 bg-neutral-950 p-1 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-neutral-800 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
              <span>Agenda Clássica</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('quadro')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'quadro'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Quadro Kanban (Eventos Maiores)</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick toggle button to "Ocultar Agenda" / "Mostrar Agenda" */}
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'agenda' ? 'quadro' : 'agenda')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center space-x-1.5 transition-all cursor-pointer ${
              viewMode === 'quadro'
                ? 'bg-neutral-950 border-neutral-700 text-neutral-300 hover:text-white'
                : 'bg-neutral-950 border-emerald-500/40 text-emerald-400 hover:bg-neutral-850'
            }`}
            title={viewMode === 'agenda' ? "Ocultar agenda para ver apenas os quadros com cards maiores" : "Mostrar grade clássica da agenda e calendário"}
          >
            {viewMode === 'agenda' ? (
              <>
                <EyeOff className="w-4 h-4 text-emerald-400" />
                <span>Ocultar Agenda</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-emerald-400" />
                <span>Mostrar Agenda</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setNewEvent({
                title: '',
                date: selectedDayStr || new Date().toISOString().split('T')[0],
                time: '',
                description: '',
                type: 'tarefa',
                clientName: '',
                clientEmail: '',
                clientPhone: '',
                clientId: '',
                priority: 'Média',
                impreterivel: false,
                emAndamento: false,
                subEvents: [],
                logs: [],
                caseId: '',
                caseTitle: ''
              });
              setEditingEventId(null);
              setIsAdding(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Compromisso</span>
          </button>
        </div>
      </div>

      {viewMode === 'quadro' ? (
        <KanbanBoard
          events={events}
          clients={clients}
          cases={cases}
          selectedDayStr={selectedDayStr}
          onUpdateEvent={handleUpdateEventFromKanban}
          onSelectEventDetails={setSelectedEventDetails}
          onStartEdit={handleStartEdit}
          onToggleComplete={handleToggleComplete}
          onDeleteEvent={handleDeleteEvent}
          onToggleSubEvent={handleToggleSubEventOnDatabase}
          onMoveToToday={handleMoveToToday}
          onToggleImpreterivel={handleToggleImpreterivel}
          onToggleEmAndamento={handleToggleEmAndamento}
          onAddNewEventWithDefaults={(defaults) => {
            setNewEvent({
              title: '',
              date: selectedDayStr || new Date().toISOString().split('T')[0],
              time: '',
              description: '',
              type: 'tarefa',
              clientName: '',
              clientEmail: '',
              clientPhone: '',
              clientId: '',
              priority: 'Média',
              impreterivel: false,
              emAndamento: false,
              subEvents: [],
              logs: [],
              caseId: '',
              caseTitle: '',
              ...defaults
            });
            setEditingEventId(null);
            setIsAdding(true);
          }}
          activeTypeFilter={activeTypeFilter}
          setActiveTypeFilter={setActiveTypeFilter}
          hideCompleted={hideCompleted}
          setHideCompleted={setHideCompleted}
          agendaScope={agendaScope}
          setAgendaScope={setAgendaScope}
        />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column: Calendar Grid */}
        <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm space-y-6">
          
          {/* Painel de Legendas Interativas */}
          <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-mono font-bold tracking-wider text-neutral-400 flex items-center space-x-1.5">
                <ListFilter className="w-4 h-4 text-emerald-500" />
                <span>Legendas & Filtro de Compromissos</span>
              </span>
              {activeTypeFilter && (
                <button
                  onClick={() => setActiveTypeFilter(null)}
                  className="text-[10px] uppercase font-mono font-bold text-emerald-500 hover:text-emerald-400 flex items-center space-x-1 px-2 py-1 bg-emerald-950/40 rounded border border-emerald-900/40 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                  <span>Mostrar Todos</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: 'impreterivel', label: 'Impreterível', color: 'text-yellow-300 bg-yellow-950/40 border-yellow-500/30', activeColor: 'ring-1 ring-yellow-400 bg-yellow-900/40 border-yellow-400 text-yellow-300', icon: Flag },
                { id: 'em_andamento', label: 'Em Andamento', color: 'text-sky-300 bg-sky-950/40 border-sky-500/30', activeColor: 'ring-1 ring-sky-400 bg-sky-900/40 border-sky-400 text-sky-300', icon: Play },
                { id: 'financeiro', label: 'Financeiro', color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20', activeColor: 'ring-1 ring-emerald-500 bg-emerald-900/30 border-emerald-500', icon: DollarSign },
                { id: 'audiência', label: 'Audiência', color: 'text-orange-400 bg-orange-950/40 border-orange-500/20', activeColor: 'ring-1 ring-orange-500 bg-orange-900/30 border-orange-500', icon: Gavel },
                { id: 'reunião', label: 'Reunião', color: 'text-blue-400 bg-blue-950/40 border-blue-500/20', activeColor: 'ring-1 ring-blue-500 bg-blue-900/30 border-blue-500', icon: Users },
                { id: 'prazo', label: 'Prazo', color: 'text-red-400 bg-red-950/40 border-red-500/20', activeColor: 'ring-1 ring-red-500 bg-red-900/30 border-red-500', icon: Clock },
                { id: 'lembrete', label: 'Lembrete', color: 'text-yellow-400 bg-yellow-950/40 border-yellow-500/20', activeColor: 'ring-1 ring-yellow-500 bg-yellow-900/30 border-yellow-500', icon: Bell },
                { id: 'tarefa', label: 'Tarefa', color: 'text-purple-400 bg-purple-950/40 border-purple-500/20', activeColor: 'ring-1 ring-purple-500 bg-purple-900/30 border-purple-500', icon: ListChecks },
                { id: 'outro', label: 'Outros', color: 'text-neutral-400 bg-neutral-950/40 border-neutral-850', activeColor: 'ring-1 ring-neutral-400 bg-neutral-800/30 border-neutral-550', icon: Grid }
              ].map(cat => {
                const IconComponent = cat.icon;
                const isActive = activeTypeFilter === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      if (isActive) {
                        setActiveTypeFilter(null);
                      } else {
                        setActiveTypeFilter(cat.id);
                      }
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all hover:scale-[1.02] ${
                      isActive ? cat.activeColor : `${cat.color} opacity-70 hover:opacity-100`
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center bg-neutral-950 p-3 rounded-xl border border-neutral-850">
            <h3 className="font-bold text-sm font-display">{monthNames[month]} de {year}</h3>
            <div className="flex items-center space-x-2">
              <button 
                onClick={(e) => { e.preventDefault(); jumpToToday(); }}
                className="px-2.5 py-1 text-[11px] font-bold bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 rounded transition-colors"
                title="Ir para a data de hoje no calendário"
              >
                Hoje
              </button>
              <button 
                onClick={handlePrevMonth}
                className="p-1 px-2.5 bg-neutral-950 border border-neutral-800 rounded hover:bg-neutral-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-1 px-2.5 bg-neutral-950 border border-neutral-800 rounded hover:bg-neutral-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-mono font-bold text-neutral-400">
            <div>DOM</div>
            <div>SEG</div>
            <div>TER</div>
            <div>QUA</div>
            <div>QUI</div>
            <div>SEX</div>
            <div>SÁB</div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysGrid.map((day, idx) => {
              if (day === null) {
                return (
                  <div key={`empty-${idx}`} className="h-14 bg-neutral-950/20 border border-neutral-900/30 rounded-lg"></div>
                );
              }

              // Match events of this day
              const formattedDay = day < 10 ? `0${day}` : `${day}`;
              const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
              const dayStr = `${year}-${formattedMonth}-${formattedDay}`;
              let dayEvents = displayedEvents.filter(e => {
                if (e.deleted || e.status === 'Cancelado') return false;
                return normalizeEventDate(e.date) === dayStr;
              });
              if (hideCompleted) {
                dayEvents = dayEvents.filter(e => !isEventCompleted(e));
              }

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => selectDay(day)}
                  onContextMenu={(e) => handleDayContextMenu(e, day, dayStr)}
                  title="Clique com o botão direito para adicionar compromisso direto neste dia"
                  className={`h-14 bg-neutral-950 border border-neutral-850 rounded-lg flex flex-col justify-between p-2 hover:border-emerald-600 transition-colors ${
                    selectedDayStr === dayStr ? 'border-emerald-500' : ''
                  }`}
                >
                  <span className="text-xs font-bold font-mono text-neutral-300">{day}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex space-x-1">
                      {dayEvents.map(e => {
                        let color = 'bg-blue-500';
                        if (e.impreterivel) color = 'bg-yellow-400 ring-1 ring-yellow-300/80';
                        else if (e.emAndamento || e.executionStatus === 'iniciado') color = 'bg-sky-400 ring-1 ring-sky-300/80';
                        else if (e.type === 'audiência') color = 'bg-orange-500';
                        else if (e.type === 'prazo') color = 'bg-red-500';
                        else if (e.type === 'lembrete') color = 'bg-yellow-500';
                        else if (e.type === 'tarefa') color = 'bg-purple-500';
                        else if (e.type === 'financeiro') color = 'bg-emerald-500';
                        const opacity = e.status === 'Concluído' ? 'opacity-30' : 'opacity-100';
                        return (
                          <div 
                            key={e.id} 
                            className={`w-1.5 h-1.5 rounded-full ${color} ${opacity}`} 
                            title={`${e.impreterivel ? '[IMPRETERÍVEL] ' : ''}${(e.emAndamento || e.executionStatus === 'iniciado') ? '[EM ANDAMENTO] ' : ''}${e.title} (${e.status})`} 
                          />
                        )
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Banner de aviso se houver eventos sem data definida */}
          {unscheduledEvents.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-amber-950/30 border border-amber-500/30 rounded-xl text-xs mt-3">
              <div className="flex items-center space-x-2 text-amber-300">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Existem <strong>{unscheduledEvents.length}</strong> compromisso(s) sem data definida na agenda.</span>
              </div>
              <button
                type="button"
                onClick={() => setAgendaScope('unscheduled')}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-[11px] font-bold transition-colors cursor-pointer shrink-0"
              >
                Ver Sem Data
              </button>
            </div>
          )}
        </div>

        {/* Right column: Day events Details or pending requests */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Day events visualizer */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm space-y-4">
            <div className="border-b border-neutral-850 pb-2 flex flex-col space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                {/* Scope selector tabs: Dia vs Mês vs Todos vs Sem Data */}
                <div className="flex items-center space-x-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-850 text-[10px] flex-wrap gap-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAgendaScope('day');
                      setAgendaSearchQuery('');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      agendaScope === 'day' && !agendaSearchQuery ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Dia ({selectedDayEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAgendaScope('month');
                      setAgendaSearchQuery('');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      agendaScope === 'month' && !agendaSearchQuery ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Mês Atual ({monthEvents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAgendaScope('all');
                      setAgendaSearchQuery('');
                    }}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      agendaScope === 'all' && !agendaSearchQuery ? 'bg-emerald-600 text-white shadow-sm' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Todos ({allActiveEvents.length})
                  </button>
                  {unscheduledEvents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setAgendaScope('unscheduled');
                        setAgendaSearchQuery('');
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        agendaScope === 'unscheduled' && !agendaSearchQuery ? 'bg-amber-600 text-white shadow-sm' : 'text-amber-400 hover:text-amber-300'
                      }`}
                      title="Compromissos sem data definida"
                    >
                      Sem Data ({unscheduledEvents.length})
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => setHideCompleted(!hideCompleted)}
                  className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border transition-all cursor-pointer ${
                    hideCompleted
                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50'
                      : 'bg-neutral-950 text-neutral-450 border-neutral-850 hover:text-neutral-300'
                  }`}
                >
                  {hideCompleted ? 'Ocultando Concluídos' : 'Exibindo Concluídos'}
                </button>
              </div>

              {/* Quick Search Input in Classic Agenda */}
              <div className="relative pt-1">
                <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-3.5" />
                <input
                  type="text"
                  value={agendaSearchQuery}
                  onChange={(e) => setAgendaSearchQuery(e.target.value)}
                  placeholder="Pesquisar compromissos..."
                  className="w-full pl-8 pr-7 py-1.5 bg-neutral-950 border border-neutral-850 rounded-lg text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
                />
                {agendaSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setAgendaSearchQuery('')}
                    className="absolute right-2.5 top-3 text-xs text-neutral-400 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Title & Sorting options */}
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-neutral-850/40">
                <span className="text-neutral-400 font-mono text-[11px] font-semibold flex items-center space-x-1.5 truncate">
                  <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>
                    {agendaSearchQuery.trim()
                      ? `Resultados: "${agendaSearchQuery}" (${activeListEvents.length})`
                      : agendaScope === 'day' 
                        ? `Agenda de ${formatDisplayDate(selectedDayStr)}` 
                        : (agendaScope === 'month' ? `Compromissos de ${monthNames[month]} de ${year}` : (agendaScope === 'unscheduled' ? 'Compromissos Sem Data Definida' : 'Todos os Compromissos'))}
                  </span>
                </span>
                
                <div className="flex items-center space-x-1 bg-neutral-950 p-0.5 rounded border border-neutral-850 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSortMode('manual')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      sortMode === 'manual'
                        ? 'bg-emerald-600 text-white'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="Exibir na ordem manual ajustada por você"
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSortMode('priority')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      sortMode === 'priority'
                        ? 'bg-amber-600 text-white'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                    title="Exibir ordenado por prioridade"
                  >
                    Prioridade
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {activeListEvents.length > 0 ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={activeListEvents.map(e => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {activeListEvents.map(evt => (
                      <SortableEventCard
                        key={evt.id}
                        evt={evt}
                        onClick={() => {
                          setSelectedEventDetails(evt);
                          if (evt.date) {
                            setSelectedDayStr(normalizeEventDate(evt.date));
                          }
                        }}
                        onStartEdit={handleStartEdit}
                        onToggleComplete={handleToggleComplete}
                        onMoveToEnd={handleMoveToEnd}
                        onDelete={handleDeleteEvent}
                        onToggleSubEvent={handleToggleSubEventOnDatabase}
                        isSelected={selectedEventDetails?.id === evt.id}
                        isDragEnabled={agendaScope === 'day'}
                        onMoveToToday={handleMoveToToday}
                        onToggleImpreterivel={handleToggleImpreterivel}
                        onToggleEmAndamento={handleToggleEmAndamento}
                        showDateBadge={agendaScope !== 'day'}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                <div className="text-[11px] text-neutral-500 italic py-4 text-center space-y-1">
                  <p>
                    {agendaSearchQuery.trim()
                      ? 'Nenhum compromisso encontrado para essa pesquisa.'
                      : agendaScope === 'day' 
                        ? `Nenhum compromisso agendado para ${formatDisplayDate(selectedDayStr)}.` 
                        : (agendaScope === 'month' ? `Nenhum compromisso cadastrado para ${monthNames[month]} de ${year}.` : (agendaScope === 'unscheduled' ? 'Nenhum compromisso sem data definida.' : 'Nenhum compromisso cadastrado.'))}
                  </p>
                  {agendaScope === 'day' && allActiveEvents.length > 0 && !agendaSearchQuery && (
                    <p className="text-[10px] text-neutral-400 not-italic">
                      Dica: Há <button type="button" onClick={() => setAgendaScope('month')} className="text-emerald-400 hover:underline cursor-pointer font-bold">{monthEvents.length} no mês</button> e <button type="button" onClick={() => setAgendaScope('all')} className="text-emerald-400 hover:underline cursor-pointer font-bold">{allActiveEvents.length} no total</button>.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Pending consultation from public site */}
          <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-neutral-400 border-b border-neutral-850 pb-2 flex items-center space-x-2">
              <ListFilter className="w-4 h-4 text-emerald-505 text-emerald-500" />
              <span>Solicitantes do Site ({pendingRequests.length})</span>
            </h3>

            <div className="space-y-4 max-h-80 overflow-y-auto">
              {pendingRequests.length > 0 ? (
                pendingRequests.map(req => (
                  <div key={req.id} className="p-4 bg-neutral-950 rounded-xl border border-neutral-850 text-xs space-y-3">
                    <div className="space-y-1">
                      <strong className="text-neutral-250 text-neutral-200 text-sm font-display block">{req.title}</strong>
                      <span className="font-mono text-neutral-400 text-[10px] block">Agenda: <strong>{req.date}</strong> às {req.time}</span>
                    </div>

                    <p className="text-[11px] text-neutral-400 font-sans leading-relaxed">
                      Observação: "{req.description}"
                    </p>

                    <div className="p-2 border border-neutral-900 bg-neutral-950/40 rounded space-y-1.5 font-sans">
                      <p className="flex items-center text-[10px] text-neutral-300">
                        <User className="w-3.5 h-3.5 text-emerald-500 mr-2 flex-shrink-0" />
                        <span>{req.clientName}</span>
                      </p>
                      <p className="flex items-center text-[10px] text-neutral-300">
                        <Mail className="w-3.5 h-3.5 text-emerald-500 mr-2 flex-shrink-0" />
                        <span>{req.clientEmail}</span>
                      </p>
                      <p className="flex items-center text-[10px] text-neutral-300">
                        <Phone className="w-3.5 h-3.5 text-emerald-500 mr-2 flex-shrink-0" />
                        <span>{req.clientPhone}</span>
                      </p>
                    </div>

                    <div className="flex space-x-2 pt-1.5">
                      <button
                        onClick={() => handleApprovePublicRequest(req.id)}
                        className="flex-1 py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold uppercase transition-colors"
                      >
                        Aprovar Agendar
                      </button>
                      <button
                        onClick={() => handleRejectPublicRequest(req.id)}
                        className="py-1 px-3 border border-neutral-800 text-neutral-450 hover:bg-neutral-850 text-neutral-400 rounded text-[10px] font-bold uppercase transition-colors"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-neutral-505 text-neutral-550 italic font-medium py-3 text-center">Nenhuma proposta de consulta pré-solicitada.</div>
              )}
            </div>
          </div>

        </div>

      </div>
      )}

      {/* Creation/Editing Compromise overlay */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-4xl lg:max-w-5xl w-full space-y-6 max-h-[90vh] overflow-y-auto shadow-2xl font-sans text-neutral-200">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                <h3 className="text-lg font-bold text-neutral-100 font-sans tracking-tight">
                  {editingEventId ? 'Editar Compromisso Oficial' : 'Registrar Novo Compromisso Oficial'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsAdding(false);
                  setEditingEventId(null);
                  setNewEvent({
                    title: '',
                    date: '',
                    time: '',
                    description: '',
                    type: 'tarefa',
                    clientName: '',
                    clientEmail: '',
                    clientPhone: '',
                    clientId: '',
                    priority: 'Média',
                    subEvents: [],
                    logs: [],
                    caseId: '',
                    caseTitle: '',
                    impreterivel: false
                  });
                }}
                className="p-1.5 hover:bg-neutral-800 rounded-lg font-medium text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-6 text-sm font-normal">
              
              {/* Main Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                
                {/* Título do Compromisso */}
                <div className="md:col-span-12">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans">
                    {newEvent.type === 'lembrete' ? 'Título do Lembrete' : 'Título do compromisso'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder={newEvent.type === 'lembrete' ? "Ex: Conferir protocolo e ligar para perito..." : "Ex: Audiência de Instrução e Julgamento"}
                    className="w-full px-3.5 py-2.5 border border-neutral-800 bg-neutral-950/80 rounded-xl text-neutral-200 text-sm font-sans focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder-neutral-500"
                  />
                </div>

                {/* Tipo de Compromisso */}
                <div className={newEvent.type === 'lembrete' ? "md:col-span-6" : "md:col-span-3"}>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans">
                    Tipo de compromisso
                  </label>
                  <select
                    value={newEvent.type}
                    onChange={(e: any) => setNewEvent({ ...newEvent, type: e.target.value })}
                    className="w-full px-3.5 py-2 border border-neutral-800 bg-neutral-950/80 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  >
                    <option value="tarefa">Tarefa / Fazer</option>
                    <option value="reunião">Reunião de Alinhamento</option>
                    <option value="audiência">Audiência</option>
                    <option value="prazo">Prazo Processual Fatal</option>
                    <option value="lembrete">Lembrete (Card Compacto)</option>
                    <option value="financeiro">Financeiro / Pagamento</option>
                    <option value="outro">Outro Item</option>
                  </select>
                </div>

                {/* Data */}
                <div className={newEvent.type === 'lembrete' ? "md:col-span-3" : "md:col-span-3"}>
                  <DatePickerPopover
                    value={newEvent.date}
                    onChange={(val) => setNewEvent({ ...newEvent, date: val })}
                    label="Data"
                  />
                </div>

                {/* Horário */}
                <div className={newEvent.type === 'lembrete' ? "md:col-span-3" : "md:col-span-3"}>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans">
                    Horário (opcional)
                  </label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3.5 py-2 border border-neutral-800 bg-neutral-950/80 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
                  />
                </div>

                {/* Campos adicionais exibidos apenas quando NÃO for lembrete */}
                {newEvent.type !== 'lembrete' && (
                  <>
                    {/* Prioridade */}
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans">
                        Prioridade
                      </label>
                      <select
                        value={newEvent.priority}
                        onChange={(e: any) => setNewEvent({ ...newEvent, priority: e.target.value })}
                        className="w-full px-3.5 py-2 border border-neutral-800 bg-neutral-950/80 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
                      >
                        <option value="Baixa">🟢 Baixa</option>
                        <option value="Média">🟡 Média</option>
                        <option value="Alta">🔴 Alta</option>
                        <option value="Urgente">🟠 Urgente</option>
                        <option value="Fatal">🚨 Fatal</option>
                      </select>
                    </div>

                    {/* Flag Impreterível Toggle */}
                    <div className="md:col-span-12">
                      <div 
                        onClick={() => setNewEvent({ ...newEvent, impreterivel: !newEvent.impreterivel })}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all select-none ${
                          newEvent.impreterivel 
                            ? 'bg-yellow-950/30 border-yellow-500/60 ring-1 ring-yellow-500/40 shadow-sm shadow-yellow-500/10' 
                            : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            newEvent.impreterivel ? 'bg-yellow-400/20 text-yellow-400' : 'bg-neutral-900 text-neutral-500'
                          }`}>
                            <Flag className={`w-5 h-5 ${newEvent.impreterivel ? 'fill-yellow-400' : ''}`} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold font-sans text-neutral-200">
                                Marcar como Impreterível
                              </span>
                              {newEvent.impreterivel && (
                                <span className="text-[9px] font-mono font-bold bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-2 py-0.5 rounded uppercase">
                                  Flag Ativa (Amarelado)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              Atribui a flag "IMPRETERÍVEL" e altera a cor do evento para tonalidade amarelada de atenção máxima.
                            </p>
                          </div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer pointer-events-none">
                          <input
                            type="checkbox"
                            checked={!!newEvent.impreterivel}
                            readOnly
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                        </div>
                      </div>
                    </div>

                    {/* Flag Em Andamento Toggle */}
                    <div className="md:col-span-12">
                      <div 
                        onClick={() => setNewEvent({ ...newEvent, emAndamento: !newEvent.emAndamento })}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all select-none ${
                          newEvent.emAndamento 
                            ? 'bg-sky-950/30 border-sky-500/60 ring-1 ring-sky-500/40 shadow-sm shadow-sky-500/10' 
                            : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                            newEvent.emAndamento ? 'bg-sky-400/20 text-sky-400' : 'bg-neutral-900 text-neutral-500'
                          }`}>
                            <Play className={`w-5 h-5 ${newEvent.emAndamento ? 'fill-sky-400' : ''}`} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold font-sans text-neutral-200">
                                Marcar como Em Andamento
                              </span>
                              {newEvent.emAndamento && (
                                <span className="text-[9px] font-mono font-bold bg-sky-400/20 text-sky-300 border border-sky-400/50 px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                                  Flag Ativa (Em Execução)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-0.5">
                              Sinaliza que este compromisso ou audiência está em execução ativa no momento (destaque azul celeste).
                            </p>
                          </div>
                        </div>
                        <div className="relative inline-flex items-center cursor-pointer pointer-events-none">
                          <input
                            type="checkbox"
                            checked={!!newEvent.emAndamento}
                            readOnly
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                        </div>
                      </div>
                    </div>

                    {/* Processo Vinculado */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans">
                        Processo vinculado (opcional)
                      </label>
                      <select
                        value={newEvent.caseId || ''}
                        onChange={(e) => {
                          const selectedCaseId = e.target.value;
                          const selectedCase = cases.find(c => c.id === selectedCaseId);
                          setNewEvent({
                            ...newEvent,
                            caseId: selectedCaseId,
                            caseTitle: selectedCase ? selectedCase.title : ''
                          });
                        }}
                        className="w-full px-3.5 py-2 border border-neutral-800 bg-neutral-950/80 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
                      >
                        <option value="">-- Nenhum Processo Vinculado --</option>
                        {cases
                          .filter(c => {
                            const isCompleted = c.status === 'Concluído' || (c as any).status === 'Arquivado' || (c as any).status === 'Encerrado';
                            if (!isCompleted) return true;
                            if (newEvent.caseId && newEvent.caseId === c.id) return true;
                            return false;
                          })
                          .map(item => (
                            <option key={item.id} value={item.id}>
                              {item.title} {item.caseNumber ? `(${item.caseNumber})` : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Vincular a Cliente */}
                    <div className="md:col-span-6">
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans">
                        Vincular a cliente
                      </label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="🔍 Pesquisar cliente por nome ou CPF..."
                          value={clientSearchQuery}
                          onChange={(e) => setClientSearchQuery(e.target.value)}
                          className="w-full px-3 py-1.5 border border-neutral-800 bg-neutral-950/80 rounded-lg text-neutral-300 text-xs font-sans focus:outline-none focus:border-emerald-500/60 placeholder-neutral-500"
                        />
                        <select
                          value={newEvent.clientId}
                          onChange={(e) => {
                            const selectedId = e.target.value;
                            const selectedCli = clients.find(c => c.id === selectedId);
                            setNewEvent({
                              ...newEvent,
                              clientId: selectedId,
                              clientName: selectedCli ? selectedCli.name : '',
                              clientEmail: selectedCli ? selectedCli.email : '',
                              clientPhone: selectedCli ? selectedCli.phone : ''
                            });
                          }}
                          className="w-full px-3.5 py-2 border border-neutral-800 bg-neutral-950/80 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none focus:border-emerald-500/60 cursor-pointer"
                        >
                          <option value="">-- Nenhum Cliente / Avulso --</option>
                          {filteredClients.map(cli => (
                            <option key={cli.id} value={cli.id}>
                              {cli.name} (CPF {cli.cpf}){cli.status === 'inativo' ? ' [INATIVO]' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Nome do Cliente Manual */}
                    <div className="md:col-span-12">
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5 font-sans">
                        Nome do cliente manual (avulso)
                      </label>
                      <input
                        type="text"
                        value={newEvent.clientName}
                        onChange={(e) => setNewEvent({ ...newEvent, clientName: e.target.value })}
                        placeholder="Nome avulso do cliente se não estiver cadastrado..."
                        className="w-full px-3.5 py-2 border border-neutral-800 bg-neutral-950/80 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none focus:border-emerald-500/60 placeholder-neutral-500"
                      />
                    </div>
                  </>
                )}

              </div>

              {/* Seção de Conteúdo: Se for Lembrete, foca 100% nas Subtarefas / Checklist */}
              {newEvent.type === 'lembrete' ? (
                <div className="pt-2 border-t border-neutral-800">
                  <div className="space-y-4 bg-neutral-950/70 p-4 border border-yellow-500/20 rounded-2xl">
                    <div className="flex justify-between items-center border-b border-neutral-800/80 pb-2.5">
                      <label className="text-xs font-semibold text-yellow-400 font-sans flex items-center space-x-2">
                        <ListChecks className="w-4 h-4 text-yellow-500" />
                        <span>Subtarefas do Lembrete</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setHideCompletedInForm(!hideCompletedInForm)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer font-sans ${
                          hideCompletedInForm
                            ? 'bg-yellow-950/60 text-yellow-400 border-yellow-900/50'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                        }`}
                      >
                        {hideCompletedInForm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{hideCompletedInForm ? 'Ocultando Concluídos' : 'Ocultar Concluídos'}</span>
                      </button>
                    </div>
                    
                    {/* Subevent Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubEventTitle}
                        onChange={(e) => setNewSubEventTitle(e.target.value)}
                        placeholder="Adicionar item ou subtarefa ao lembrete..."
                        className="flex-1 px-3.5 py-2 border border-neutral-800 bg-neutral-900/90 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none focus:border-yellow-500/60 placeholder-neutral-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubEvent();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddSubEvent}
                        className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        + Adicionar
                      </button>
                    </div>

                    {/* Subevent List */}
                    {newEvent.subEvents && newEvent.subEvents.length > 0 ? (
                      <div className="space-y-1.5 max-h-56 overflow-y-auto bg-neutral-900/90 p-3 border border-neutral-800 rounded-xl">
                        {sortSubEvents(newEvent.subEvents, hideCompletedInForm).map((sub, idx, arr) => (
                          <SubEventFormItem
                            key={sub.id}
                            sub={sub}
                            onToggle={handleToggleSubEventInForm}
                            onDelete={handleDeleteSubEventInForm}
                            onAddChild={handleAddNestedSubEventInForm}
                            onToggleImportance={handleToggleSubEventImportanceInForm}
                            onReorder={handleReorderSubEventInForm}
                            onEdit={handleEditSubEventInForm}
                            onPromote={handlePromoteSubEventInForm}
                            isFirst={idx === 0}
                            isLast={idx === arr.length - 1}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-neutral-500 italic font-sans">
                        Nenhuma subtarefa adicionada ainda. Adicione itens acima para criar a lista do seu lembrete.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Dual Column Section: Anotações & Checklist (para os outros tipos de compromisso) */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-neutral-800">
                  
                  {/* Left Column: Anotações & Registros de Logs */}
                  <div className="space-y-4 bg-neutral-950/70 p-4 border border-neutral-800/80 rounded-2xl">
                    <div className="flex justify-between items-center text-xs font-medium text-emerald-400 font-sans border-b border-neutral-800/80 pb-2.5">
                      <span className="flex items-center space-x-2">
                        <Notebook className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold text-neutral-200">Anotações & registros de logs</span>
                      </span>
                      <span className="text-neutral-400 font-sans text-xs bg-emerald-950/50 border border-emerald-900/40 px-2 py-0.5 rounded-md font-medium">
                        {(newEvent.logs?.length || 0) + (newEvent.description ? 1 : 0)} anotação(ões)
                      </span>
                    </div>

                    {/* Textarea log input */}
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={formLogInput}
                        onChange={(e) => setFormLogInput(e.target.value)}
                        placeholder="Escreva uma nova anotação / log para salvar neste compromisso (ex: 22/07/26 - Liguei para lá e...)"
                        className="w-full px-3.5 py-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl text-xs text-neutral-200 font-sans focus:outline-none focus:border-emerald-500/60 placeholder-neutral-500 resize-none leading-relaxed"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            handleAddFormLog();
                          }
                        }}
                      />
                      <div className="flex justify-between items-center text-xs text-neutral-400 font-sans">
                        <span className="hidden sm:inline text-[11px] text-neutral-500">Pressione Ctrl+Enter para incluir</span>
                        <button
                          type="button"
                          onClick={handleAddFormLog}
                          disabled={!formLogInput.trim()}
                          className="ml-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Salvar Anotação</span>
                        </button>
                      </div>
                    </div>

                    {/* Descrição Geral Opcional */}
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1 font-sans">
                        Descrição detalhada geral (opcional)
                      </label>
                      <input
                        type="text"
                        value={newEvent.description}
                        onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder="Resumo inicial ou observação geral..."
                        className="w-full px-3 py-2 border border-neutral-800 bg-neutral-900/90 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none focus:border-emerald-500/60 placeholder-neutral-500"
                      />
                    </div>

                    {/* Lista de Logs Salvos */}
                    {(newEvent.logs && newEvent.logs.length > 0) && (
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pt-2 border-t border-neutral-800/80">
                        <span className="text-xs font-medium text-neutral-400 font-sans block">Logs salvos neste compromisso:</span>
                        {newEvent.logs.map((log) => (
                          <div key={log.id} className="bg-neutral-900 p-3 rounded-xl border border-neutral-800 text-xs font-sans space-y-1.5 relative">
                            <div className="flex justify-between items-center text-xs font-medium text-emerald-400">
                              <span className="flex items-center space-x-1.5">
                                <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-neutral-400">{log.createdAt}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFormLog(log.id)}
                                className="text-neutral-500 hover:text-red-400 transition-colors p-1 cursor-pointer"
                                title="Excluir esta anotação"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-neutral-200 whitespace-pre-wrap leading-relaxed">{log.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Checklist de Subeventos (Ticáveis) */}
                  <div className="space-y-4 bg-neutral-950/70 p-4 border border-neutral-800/80 rounded-2xl">
                    <div className="flex justify-between items-center border-b border-neutral-800/80 pb-2.5">
                      <label className="text-xs font-semibold text-neutral-200 font-sans flex items-center space-x-2">
                        <ListChecks className="w-4 h-4 text-emerald-500" />
                        <span>Checklist de subeventos</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setHideCompletedInForm(!hideCompletedInForm)}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer font-sans ${
                          hideCompletedInForm
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50'
                            : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                        }`}
                      >
                        {hideCompletedInForm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{hideCompletedInForm ? 'Ocultando Concluídos' : 'Ocultar Concluídos'}</span>
                      </button>
                    </div>
                    
                    {/* Subevent Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubEventTitle}
                        onChange={(e) => setNewSubEventTitle(e.target.value)}
                        placeholder="Adicionar subevento (Ex: Ligar para testemunha)..."
                        className="flex-1 px-3.5 py-2 border border-neutral-800 bg-neutral-900/90 rounded-xl text-neutral-200 text-xs font-sans focus:outline-none focus:border-emerald-500/60 placeholder-neutral-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubEvent();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddSubEvent}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        + Adicionar
                      </button>
                    </div>

                    {/* Subevent List */}
                    {newEvent.subEvents && newEvent.subEvents.length > 0 ? (
                      <div className="space-y-1.5 max-h-52 overflow-y-auto bg-neutral-900/90 p-3 border border-neutral-800 rounded-xl">
                        {sortSubEvents(newEvent.subEvents, hideCompletedInForm).map((sub, idx, arr) => (
                          <SubEventFormItem
                            key={sub.id}
                            sub={sub}
                            onToggle={handleToggleSubEventInForm}
                            onDelete={handleDeleteSubEventInForm}
                            onAddChild={handleAddNestedSubEventInForm}
                            onToggleImportance={handleToggleSubEventImportanceInForm}
                            onReorder={handleReorderSubEventInForm}
                        onEdit={handleEditSubEventInForm}
                            onPromote={handlePromoteSubEventInForm}
                            isFirst={idx === 0}
                            isLast={idx === arr.length - 1}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center text-xs text-neutral-500 italic font-sans">
                        Nenhum subevento adicionado para este compromisso.
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex justify-end items-center space-x-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setEditingEventId(null);
                    setNewEvent({
                      title: '',
                      date: '',
                      time: '',
                      description: '',
                      type: 'tarefa',
                      clientName: '',
                      clientEmail: '',
                      clientPhone: '',
                      clientId: '',
                      priority: 'Média',
                      subEvents: [],
                      logs: [],
                      caseId: '',
                      caseTitle: '',
                      impreterivel: false
                    });
                  }}
                  className="px-5 py-2.5 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 rounded-xl text-xs font-semibold font-sans transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingEvent}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold font-sans transition-all shadow-md hover:shadow-emerald-950/50 cursor-pointer"
                >
                  {isSavingEvent ? 'Salvando...' : editingEventId ? 'Salvar Alterações' : 'Salvar na Agenda'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Event Details Card Modal overlay */}
      {selectedEventDetails && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-xl w-full space-y-6 relative max-h-[85vh] overflow-y-auto font-sans shadow-2xl">
            {/* Header / Type / Close Button */}
            <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                {selectedEventDetails.impreterivel && (
                  <span className="inline-flex items-center space-x-1.5 bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold tracking-wider uppercase shadow-sm">
                    <Flag className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span>IMPRETERÍVEL</span>
                  </span>
                )}
                {(selectedEventDetails.emAndamento || selectedEventDetails.executionStatus === 'iniciado') && (
                  <span className="inline-flex items-center space-x-1.5 bg-sky-400/20 text-sky-300 border border-sky-400/50 px-2.5 py-0.5 rounded-md text-xs font-mono font-bold tracking-wider uppercase shadow-sm">
                    <span className="relative flex h-2 w-2 mr-0.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
                    </span>
                    <Play className="w-3.5 h-3.5 fill-sky-400 text-sky-400" />
                    <span>EM ANDAMENTO</span>
                  </span>
                )}
                <span className={`text-xs font-sans font-semibold border px-2.5 py-0.5 rounded-md ${
                  selectedEventDetails.priority === 'Fatal' ? 'bg-red-950/60 text-red-400 border-red-500/30 font-bold animate-pulse' :
                  selectedEventDetails.priority === 'Urgente' ? 'bg-orange-950/40 text-orange-400 border-orange-500/20 font-semibold' :
                  selectedEventDetails.priority === 'Alta' ? 'bg-red-950/40 text-red-400 border-red-500/20 font-semibold' :
                  selectedEventDetails.priority === 'Média' ? 'bg-yellow-950/30 text-yellow-500 border-yellow-500/20 font-semibold' :
                  'bg-neutral-950 text-neutral-400 border-neutral-800'
                }`}>
                  {selectedEventDetails.priority ? `Prioridade ${selectedEventDetails.priority}` : 'Prioridade Não Definida'}
                </span>
                <span className="text-xs font-sans font-medium text-neutral-400 capitalize">
                  • {selectedEventDetails.type}
                </span>
              </div>
              <button 
                onClick={() => setSelectedEventDetails(null)}
                className="p-1 hover:bg-neutral-800 rounded-lg font-semibold text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Title / Description */}
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                {selectedEventDetails.type === 'lembrete' && (
                  <Bell className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                )}
                <h3 className="text-xl font-bold text-neutral-100 font-sans leading-snug">
                  {selectedEventDetails.title}
                </h3>
              </div>
              
              <div className="flex items-center space-x-4 text-xs font-sans text-neutral-300 py-1.5 bg-neutral-950/80 border border-neutral-800 rounded-xl px-3.5">
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 text-emerald-500 mr-2" />
                  {formatDisplayDate(selectedEventDetails.date)}
                </span>
                {selectedEventDetails.time && (
                  <span className="flex items-center border-l border-neutral-800 pl-4">
                    <Clock className="w-4 h-4 text-emerald-500 mr-2" />
                    {selectedEventDetails.time}
                  </span>
                )}
              </div>

              {selectedEventDetails.type !== 'lembrete' && (
                <EventLogsSection
                  evt={selectedEventDetails}
                  onAddLog={handleAddLogOnDatabase}
                  onDeleteLog={handleDeleteLogOnDatabase}
                  onEditLog={handleEditLogOnDatabase}
                />
              )}
            </div>

            {/* Linked Client Info */}
            {selectedEventDetails.type !== 'lembrete' && (selectedEventDetails.clientName || selectedEventDetails.clientEmail || selectedEventDetails.clientPhone) && (
              <div className="bg-neutral-950/80 p-4 border border-neutral-800 rounded-xl space-y-2.5">
                <h4 className="text-xs font-semibold font-sans text-emerald-400 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  <span>Cliente vinculado</span>
                </h4>
                <div className="space-y-1 text-xs font-sans">
                  {selectedEventDetails.clientName && (
                    <p className="text-neutral-200 font-semibold">{selectedEventDetails.clientName}</p>
                  )}
                  {selectedEventDetails.clientEmail && (
                    <p className="text-neutral-400 text-xs flex items-center">
                      <Mail className="w-3.5 h-3.5 text-neutral-500 mr-2" />
                      {selectedEventDetails.clientEmail}
                    </p>
                  )}
                  {selectedEventDetails.clientPhone && (
                    <p className="text-neutral-400 text-xs flex items-center">
                      <Phone className="w-3.5 h-3.5 text-neutral-500 mr-2" />
                      {selectedEventDetails.clientPhone}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Linked Case Info */}
            {selectedEventDetails.type !== 'lembrete' && selectedEventDetails.caseId && (
              <div className="bg-neutral-950/80 p-4 border border-neutral-800 rounded-xl space-y-2 font-sans">
                <h4 className="text-xs font-semibold text-amber-400 flex items-center">
                  <Gavel className="w-4 h-4 mr-2" />
                  <span>Processo vinculado</span>
                </h4>
                <div className="text-xs">
                  <p className="text-neutral-200 font-semibold">{selectedEventDetails.caseTitle || 'Processo'}</p>
                </div>
              </div>
            )}

            {/* Subeventos Checklist no Detalhe */}
            {selectedEventDetails.subEvents && selectedEventDetails.subEvents.length > 0 && (
              <div className={`p-4 border rounded-xl space-y-3 font-sans ${selectedEventDetails.type === 'lembrete' ? 'bg-neutral-950/90 border-yellow-500/25' : 'bg-neutral-950/80 border-neutral-800'}`}>
                <div className="flex justify-between items-center text-xs font-semibold text-neutral-300">
                  <span className="flex items-center">
                    <ListChecks className="w-4 h-4 mr-2 text-emerald-500" />
                    <span>Sub-tarefas do evento</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setHideCompletedInDetails(!hideCompletedInDetails)}
                      className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer font-sans ${
                        hideCompletedInDetails
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-neutral-200'
                      }`}
                    >
                      {hideCompletedInDetails ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{hideCompletedInDetails ? 'Ocultando' : 'Ocultar'}</span>
                    </button>
                    <span className="text-emerald-500 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.2 rounded font-mono text-[10px]">
                      {countSubEvents(selectedEventDetails.subEvents).completed}/{countSubEvents(selectedEventDetails.subEvents).total}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {sortSubEvents(selectedEventDetails.subEvents, hideCompletedInDetails).map((sub, idx, arr) => (
                    <SubEventDetailItem
                      key={sub.id}
                      sub={sub}
                      evt={selectedEventDetails}
                      onToggle={handleToggleSubEventOnDatabase}
                      onAddChild={handleAddNestedSubEventOnDatabase}
                      onToggleImportance={handleToggleSubEventImportanceOnDatabase}
                      onReorder={handleReorderSubEventOnDatabase}
                      onEdit={handleEditSubEventOnDatabase}
                      onPromote={handlePromoteSubEventOnDatabase}
                      isFirst={idx === 0}
                      isLast={idx === arr.length - 1}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex flex-wrap gap-2 justify-end border-t border-neutral-800 pt-4">
              <button
                onClick={() => handleToggleEmAndamento(selectedEventDetails)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors flex items-center space-x-1.5 ${
                  (selectedEventDetails.emAndamento || selectedEventDetails.executionStatus === 'iniciado')
                    ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 hover:bg-sky-500/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-sky-400 hover:border-sky-500/40'
                }`}
              >
                <Play className={`w-3.5 h-3.5 ${(selectedEventDetails.emAndamento || selectedEventDetails.executionStatus === 'iniciado') ? 'fill-sky-400 text-sky-400' : ''}`} />
                <span>{(selectedEventDetails.emAndamento || selectedEventDetails.executionStatus === 'iniciado') ? 'Em Andamento ✓' : 'Marcar Em Andamento'}</span>
              </button>
              <button
                onClick={() => handleToggleImpreterivel(selectedEventDetails)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors flex items-center space-x-1.5 ${
                  selectedEventDetails.impreterivel
                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/30'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-yellow-400 hover:border-yellow-500/40'
                }`}
              >
                <Flag className={`w-3.5 h-3.5 ${selectedEventDetails.impreterivel ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                <span>{selectedEventDetails.impreterivel ? 'Impreterível ✓' : 'Marcar Impreterível'}</span>
              </button>
              <button
                onClick={() => {
                  handleToggleComplete(selectedEventDetails);
                  setSelectedEventDetails(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                  selectedEventDetails.status === 'Concluído'
                    ? 'bg-neutral-955 border-neutral-800 text-neutral-400 hover:text-neutral-300'
                    : 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20'
                }`}
              >
                {selectedEventDetails.status === 'Concluído' ? 'Reabrir' : 'Concluir'}
              </button>
              <button
                onClick={() => {
                  handleStartEdit(selectedEventDetails);
                  setSelectedEventDetails(null);
                }}
                className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 text-neutral-300 rounded-lg text-xs font-semibold hover:bg-neutral-850 cursor-pointer"
              >
                Editar
              </button>
              <button
                onClick={() => {
                  handleDeleteEvent(selectedEventDetails.id);
                  setSelectedEventDetails(null);
                }}
                className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/40 text-red-400 border border-red-900/20 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Excluir
              </button>
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="px-4 py-1.5 bg-neutral-800 text-white rounded-lg text-xs font-semibold hover:bg-neutral-750 cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
