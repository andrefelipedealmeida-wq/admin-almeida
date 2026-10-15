import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Eye, 
  Trash2, 
  Plus, 
  X, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  SlidersHorizontal,
  Calendar,
  FileText,
  User,
  Gavel,
  CheckSquare,
  Edit,
  MessageCircle,
  Send,
  Loader2,
  Download,
  FileDown,
  FileSpreadsheet,
  Link2,
  ExternalLink,
  Copy,
  Landmark,
  Building2
} from 'lucide-react';
import { Case, Client, CaseTimeline, CaseTask, CaseMessage } from '../../types';
import { collection, setDoc, doc, updateDoc, deleteDoc, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { toast } from 'sonner';
import { 
  generateSingleCaseReportPdf, 
  generateCasesSummaryPdf, 
  downloadPdfDocument 
} from '../../utils/casePdfGenerator';
import {
  generateCasesCsv,
  generateSingleCaseDetailedCsv,
  downloadCsvFile
} from '../../utils/caseCsvExporter';

interface CasesPageProps {
  cases: Case[];
  clients: Client[];
}

export default function CasesPage({ cases, clients }: CasesPageProps) {
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; message: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Em andamento' | 'Suspenso' | 'Concluído' | 'Renunciado'>('Todos');
  const [areaFilter, setAreaFilter] = useState<string>('Todos');
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);

  // Export States (PDF & CSV)
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('csv');
  const [exportType, setExportType] = useState<'summary' | 'single'>('summary');
  const [exportTargetCaseId, setExportTargetCaseId] = useState<string>('');
  const [exportIncludeNotes, setExportIncludeNotes] = useState(true);
  const [exportIncludeTasks, setExportIncludeTasks] = useState(true);
  const [exportIncludeTimeline, setExportIncludeTimeline] = useState(true);
  const [exportOnlyFiltered, setExportOnlyFiltered] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportSingleCasePdf = (caseToExport: Case, options?: { includeNotes?: boolean; includeTasks?: boolean; includeTimeline?: boolean }) => {
    try {
      toast.info('Gerando relatório oficial do processo em PDF...');
      const client = clients.find(c => c.id === caseToExport.clientId) || null;
      const docPdf = generateSingleCaseReportPdf(caseToExport, {
        client,
        includeNotes: options?.includeNotes ?? true,
        includeTasks: options?.includeTasks ?? true,
        includeTimeline: options?.includeTimeline ?? true
      });
      const safeNum = (caseToExport.caseNumber || 'sem_numero').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeTitle = (caseToExport.title || 'processo').substring(0, 25).replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadPdfDocument(docPdf, `Relatorio_Processo_${safeNum}_${safeTitle}.pdf`);
      toast.success('Relatório do processo baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar PDF do processo:', err);
      toast.error('Erro ao gerar relatório do processo em PDF.');
    }
  };

  const handleExportSingleCaseCsv = (caseToExport: Case) => {
    try {
      toast.info(`Gerando planilha CSV do processo ${caseToExport.caseNumber || caseToExport.title}...`);
      const client = clients.find(c => c.id === caseToExport.clientId) || null;
      const csvContent = generateSingleCaseDetailedCsv(caseToExport, client);
      const safeNum = (caseToExport.caseNumber || 'sem_numero').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeTitle = (caseToExport.title || 'processo').substring(0, 25).replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadCsvFile(csvContent, `Processo_${safeNum}_${safeTitle}.csv`);
      toast.success('Planilha CSV do processo baixada com sucesso!');
      setExportModalOpen(false);
    } catch (err) {
      console.error('Erro ao gerar CSV do processo:', err);
      toast.error('Erro ao exportar processo em CSV.');
    }
  };

  const handleExportCasesCsv = (onlyFiltered: boolean = true) => {
    try {
      const targetCases = onlyFiltered ? filteredCases : cases;
      if (targetCases.length === 0) {
        toast.error('Nenhum processo disponível para exportar no filtro atual.');
        return;
      }
      toast.info(`Gerando planilha CSV com ${targetCases.length} processos...`);
      const csvContent = generateCasesCsv(targetCases, { clients });
      const nowStr = new Date().toISOString().split('T')[0];
      const fileName = onlyFiltered
        ? `Relatorio_Processos_Filtrados_${nowStr}.csv`
        : `Relatorio_Carteira_Processos_Completo_${nowStr}.csv`;
      downloadCsvFile(csvContent, fileName);
      toast.success(`Planilha CSV com ${targetCases.length} processos exportada com sucesso!`);
      setExportModalOpen(false);
    } catch (err) {
      console.error('Erro ao exportar planilha CSV dos processos:', err);
      toast.error('Erro ao gerar arquivo CSV.');
    }
  };

  const handleExportSummaryPdf = (onlyFiltered: boolean = true) => {
    try {
      const targetCases = onlyFiltered ? filteredCases : cases;
      if (targetCases.length === 0) {
        toast.error('Nenhum processo disponível para exportar no filtro atual.');
        return;
      }
      toast.info(`Gerando relatório consolidado de ${targetCases.length} processos em PDF...`);
      const filterInfo = onlyFiltered 
        ? `Filtro ativo: ${targetCases.length} de ${cases.length} processos (Situação: ${statusFilter}, Área: ${areaFilter})`
        : `Todos os processos cadastrados no escritório (${targetCases.length})`;

      const docPdf = generateCasesSummaryPdf(targetCases, {
        title: 'Relatório Geral da Carteira de Processos',
        filterLabel: filterInfo,
        statusFilter,
        areaFilter
      });
      const nowStr = new Date().toISOString().split('T')[0];
      downloadPdfDocument(docPdf, `Relatorio_Carteira_Processos_${nowStr}.pdf`);
      toast.success(`Relatório consolidado de ${targetCases.length} processos baixado com sucesso!`);
      setExportModalOpen(false);
    } catch (err) {
      console.error('Erro ao gerar relatório consolidado em PDF:', err);
      toast.error('Erro ao exportar relatório da carteira.');
    }
  };

  const handleExecuteModalExport = () => {
    setIsExporting(true);
    try {
      if (exportFormat === 'csv') {
        if (exportType === 'summary') {
          handleExportCasesCsv(exportOnlyFiltered);
        } else {
          const target = cases.find(c => c.id === exportTargetCaseId) || filteredCases[0] || cases[0];
          if (!target) {
            toast.error('Selecione um processo para exportar.');
            setIsExporting(false);
            return;
          }
          handleExportSingleCaseCsv(target);
        }
      } else {
        if (exportType === 'summary') {
          handleExportSummaryPdf(exportOnlyFiltered);
        } else {
          const target = cases.find(c => c.id === exportTargetCaseId) || filteredCases[0] || cases[0];
          if (!target) {
            toast.error('Selecione um processo para exportar.');
            setIsExporting(false);
            return;
          }
          handleExportSingleCasePdf(target, {
            includeNotes: exportIncludeNotes,
            includeTasks: exportIncludeTasks,
            includeTimeline: exportIncludeTimeline
          });
          setExportModalOpen(false);
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Messages State
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    if (!selectedCase) {
      setMessages([]);
      return;
    }
    
    setLoadingMessages(true);
    const messagesRef = collection(db, `cases/${selectedCase.id}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseMessage));
      setMessages(msgs);
      setLoadingMessages(false);
    }, (err) => {
      console.error('Error fetching messages:', err);
      toast.error('Erro ao carregar mensagens do cliente.');
      setLoadingMessages(false);
    });

    return () => unsub();
  }, [selectedCase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCase || !auth.currentUser) return;

    try {
      const messagesRef = collection(db, `cases/${selectedCase.id}/messages`);
      await addDoc(messagesRef, {
        caseId: selectedCase.id,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Equipe Almeida Advocacia',
        senderRole: 'admin',
        text: newMessage.trim(),
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Erro ao enviar mensagem.');
    }
  };

  // Form states for creating a new Case
  const [isAdding, setIsAdding] = useState(false);
  const [newCase, setNewCase] = useState({
    title: '',
    clientId: '',
    caseNumber: '',
    area: 'Inventários e Partilhas' as string,
    tribunal: '',
    orgaoJulgador: '',
    processLink: '',
    court: '',
    notes: ''
  });

  // Timeline inputs
  const [newTimelineMsg, setNewTimelineMsg] = useState('');
  // Task inputs
  const [newTaskText, setNewTaskText] = useState('');

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalTitle = newCase.title.trim() || 'Processo Sem Título';
    const clientId = newCase.clientId || 'avulso';
    const selectedClient = clients.find(c => c.id === clientId);
    const clientName = selectedClient ? selectedClient.name : 'Cliente Geral / Avulso';
    const finalCaseNumber = newCase.caseNumber.trim() || 'Pendente / Sem número';
    const tribunal = newCase.tribunal.trim();
    const orgaoJulgador = newCase.orgaoJulgador.trim();
    const processLink = newCase.processLink.trim();
    const combinedCourt = [tribunal, orgaoJulgador].filter(Boolean).join(' - ') || newCase.court.trim() || 'Não especificado';

    try {
      const generatedCaseId = 'case_' + Math.random().toString(36).substr(2, 9);
      const addedData: any = {
        id: generatedCaseId,
        title: finalTitle,
        clientId: clientId,
        clientName: clientName,
        caseNumber: finalCaseNumber,
        status: 'Em andamento' as const,
        area: newCase.area,
        court: combinedCourt,
        notes: newCase.notes,
        userId: auth.currentUser?.uid || '',
        createdBy: auth.currentUser?.email || '',
        timeline: [
          { id: 'initial', date: new Date().toISOString().split('T')[0], message: 'Instalação e distribuição preliminar do processo de representação.' }
        ],
        tasks: [],
        createdAt: new Date().toISOString()
      };

      if (tribunal) addedData.tribunal = tribunal;
      if (orgaoJulgador) addedData.orgaoJulgador = orgaoJulgador;
      if (processLink) addedData.processLink = processLink;

      await setDoc(doc(db, 'cases', generatedCaseId), addedData);
      toast.success('Novo processo cadastrado e integrado com sucesso!');
      setIsAdding(false);
      setNewCase({
        title: '',
        clientId: '',
        caseNumber: '',
        area: 'Inventários e Partilhas',
        tribunal: '',
        orgaoJulgador: '',
        processLink: '',
        court: '',
        notes: ''
      });
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao salvar o processo.');
    }
  };

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;

    const finalTitle = editingCase.title.trim() || 'Processo Sem Título';
    const clientId = editingCase.clientId || 'avulso';
    const selectedClient = clients.find(c => c.id === clientId);
    const clientName = selectedClient ? selectedClient.name : 'Cliente Geral / Avulso';
    const finalCaseNumber = editingCase.caseNumber.trim() || 'Pendente / Sem número';
    const tribunal = editingCase.tribunal?.trim() || '';
    const orgaoJulgador = editingCase.orgaoJulgador?.trim() || '';
    const processLink = editingCase.processLink?.trim() || '';
    const combinedCourt = [tribunal, orgaoJulgador].filter(Boolean).join(' - ') || editingCase.court?.trim() || 'Não especificado';

    try {
      const updatedData: Case = {
        ...editingCase,
        title: finalTitle,
        clientId: clientId,
        clientName: clientName,
        caseNumber: finalCaseNumber,
        area: editingCase.area,
        status: editingCase.status,
        court: combinedCourt,
        tribunal: tribunal || undefined,
        orgaoJulgador: orgaoJulgador || undefined,
        processLink: processLink || undefined,
        notes: editingCase.notes,
        createdAt: editingCase.createdAt,
        value: (editingCase.value !== undefined && editingCase.value !== null) ? Number(editingCase.value) : undefined
      };

      // Clean undefined values to prevent Firestore validation failures
      const cleanData = Object.entries(updatedData).reduce((acc, [key, val]) => {
        if (val !== undefined) {
          acc[key] = val;
        }
        return acc;
      }, {} as any);

      // 1. Update Firestore doc
      await setDoc(doc(db, 'cases', editingCase.id), cleanData);

      // 2. Resilient instant local storage backup update
      const updatedBackupCases = cases.map(c => c.id === editingCase.id ? updatedData : c);
      localStorage.setItem('almeida_backup_cases', JSON.stringify(updatedBackupCases));

      toast.success('Processo atualizado com sucesso!');
      setEditingCase(null);

      // Also sync selectedCase if it's currently open
      if (selectedCase && selectedCase.id === editingCase.id) {
        setSelectedCase(updatedData);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar o processo.');
    }
  };

  const handleToggleTask = async (cs: Case, taskId: string) => {
    const updatedTasks = cs.tasks.map(t => {
      if (t.id === taskId) return { ...t, completed: !t.completed };
      return t;
    });

    try {
      await updateDoc(doc(db, 'cases', cs.id), { tasks: updatedTasks });
      setSelectedCase({ ...cs, tasks: updatedTasks });
      toast.info('Meta de processo atualizada.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTask = async (cs: Case) => {
    if (!newTaskText.trim()) return;
    const newTask: CaseTask = {
      id: Math.random().toString(36).substr(2, 9),
      text: newTaskText,
      completed: false
    };

    const updatedTasks = [...cs.tasks, newTask];
    try {
      await updateDoc(doc(db, 'cases', cs.id), { tasks: updatedTasks });
      setSelectedCase({ ...cs, tasks: updatedTasks });
      setNewTaskText('');
      toast.success('Incumbência adicionada.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTimelineMsg = async (cs: Case) => {
    if (!newTimelineMsg.trim()) return;
    const newTimelineNode: CaseTimeline = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      message: newTimelineMsg
    };

    const updatedTimeline = [newTimelineNode, ...cs.timeline];
    try {
      await updateDoc(doc(db, 'cases', cs.id), { timeline: updatedTimeline });
      setSelectedCase({ ...cs, timeline: updatedTimeline });
      setNewTimelineMsg('');
      toast.success('Movimentação processual registrada.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCase = (id: string) => {
    setDeleteConfirm({
      id,
      title: 'Remover Processo',
      message: 'Tem certeza de que deseja expurgar este processo e todas as suas metas de controle?'
    });
  };

  const handleStatusUpdate = async (cs: Case, newStatus: 'Em andamento' | 'Suspenso' | 'Concluído' | 'Renunciado') => {
    try {
      await updateDoc(doc(db, 'cases', cs.id), { status: newStatus });
      setSelectedCase({ ...cs, status: newStatus });
      toast.success(`Situação do processo atualizada para: ${newStatus}`);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredCases = cases.filter(cs => {
    const matchesSearch = cs.title.toLowerCase().includes(search.toLowerCase()) || 
                          cs.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
                          cs.clientName.toLowerCase().includes(search.toLowerCase());
    
    // Hide completed and renounced cases by default unless showCompleted is toggled on OR they specifically filter by that status
    const isInactive = cs.status === 'Concluído' || cs.status === 'Renunciado';
    if (isInactive && !showCompleted && statusFilter === 'Todos') {
      return false;
    }

    const matchesStatus = statusFilter === 'Todos' || cs.status === statusFilter;
    const matchesArea = areaFilter === 'Todos' || cs.area === areaFilter;
    return matchesSearch && matchesStatus && matchesArea;
  });

  return (
    <div className="space-y-6 text-neutral-100 relative font-sans" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
        <div>
          <h2 className="text-sm font-semibold font-sans text-neutral-200">Painel Geral de Processos e Casos</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Gestão de prazos, tramitação em tribunais e emissão de relatórios.</p>
        </div>
        <div className="flex items-center space-x-2.5 flex-wrap gap-2">
          <button
            onClick={() => handleExportCasesCsv(true)}
            className="px-3.5 py-2 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
            title="Exportar dados dos processos visíveis diretamente em planilha CSV para Excel / Sheets"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => {
              setExportFormat('csv');
              setExportTargetCaseId(filteredCases[0]?.id || cases[0]?.id || '');
              setExportModalOpen(true);
            }}
            className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 border border-neutral-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
            title="Abrir central de exportação com opções de CSV ou PDF"
          >
            <FileDown className="w-4 h-4 text-emerald-400" />
            <span>Relatórios (CSV / PDF)</span>
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Processo</span>
          </button>
        </div>
      </div>

      {/* Filters Search Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
        <div className="relative">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nº processo, título, tribunal, cliente..."
            className="w-full pl-9 pr-4 py-2 border border-neutral-800 bg-neutral-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs rounded-lg text-neutral-200"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs rounded-lg focus:outline-none text-neutral-200 font-sans"
          >
            <option value="Todos">Todas as Situações</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Suspenso">Suspenso</option>
            <option value="Concluído">Concluído</option>
            <option value="Renunciado">Renunciado</option>
          </select>
        </div>

        <div>
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="w-full border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs rounded-lg focus:outline-none text-neutral-200 font-sans"
          >
            <option value="Todos">Todas as Áreas</option>
            <option value="Inventários e Partilhas">Inventários e Partilhas</option>
            <option value="Direito Imobiliário">Direito Imobiliário</option>
            <option value="Direito de Família">Direito de Família</option>
            <option value="Direito Civil e Contratos">Direito Civil e Contratos</option>
            <option value="Registro de Marcas">Registro de Marcas</option>
            <option value="Outros">Outras</option>
          </select>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 text-xs">
          <label className="flex items-center space-x-2 text-neutral-400 hover:text-neutral-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="rounded bg-neutral-950 border-neutral-800 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 h-3.5 w-3.5 cursor-pointer"
            />
            <span className="text-xs font-sans">Exibir concluídos/renunciados</span>
          </label>
          <span className="text-neutral-400 font-sans text-xs">{filteredCases.length} localizados</span>
        </div>
      </div>

      {/* Grid listing */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Cases List */}
        <div className="lg:col-span-12 space-y-4">
          <div className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead className="bg-neutral-950 border-b border-neutral-800 text-xs text-neutral-400 font-sans tracking-normal">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Título do Processo & Tramitação</th>
                  <th className="px-6 py-3.5 font-semibold">Nº Unificado (CNJ)</th>
                  <th className="px-6 py-3.5 font-semibold">Cliente</th>
                  <th className="px-6 py-3.5 font-semibold">Área</th>
                  <th className="px-6 py-3.5 font-semibold">Situação</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 text-xs font-sans">
                {filteredCases.length > 0 ? (
                  filteredCases.map((cs) => (
                    <tr 
                      key={cs.id} 
                      className={`hover:bg-neutral-850/50 cursor-pointer transition-colors ${selectedCase?.id === cs.id ? 'bg-neutral-850' : ''}`}
                      onClick={() => setSelectedCase(cs)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-semibold text-neutral-200 block text-sm">{cs.title}</span>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                          {cs.tribunal && (
                            <span className="px-1.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              {cs.tribunal}
                            </span>
                          )}
                          <span className="text-neutral-400">
                            {cs.orgaoJulgador || cs.court || 'Não especificado'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-neutral-300 text-xs font-sans">
                        {cs.caseNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-emerald-400 text-xs">
                        {cs.clientName}
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <span className="bg-neutral-950 border border-neutral-800 text-xs px-2.5 py-1 rounded-md text-neutral-300 font-medium">
                          {cs.area}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${
                          cs.status === 'Em andamento' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          cs.status === 'Suspenso' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700/50'
                        }`}>
                          {cs.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        {cs.processLink && (
                          <a
                            href={cs.processLink.startsWith('http') ? cs.processLink : `https://${cs.processLink}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1 px-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-all inline-flex items-center space-x-1 cursor-pointer"
                            title="Acessar autos eletrônicos em nova aba"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Autos</span>
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportSingleCaseCsv(cs);
                          }}
                          className="p-1 px-2.5 bg-neutral-800 text-emerald-400 hover:bg-neutral-700 hover:text-emerald-300 rounded-lg text-xs font-medium transition-all inline-flex items-center space-x-1 cursor-pointer"
                          title="Exportar Dados e Andamentos deste Processo em Planilha CSV"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>CSV</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportSingleCasePdf(cs);
                          }}
                          className="p-1 px-2.5 bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white rounded-lg text-xs font-medium transition-all inline-flex items-center space-x-1 cursor-pointer"
                          title="Exportar Relatório deste Processo em PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCase(cs);
                          }}
                          className="p-1 px-2.5 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white rounded-lg text-xs font-medium transition-all inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Diligenciar</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCase(cs);
                          }}
                          className="p-1 px-2.5 bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white rounded-lg text-xs font-medium transition-all inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCase(cs.id);
                          }}
                          className="p-1 px-2.5 bg-red-950/20 hover:bg-red-900/40 text-red-400 rounded-lg text-xs font-medium transition-colors cursor-pointer inline-flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-500 font-sans">Nenhum processo ou caso localizado com os termos solicitados.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Edit/Detailed Drawer Overlay */}
      {selectedCase && (
        <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl bg-neutral-900 border-l border-neutral-800 shadow-2xl z-50 overflow-y-auto p-6 sm:p-8 space-y-6 flex flex-col justify-between font-sans">
          
          <div className="space-y-6">
            {/* Header close */}
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-emerald-400 font-sans">{selectedCase.area}</span>
                <h3 className="text-lg font-bold text-neutral-100 font-sans leading-snug">{selectedCase.title}</h3>
                <p className="text-xs text-neutral-400 font-sans font-medium">{selectedCase.caseNumber}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleExportSingleCaseCsv(selectedCase)}
                  className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-emerald-400 border border-neutral-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Exportar Dados, Timeline e Metas deste Processo em Planilha CSV"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar CSV</span>
                </button>
                <button
                  onClick={() => handleExportSingleCasePdf(selectedCase)}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-sm"
                  title="Exportar Relatório Completo do Processo em PDF"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar PDF</span>
                </button>
                <button 
                  onClick={() => setSelectedCase(null)}
                  className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors focus:outline-none cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tramitação Processual & Autos Card */}
            <div className="bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-4 rounded-xl border border-neutral-800 shadow-sm space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs tracking-wide">
                  <Landmark className="w-4 h-4 text-emerald-400" />
                  <span>Tramitação & Autos Eletrônicos</span>
                </div>
                {selectedCase.tribunal && (
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    {selectedCase.tribunal}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-400 block text-[11px] mb-0.5">Órgão Julgador / Vara:</span>
                  <span className="text-neutral-200 font-medium">{selectedCase.orgaoJulgador || selectedCase.court || 'Não informado'}</span>
                </div>
                <div>
                  <span className="text-neutral-400 block text-[11px] mb-0.5">Tribunal / Comarca:</span>
                  <span className="text-neutral-200 font-medium">{selectedCase.tribunal || 'Não informado'}</span>
                </div>
              </div>

              {/* Link dos autos */}
              <div className="pt-2.5 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  <Link2 className="w-4 h-4 text-neutral-400 shrink-0" />
                  {selectedCase.processLink ? (
                    <a 
                      href={selectedCase.processLink.startsWith('http') ? selectedCase.processLink : `https://${selectedCase.processLink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-400 hover:text-emerald-300 hover:underline truncate font-medium"
                      title={selectedCase.processLink}
                    >
                      {selectedCase.processLink}
                    </a>
                  ) : (
                    <span className="text-xs text-neutral-500 italic">Nenhum link de autos cadastrado para este processo</span>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {selectedCase.processLink && (
                    <>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedCase.processLink || '');
                          toast.success('Link dos autos copiado com sucesso!');
                        }}
                        className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                        title="Copiar link dos autos"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </button>
                      <a
                        href={selectedCase.processLink.startsWith('http') ? selectedCase.processLink : `https://${selectedCase.processLink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Acessar Autos</span>
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setEditingCase(selectedCase);
                    }}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white rounded-lg text-xs font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                    title="Editar informações da tramitação ou link"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>{selectedCase.processLink ? 'Editar' : 'Adicionar Link'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Status Control */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-wrap justify-between items-center gap-4 text-xs font-sans font-medium">
              <span className="text-neutral-400 font-semibold text-xs">Mudar Situação Processual:</span>
              <div className="flex space-x-2">
                {(['Em andamento', 'Suspenso', 'Concluído'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => handleStatusUpdate(selectedCase, st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium font-sans cursor-pointer transition-colors ${
                      selectedCase.status === st 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-neutral-900 text-neutral-400 hover:bg-neutral-850 hover:text-neutral-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Core split: Tasks Checklist & Timeline updates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Checklist Tasks */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-neutral-300 flex items-center space-x-1.5 border-b border-neutral-800 pb-2 font-sans">
                  <CheckSquare className="w-4 h-4 text-emerald-500" />
                  <span>Incumbências do Caso</span>
                </h4>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedCase.tasks && selectedCase.tasks.length > 0 ? (
                    selectedCase.tasks.map((tsk) => (
                      <div 
                        key={tsk.id}
                        onClick={() => handleToggleTask(selectedCase, tsk.id)}
                        className="flex items-center space-x-2.5 p-2 bg-neutral-950 hover:bg-neutral-850/50 rounded-lg cursor-pointer border border-neutral-800 transition-colors text-xs text-neutral-300 font-sans"
                      >
                        {tsk.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-neutral-600 flex-shrink-0 animate-pulse" />
                        )}
                        <span className={tsk.completed ? 'line-through text-neutral-500' : ''}>{tsk.text}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-neutral-500 italic py-2 font-sans">Sem tarefas de diligência cadastradas.</div>
                  )}
                </div>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    placeholder="Adicionar tarefa operacional..."
                    className="flex-grow pl-3 pr-2 py-1.5 border border-neutral-800 bg-neutral-950 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200 font-sans"
                  />
                  <button
                    onClick={() => handleAddTask(selectedCase)}
                    className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Somar
                  </button>
                </div>
              </div>

              {/* Dynamic updates Timeline */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-neutral-300 flex items-center space-x-1.5 border-b border-neutral-800 pb-2 font-sans">
                  <Gavel className="w-4 h-4 text-emerald-500" />
                  <span>Andamentos / Movimentos</span>
                </h4>

                <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                  {selectedCase.timeline && selectedCase.timeline.length > 0 ? (
                    selectedCase.timeline.map((node) => (
                      <div key={node.id} className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 text-xs space-y-1">
                        <div className="flex justify-between text-xs text-emerald-400 font-sans font-medium">
                          <span>Diligência Realizada:</span>
                          <span>{node.date}</span>
                        </div>
                        <p className="text-neutral-300 leading-normal font-sans">{node.message}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-neutral-500 italic py-2 font-sans">Sem andamentos na timeline.</div>
                  )}
                </div>

                <div className="space-y-2">
                  <textarea
                    rows={2}
                    value={newTimelineMsg}
                    onChange={(e) => setNewTimelineMsg(e.target.value)}
                    placeholder="Descrever nova movimentação judicial..."
                    className="w-full pl-3 pr-2 py-1.5 border border-neutral-800 bg-neutral-950 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200 font-sans"
                  />
                  <button
                    onClick={() => handleAddTimelineMsg(selectedCase)}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-xs transition-colors block cursor-pointer"
                  >
                    Registrar Movimentação
                  </button>
                </div>
              </div>

            </div>

            {/* Client Messages Section */}
            <div className="space-y-4 border-t border-neutral-800 pt-5">
              <h4 className="text-xs font-semibold text-neutral-300 flex items-center space-x-1.5 border-b border-neutral-800 pb-2 font-sans">
                <MessageCircle className="w-4 h-4 text-emerald-500" />
                <span>Mensagens do Cliente</span>
              </h4>
              
              <div className="bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col h-64">
                <div className="flex-grow p-3 overflow-y-auto space-y-3 font-sans">
                  {loadingMessages ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-xs text-neutral-500 font-sans">
                      Nenhuma mensagem neste processo.
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isAdminMsg = msg.senderRole === 'admin';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs font-sans ${
                            isAdminMsg 
                              ? 'bg-neutral-800 text-neutral-200 rounded-br-sm border border-neutral-700' 
                              : 'bg-emerald-900/40 text-emerald-100 rounded-bl-sm border border-emerald-800/50'
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-neutral-500 mt-1 px-1 font-sans">
                            {isAdminMsg ? 'Você' : 'Cliente'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
                
                <div className="p-2 border-t border-neutral-800 bg-neutral-900 rounded-b-xl">
                  <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Responder cliente..."
                      className="flex-grow bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-sans"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-2 border-t border-neutral-800 pt-5 text-xs">
              <label className="block text-xs font-semibold text-neutral-300 font-sans">Anotações Internas de Prática Legal:</label>
              <textarea
                rows={4}
                value={selectedCase.notes}
                onChange={async (e) => {
                  setSelectedCase({ ...selectedCase, notes: e.target.value });
                  await updateDoc(doc(db, 'cases', selectedCase.id), { notes: e.target.value });
                }}
                className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed font-sans"
                placeholder="Observações de documentos judiciais rascunhados, contatos de testemunhas chaves..."
              />
              <span className="text-[11px] text-neutral-500 mt-1 block font-sans">Anotações salvas automaticamente no banco de dados.</span>
            </div>

          </div>

          {/* Delete case utility */}
          <div className="border-t border-neutral-800 pt-4 flex justify-between items-center bg-neutral-900 sticky bottom-0 font-sans">
            <span className="text-xs text-neutral-400 font-sans">Cliente ID: {selectedCase.clientId}</span>
            <button
              onClick={() => handleDeleteCase(selectedCase.id)}
              className="px-3 py-1.5 hover:bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/40 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover Processo</span>
            </button>
          </div>

        </div>
      )}

      {/* Cadastration/Creation Modal overlay */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-neutral-100 font-sans">Cadastrar Novo Processo Representativo</h3>
              <button 
                onClick={() => setIsAdding(false)}
                className="p-1 hover:bg-neutral-800 rounded font-semibold text-neutral-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Associar ao Cliente (Opcional)</label>
                <select
                  value={newCase.clientId}
                  onChange={(e) => setNewCase({ ...newCase, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                >
                  <option value="">-- Selecione o Cliente (Opcional) --</option>
                  {clients.map(cli => (
                    <option key={cli.id} value={cli.id}>
                      {cli.name} (CPF {cli.cpf}){cli.status === 'inativo' ? ' [INATIVO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Título Identificador do Processo (Opcional)</label>
                <input
                  type="text"
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  placeholder="Ex: Reclamação Trabalhista vs Empresa XYZ"
                  className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Nº Unificado de Processo (CNJ) (Opcional)</label>
                  <input
                    type="text"
                    value={newCase.caseNumber}
                    onChange={(e) => setNewCase({ ...newCase, caseNumber: e.target.value })}
                    placeholder="Ex: 1002345-67.2026.5.02.0004"
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Sub-Área de Atuação</label>
                  <select
                    value={newCase.area}
                    onChange={(e: any) => setNewCase({ ...newCase, area: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  >
                    <option value="Inventários e Partilhas">Inventários e Partilhas</option>
                    <option value="Direito Imobiliário">Direito Imobiliário</option>
                    <option value="Direito de Família">Direito de Família</option>
                    <option value="Direito Civil e Contratos">Direito Civil e Contratos</option>
                    <option value="Registro de Marcas">Registro de Marcas</option>
                    <option value="Outros">Outras</option>
                  </select>
                </div>
              </div>

              {/* Informações de Tramitação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Tribunal (Ex: TJSP, TRF3, TJMG, STJ)</label>
                  <input
                    type="text"
                    value={newCase.tribunal}
                    onChange={(e) => setNewCase({ ...newCase, tribunal: e.target.value })}
                    placeholder="Ex: TJSP"
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Órgão Julgador / Vara</label>
                  <input
                    type="text"
                    value={newCase.orgaoJulgador}
                    onChange={(e) => setNewCase({ ...newCase, orgaoJulgador: e.target.value })}
                    placeholder="Ex: 2ª Vara Cível da Comarca da Capital"
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              </div>

              {/* Link dos autos / processo */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Link dos Autos / Portal do Processo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={newCase.processLink}
                    onChange={(e) => setNewCase({ ...newCase, processLink: e.target.value })}
                    placeholder="Ex: https://esaj.tjsp.jus.br/cpopg/show.do?processo.codigo=..."
                    className="w-full pl-9 pr-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1 font-sans">Insira a URL para consulta direta dos autos no tribunal ou sistema eletrônico (PJe, e-SAJ, Projudi).</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Anotações de Largada / Sumário</label>
                <textarea
                  rows={2}
                  value={newCase.notes}
                  onChange={(e) => setNewCase({ ...newCase, notes: e.target.value })}
                  placeholder="Direcionamento básico de pretensão e petições..."
                  className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-transform cursor-pointer"
                >
                  Salvar Processo
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full space-y-4">
            <h3 className="text-base font-bold text-neutral-100 font-sans">{deleteConfirm.title}</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-sans">{deleteConfirm.message}</p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-neutral-800 text-neutral-400 hover:bg-neutral-850 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await updateDoc(doc(db, 'cases', deleteConfirm.id), {
                      deleted: true,
                      deletedAt: new Date().toISOString()
                    });
                    setSelectedCase(null);
                    toast.success('Processo ocultado da base (Soft Delete).');
                  } catch (err) {
                    console.error(err);
                    toast.error('Erro ao ocultar processo.');
                  } finally {
                    setDeleteConfirm(null);
                  }
                }}
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Confirmar Ocultação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal overlay */}
      {editingCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 font-sans">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-lg w-full space-y-6 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-base font-bold text-neutral-100 font-sans">Editar Processo Representativo</h3>
              <button 
                onClick={() => setEditingCase(null)}
                className="p-1 hover:bg-neutral-800 rounded font-semibold text-neutral-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateCase} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Associar ao Cliente</label>
                <select
                  value={editingCase.clientId}
                  onChange={(e) => {
                    const selectedClient = clients.find(c => c.id === e.target.value);
                    setEditingCase({ 
                      ...editingCase, 
                      clientId: e.target.value,
                      clientName: selectedClient ? selectedClient.name : 'Cliente Geral / Avulso'
                    });
                  }}
                  className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                >
                  <option value="">-- Selecione o Cliente (Opcional) --</option>
                  <option value="avulso">Cliente Geral / Avulso</option>
                  {clients.map(cli => (
                    <option key={cli.id} value={cli.id}>
                      {cli.name} (CPF {cli.cpf}){cli.status === 'inativo' ? ' [INATIVO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Título Identificador do Processo</label>
                <input
                  type="text"
                  required
                  value={editingCase.title}
                  onChange={(e) => setEditingCase({ ...editingCase, title: e.target.value })}
                  placeholder="Ex: Reclamação Trabalhista vs Empresa XYZ"
                  className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Nº Unificado de Processo (CNJ)</label>
                  <input
                    type="text"
                    value={editingCase.caseNumber}
                    onChange={(e) => setEditingCase({ ...editingCase, caseNumber: e.target.value })}
                    placeholder="Ex: 1002345-67.2026.5.02.0004"
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Sub-Área de Atuação</label>
                  <select
                    value={editingCase.area}
                    onChange={(e: any) => setEditingCase({ ...editingCase, area: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  >
                    <option value="Inventários e Partilhas">Inventários e Partilhas</option>
                    <option value="Direito Imobiliário">Direito Imobiliário</option>
                    <option value="Direito de Família">Direito de Família</option>
                    <option value="Direito Civil e Contratos">Direito Civil e Contratos</option>
                    <option value="Registro de Marcas">Registro de Marcas</option>
                    <option value="Outros">Outras</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Situação do Processo</label>
                  <select
                    value={editingCase.status}
                    onChange={(e: any) => setEditingCase({ ...editingCase, status: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  >
                    <option value="Em andamento">Em andamento</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Renunciado">Renunciado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Valor Estimado do Caso (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCase.value !== undefined ? editingCase.value : ''}
                    onChange={(e) => setEditingCase({ ...editingCase, value: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Ex: 50000.00"
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              </div>

              {/* Informações de Tramitação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Tribunal (Ex: TJSP, TRF3, TJMG, STJ)</label>
                  <input
                    type="text"
                    value={editingCase.tribunal || ''}
                    onChange={(e) => setEditingCase({ ...editingCase, tribunal: e.target.value })}
                    placeholder="Ex: TJSP"
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Órgão Julgador / Vara</label>
                  <input
                    type="text"
                    value={editingCase.orgaoJulgador || ''}
                    onChange={(e) => setEditingCase({ ...editingCase, orgaoJulgador: e.target.value })}
                    placeholder="Ex: 4ª Vara Cível"
                    className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
              </div>

              {/* Link dos autos / processo */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Link dos Autos / Portal do Processo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={editingCase.processLink || ''}
                    onChange={(e) => setEditingCase({ ...editingCase, processLink: e.target.value })}
                    placeholder="Ex: https://esaj.tjsp.jus.br/cpopg/show.do?..."
                    className="w-full pl-9 pr-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1 font-sans">Link de acesso direto aos autos do processo para consulta rápida.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Data de Registro/Abertura</label>
                <input
                  type="date"
                  value={editingCase.createdAt ? editingCase.createdAt.split('T')[0] : ''}
                  onChange={(e) => setEditingCase({ ...editingCase, createdAt: e.target.value ? new Date(e.target.value + 'T12:00:00').toISOString() : new Date().toISOString() })}
                  className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">Descrição / Anotações</label>
                <textarea
                  rows={3}
                  value={editingCase.notes}
                  onChange={(e) => setEditingCase({ ...editingCase, notes: e.target.value })}
                  placeholder="Direcionamento básico de pretensão e petições..."
                  className="w-full px-3 py-2 border border-neutral-800 bg-neutral-950 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 font-sans"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-transform cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Export Options Modal (PDF & CSV) */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-7 rounded-2xl max-w-lg w-full space-y-6 shadow-2xl">
            
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  {exportFormat === 'csv' ? <FileSpreadsheet className="w-5 h-5" /> : <FileDown className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-neutral-100 font-sans">Exportar Relatórios e Dados</h3>
                  <p className="text-xs text-neutral-400">Geração de planilhas CSV para relatórios e BI, ou documentos oficiais em PDF.</p>
                </div>
              </div>
              <button 
                onClick={() => setExportModalOpen(false)}
                className="p-1.5 hover:bg-neutral-800 rounded-lg font-semibold text-neutral-400 hover:text-neutral-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Format Selector: CSV vs PDF */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2 font-sans">
                  Formato do Arquivo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2.5 ${
                      exportFormat === 'csv'
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <FileSpreadsheet className={`w-5 h-5 shrink-0 ${exportFormat === 'csv' ? 'text-emerald-400' : 'text-neutral-500'}`} />
                    <div className="min-w-0">
                      <strong className="text-xs block text-neutral-200 truncate font-sans">Planilha CSV</strong>
                      <span className="text-[10px] text-neutral-400 block truncate font-sans">Excel, Sheets & BI</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2.5 ${
                      exportFormat === 'pdf'
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <FileDown className={`w-5 h-5 shrink-0 ${exportFormat === 'pdf' ? 'text-emerald-400' : 'text-neutral-500'}`} />
                    <div className="min-w-0">
                      <strong className="text-xs block text-neutral-200 truncate font-sans">Documento PDF</strong>
                      <span className="text-[10px] text-neutral-400 block truncate font-sans">Oficial para Impressão</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Report Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2 font-sans">
                  Modalidade do Relatório
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportType('summary')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportType === 'summary'
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs text-neutral-200 font-sans">Consolidado Geral</strong>
                      <span className={`w-2 h-2 rounded-full ${exportType === 'summary' ? 'bg-emerald-400' : 'bg-neutral-700'}`} />
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight font-sans">
                      Visão tabular completa de processos da carteira com dados do cliente e andamentos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportType('single')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      exportType === 'single'
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30 text-white'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs text-neutral-200 font-sans">Processo Específico</strong>
                      <span className={`w-2 h-2 rounded-full ${exportType === 'single' ? 'bg-emerald-400' : 'bg-neutral-700'}`} />
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-tight font-sans">
                      Ficha detalhada com timeline cronológica completa, tarefas e pareceres.
                    </p>
                  </button>
                </div>
              </div>

              {/* Conditional Options */}
              {exportType === 'summary' ? (
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3 font-sans">
                  <span className="text-xs font-semibold text-neutral-300 block">Escopo da Exportação:</span>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center space-x-2.5 cursor-pointer text-neutral-300">
                      <input
                        type="radio"
                        name="summaryScope"
                        checked={exportOnlyFiltered}
                        onChange={() => setExportOnlyFiltered(true)}
                        className="text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Processos filtrados na tela atual (<strong>{filteredCases.length}</strong> encontrados)</span>
                    </label>
                    <label className="flex items-center space-x-2.5 cursor-pointer text-neutral-300">
                      <input
                        type="radio"
                        name="summaryScope"
                        checked={!exportOnlyFiltered}
                        onChange={() => setExportOnlyFiltered(false)}
                        className="text-emerald-500 focus:ring-0 cursor-pointer"
                      />
                      <span>Todos os processos cadastrados no escritório (<strong>{cases.length}</strong> no total)</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-3.5 font-sans">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-300 mb-1.5 font-sans">
                      Selecione o Processo para o Relatório:
                    </label>
                    <select
                      value={exportTargetCaseId}
                      onChange={(e) => setExportTargetCaseId(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-neutral-200 focus:outline-none focus:border-emerald-500 cursor-pointer font-sans"
                    >
                      {cases.map(cs => (
                        <option key={cs.id} value={cs.id}>
                          {cs.title} • Nº {cs.caseNumber || 'S/N'} ({cs.clientName})
                        </option>
                      ))}
                    </select>
                  </div>

                  {exportFormat === 'pdf' && (
                    <div className="space-y-2 pt-2 border-t border-neutral-800/80 font-sans">
                      <span className="text-xs text-neutral-400 block font-semibold font-sans">
                        Seções Incluídas no Relatório PDF:
                      </span>
                      <div className="space-y-2 text-xs text-neutral-300">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exportIncludeTasks}
                            onChange={(e) => setExportIncludeTasks(e.target.checked)}
                            className="rounded border-neutral-800 text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Incumbências operacionais e barra de progresso das metas</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exportIncludeTimeline}
                            onChange={(e) => setExportIncludeTimeline(e.target.checked)}
                            className="rounded border-neutral-800 text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Histórico cronológico de andamentos e movimentações</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exportIncludeNotes}
                            onChange={(e) => setExportIncludeNotes(e.target.checked)}
                            className="rounded border-neutral-800 text-emerald-500 focus:ring-0 cursor-pointer"
                          />
                          <span>Observações e pareceres jurídicos internos</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Informative seal note */}
              <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-850/80 text-[11px] text-neutral-400 leading-relaxed">
                <span className="text-emerald-400 font-semibold">{exportFormat === 'csv' ? 'Compatibilidade Excel / Sheets: ' : 'Padrão OAB / Compliance: '}</span>
                {exportFormat === 'csv' 
                  ? 'Os arquivos CSV utilizam codificação UTF-8 com BOM e delimitadores padronizados, garantindo acentuação perfeita e abertura nativa no Excel e Google Planilhas.'
                  : 'Os relatórios em PDF são formatados em conformidade com o Art. 7º, II do Estatuto da Advocacia, com cabeçalho oficial e identificação profissional.'}
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end space-x-3 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="px-4 py-2 border border-neutral-800 text-neutral-300 hover:bg-neutral-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteModalExport}
                disabled={isExporting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center space-x-2 cursor-pointer shadow-md shadow-emerald-950/50"
              >
                {exportFormat === 'csv' ? <FileSpreadsheet className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                <span>{isExporting ? 'Exportando Dados...' : (exportFormat === 'csv' ? 'Baixar Planilha CSV' : 'Baixar Arquivo PDF')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
