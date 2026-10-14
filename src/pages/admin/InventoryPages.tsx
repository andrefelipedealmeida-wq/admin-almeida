import React, { useEffect, useState } from 'react';
import { 
  FolderGit, 
  Plus, 
  Trash2, 
  User, 
  DollarSign, 
  ShieldAlert, 
  Scale, 
  HelpCircle,
  X,
  PlusCircle,
  Gem,
  Award,
  CircleDot,
  Edit,
  Check,
  FileText,
  Printer,
  FileCheck,
  ClipboardList,
  FolderOpen,
  AlertCircle
} from 'lucide-react';
import { InventoryCase, Heir, Asset, Debt, Client } from '../../types';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface InventoryPagesProps {
  inventories: InventoryCase[];
  clients: Client[];
}

const isNonNegativeFiniteNumber = (value: unknown) => {
  if (typeof value === 'string' && value.trim() === '') return false;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0;
};

const isPercentage = (value: unknown) => isNonNegativeFiniteNumber(value) && Number(value) <= 100;

const numberOrDefault = (value: unknown, fallback: number) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getAssetColorConfig = (type: string) => {
  const normType = (type || '').trim().toLowerCase();
  if (normType === 'imóvel' || normType === 'imovel') {
    return {
      text: 'text-emerald-400',
      border: 'border-emerald-900/45',
      activeBorder: 'border-emerald-500',
      activeBg: 'bg-emerald-950/20',
      shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.15)]',
      bullet: 'bg-emerald-500',
      borderLeft: 'border-l-emerald-500',
      badge: 'bg-emerald-950/40 text-emerald-450 border-emerald-900/40'
    };
  }
  if (normType === 'veículo' || normType === 'veiculo') {
    return {
      text: 'text-sky-400',
      border: 'border-sky-900/45',
      activeBorder: 'border-sky-500',
      activeBg: 'bg-sky-950/20',
      shadow: 'shadow-[0_0_8px_rgba(56,189,248,0.15)]',
      bullet: 'bg-sky-500',
      borderLeft: 'border-l-sky-500',
      badge: 'bg-sky-950/40 text-sky-400 border-sky-900/40'
    };
  }
  if (normType === 'dinheiro') {
    return {
      text: 'text-violet-400',
      border: 'border-violet-900/45',
      activeBorder: 'border-violet-500',
      activeBg: 'bg-violet-950/20',
      shadow: 'shadow-[0_0_8px_rgba(139,92,246,0.15)]',
      bullet: 'bg-violet-500',
      borderLeft: 'border-l-violet-500',
      badge: 'bg-violet-950/40 text-violet-400 border-violet-900/40'
    };
  }
  if (normType === 'saldo bancário' || normType === 'saldo bancario' || normType === 'saldo') {
    return {
      text: 'text-purple-400',
      border: 'border-purple-900/45',
      activeBorder: 'border-purple-500',
      activeBg: 'bg-purple-950/20',
      shadow: 'shadow-[0_0_8px_rgba(168,85,247,0.15)]',
      bullet: 'bg-purple-500',
      borderLeft: 'border-l-purple-500',
      badge: 'bg-purple-950/40 text-purple-400 border-purple-900/40'
    };
  }
  if (normType === 'ações' || normType === 'acoes' || normType === 'ação' || normType === 'acao' || normType === 'investimentos' || normType === 'investimento') {
    return {
      text: 'text-indigo-400',
      border: 'border-indigo-900/45',
      activeBorder: 'border-indigo-500',
      activeBg: 'bg-indigo-950/20',
      shadow: 'shadow-[0_0_8px_rgba(99,102,241,0.15)]',
      bullet: 'bg-indigo-500',
      borderLeft: 'border-l-indigo-500',
      badge: 'bg-indigo-950/40 text-indigo-400 border-indigo-900/40'
    };
  }
  if (normType === 'direitos' || normType === 'direito' || normType === 'crédito' || normType === 'credito') {
    return {
      text: 'text-amber-400',
      border: 'border-amber-900/45',
      activeBorder: 'border-amber-500',
      activeBg: 'bg-amber-950/20',
      shadow: 'shadow-[0_0_8px_rgba(245,158,11,0.15)]',
      bullet: 'bg-amber-500',
      borderLeft: 'border-l-amber-500',
      badge: 'bg-amber-950/40 text-amber-400 border-amber-900/40'
    };
  }
  // Default/Outro
  return {
    text: 'text-rose-400',
    border: 'border-rose-900/45',
    activeBorder: 'border-rose-500',
    activeBg: 'bg-rose-950/20',
    shadow: 'shadow-[0_0_8px_rgba(244,63,94,0.15)]',
    bullet: 'bg-rose-500',
    borderLeft: 'border-l-rose-500',
    badge: 'bg-rose-950/40 text-rose-400 border-rose-900/40'
  };
};

export default function InventoryPages({ inventories, clients }: InventoryPagesProps) {
  const [selectedCase, setSelectedCase] = useState<InventoryCase | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; message: string } | null>(null);
  const [isAddingCase, setIsAddingCase] = useState(false);
  const [isCreatingCase, setIsCreatingCase] = useState(false);
  const [newCase, setNewCase] = useState({
    title: '',
    clientId: '',
    itcmdRate: 4,
    attorneyFeeRate: 6,
    courtFeeRate: 1,
    notes: ''
  });

  // Inputs for additions inside case detail
  const [newHeir, setNewHeir] = useState({ name: '', relationship: '', percentage: 0 });
  const [newAsset, setNewAsset] = useState<any>({ type: 'Imóvel', description: '', value: '', exemptITCMD: false, heirId: '' });
  const [newDebt, setNewDebt] = useState({ description: '', value: '', heirId: '' });

  // Document states
  const [newDoc, setNewDoc] = useState({
    title: '',
    status: 'Pendente' as 'Pendente' | 'Entregue' | 'Em Análise' | 'Rejeitado' | 'Não se aplica',
    relatedToType: 'general' as 'part' | 'asset' | 'general',
    relatedToId: '',
    notes: ''
  });
  const [docFilter, setDocFilter] = useState<'all' | 'general' | 'part' | 'asset'>('all');
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const [individualFilter, setIndividualFilter] = useState<{ type: 'part' | 'asset'; id: string; name: string } | null>(null);

  // Editing state for existing assets
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<any>({ type: 'Imóvel', description: '', value: '', exemptITCMD: false });

  // Firestore listeners can receive edits made in another tab or by another authorized user.
  // Keep the opened record synchronized so later edits do not start from an obsolete copy.
  useEffect(() => {
    if (!selectedCase) return;
    const current = inventories.find(item => item.id === selectedCase.id);
    setSelectedCase(current || null);
  }, [inventories, selectedCase?.id]);

  // Document methods
  const cleanDocForFirestore = (docObj: any) => {
    const clean: any = {};
    Object.keys(docObj).forEach(key => {
      if (docObj[key] !== undefined) {
        clean[key] = docObj[key];
      }
    });
    return clean;
  };

  const getEffectiveDocuments = (cs: InventoryCase) => {
    const list: any[] = [];
    
    // 1. General De Cujus / Espólio / Outros Gerais
    const generalDocs = [
      { id: 'general_rg_cpf_decujus', title: '1a) Cópia autenticada do CPF do "de cujus"', relatedToType: 'general' },
      { id: 'general_rg_cpf_viuvo', title: '1b) Cópia autenticada do CPF da(o) viúva(o)', relatedToType: 'general' },
      { id: 'general_estado_civil_decujus', title: '2) Comprovante de estado civil do "de cujus" atualizado', relatedToType: 'general' },
      { id: 'general_obito', title: '3) Certidão de óbito Atualizada', relatedToType: 'general' },
      { id: 'general_testamento', title: '4) Negativa de testamento (CENSEC)', relatedToType: 'general' },
      { id: 'general_debitos_municipais', title: '8) Certidão negativa de débitos municipais', relatedToType: 'general' },
      { id: 'general_cnd_rfb', title: '9) CND Receita Federal', relatedToType: 'general' },
      { id: 'general_declaracao_itcmd', title: '11) Declaração do ITCMD', relatedToType: 'general' },
      { id: 'general_guias_itcmd', title: '12) Guias de ITCMD recolhidas, se houver', relatedToType: 'general' },
      { id: 'general_esboco_partilha', title: '15) Esboço da partilha', relatedToType: 'general' }
    ];

    generalDocs.forEach(d => {
      list.push({
        id: d.id,
        title: d.title,
        status: 'Pendente',
        relatedToType: d.relatedToType
      });
    });

    // 2. Partes (Heirs)
    cs.heirs.forEach(h => {
      list.push({
        id: `heir_${h.id}_rg_cpf`,
        title: `1a) Cópia autenticada do CPF - Herdeiro: ${h.name}`,
        relatedToType: 'part',
        relatedToId: h.id,
        relatedToName: h.name,
        status: 'Pendente'
      });
      list.push({
        id: `heir_${h.id}_rg_cpf_conjuge`,
        title: `1b) Cópia autenticada do CPF do cônjuge do Herdeiro: ${h.name}`,
        relatedToType: 'part',
        relatedToId: h.id,
        relatedToName: h.name,
        status: 'Pendente'
      });
      list.push({
        id: `heir_${h.id}_estado_civil`,
        title: `2) Comprovante de estado civil atualizado - Herdeiro: ${h.name}`,
        relatedToType: 'part',
        relatedToId: h.id,
        relatedToName: h.name,
        status: 'Pendente'
      });
    });

    // 3. Bens (Assets)
    cs.assets.forEach(a => {
      if (a.type === 'Imóvel') {
        list.push({
          id: `asset_${a.id}_matricula`,
          title: `5) Certidão atualizada da matrícula (RI) - Imóvel: ${a.description}`,
          relatedToType: 'asset',
          relatedToId: a.id,
          relatedToName: `Imóvel - ${a.description}`,
          status: 'Pendente'
        });
        list.push({
          id: `asset_${a.id}_iptu`,
          title: `6) Carnê de IPTU ou certidão do valor venal do ano do falecimento e corrente exercício - Imóvel: ${a.description}`,
          relatedToType: 'asset',
          relatedToId: a.id,
          relatedToName: `Imóvel - ${a.description}`,
          status: 'Pendente'
        });
        list.push({
          id: `asset_${a.id}_ref_value`,
          title: `7) Certidão de Valor de Referência, se aplicável - Imóvel: ${a.description}`,
          relatedToType: 'asset',
          relatedToId: a.id,
          relatedToName: `Imóvel - ${a.description}`,
          status: 'Pendente'
        });
        list.push({
          id: `asset_${a.id}_itr_ccir`,
          title: `13) Último ITR e CCIR e do ano do falecimento (imóvel rural) - Imóvel: ${a.description}`,
          relatedToType: 'asset',
          relatedToId: a.id,
          relatedToName: `Imóvel - ${a.description}`,
          status: 'Pendente'
        });
      } else if (a.type === 'Veículo') {
        list.push({
          id: `asset_${a.id}_crlv`,
          title: `10a) CRLV / Documento do veículo - Veículo: ${a.description}`,
          relatedToType: 'asset',
          relatedToId: a.id,
          relatedToName: `Veículo - ${a.description}`,
          status: 'Pendente'
        });
        list.push({
          id: `asset_${a.id}_fipe`,
          title: `10b) Avaliação da tabela FIPE - Veículo: ${a.description}`,
          relatedToType: 'asset',
          relatedToId: a.id,
          relatedToName: `Veículo - ${a.description}`,
          status: 'Pendente'
        });
      } else {
        const descLower = a.description.toLowerCase();
        if (descLower.includes('empresa') || descLower.includes('quota') || descLower.includes('cota') || descLower.includes('participação') || descLower.includes('ltda')) {
          list.push({
            id: `asset_${a.id}_contrato_social`,
            title: `14a) Contrato social consolidado - Empresa: ${a.description}`,
            relatedToType: 'asset',
            relatedToId: a.id,
            relatedToName: `${a.type} - ${a.description}`,
            status: 'Pendente'
          });
          list.push({
            id: `asset_${a.id}_balanco`,
            title: `14b) Balanço Patrimonial do exercício anterior - Empresa: ${a.description}`,
            relatedToType: 'asset',
            relatedToId: a.id,
            relatedToName: `${a.type} - ${a.description}`,
            status: 'Pendente'
          });
        } else {
          list.push({
            id: `asset_${a.id}_extrato`,
            title: `10) Comprovante de saldo / titularidade - Ativo: ${a.description}`,
            relatedToType: 'asset',
            relatedToId: a.id,
            relatedToName: `${a.type} - ${a.description}`,
            status: 'Pendente'
          });
        }
      }
    });

    const savedDocs = cs.documents || [];
    
    // Merge standard required docs with saved statuses
    const finalDocs = list.map(reqDoc => {
      const saved = savedDocs.find(sd => sd.id === reqDoc.id);
      if (saved) {
        return {
          ...reqDoc,
          status: saved.status,
          notes: saved.notes || '',
          updatedAt: saved.updatedAt
        };
      }
      return reqDoc;
    });

    // Append user custom documents (not standard)
    const reqDocIds = new Set(list.map(d => d.id));
    const customDocs = savedDocs.filter(sd => !reqDocIds.has(sd.id));

    return [...finalDocs, ...customDocs];
  };

  const handleAddDocument = async (cs: InventoryCase) => {
    if (!newDoc.title.trim()) {
      toast.error('O título do documento é obrigatório.');
      return;
    }
    if (newDoc.relatedToType !== 'general' && !newDoc.relatedToId) {
      toast.error('Selecione o herdeiro ou bem ao qual o documento será vinculado.');
      return;
    }

    let relatedToName = '';
    if (newDoc.relatedToType === 'part') {
      const heir = cs.heirs.find(h => h.id === newDoc.relatedToId);
      relatedToName = heir ? heir.name : '';
    } else if (newDoc.relatedToType === 'asset') {
      const asset = cs.assets.find(a => a.id === newDoc.relatedToId);
      relatedToName = asset ? `${asset.type} - ${asset.description}` : '';
    }

    const docItem: any = {
      id: 'custom_' + Math.random().toString(36).substring(2, 9),
      title: newDoc.title.trim(),
      status: newDoc.status,
      relatedToType: newDoc.relatedToType,
      updatedAt: new Date().toISOString()
    };

    if (newDoc.relatedToId) docItem.relatedToId = newDoc.relatedToId;
    if (relatedToName) docItem.relatedToName = relatedToName;
    if (newDoc.notes.trim()) docItem.notes = newDoc.notes.trim();

    const currentDocs = cs.documents || [];
    const updatedDocs = [...currentDocs, docItem].map(cleanDocForFirestore);

    try {
      await updateDoc(doc(db, 'inventories', cs.id), {
        documents: updatedDocs
      });
      setSelectedCase({ ...cs, documents: updatedDocs });
      setNewDoc({
        title: '',
        status: 'Pendente',
        relatedToType: 'general',
        relatedToId: '',
        notes: ''
      });
      toast.success('Documento customizado adicionado ao controle!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao adicionar documento.');
    }
  };

  const handleUpdateDocumentStatus = async (cs: InventoryCase, docId: string, newStatus: 'Pendente' | 'Entregue' | 'Em Análise' | 'Rejeitado' | 'Não se aplica') => {
    const currentDocs = cs.documents || [];
    const effectiveList = getEffectiveDocuments(cs);
    const targetDoc = effectiveList.find(d => d.id === docId);
    if (!targetDoc) return;

    let updatedDocs;
    if (currentDocs.some(d => d.id === docId)) {
      updatedDocs = currentDocs.map(d =>
        d.id === docId ? { ...d, status: newStatus, updatedAt: new Date().toISOString() } : d
      );
    } else {
      updatedDocs = [
        ...currentDocs,
        {
          id: docId,
          title: targetDoc.title,
          status: newStatus,
          relatedToType: targetDoc.relatedToType,
          relatedToId: targetDoc.relatedToId,
          relatedToName: targetDoc.relatedToName,
          updatedAt: new Date().toISOString()
        }
      ];
    }

    const cleaned = updatedDocs.map(cleanDocForFirestore);

    try {
      await updateDoc(doc(db, 'inventories', cs.id), {
        documents: cleaned
      });
      setSelectedCase({ ...cs, documents: cleaned });
      toast.success('Status do documento atualizado.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status.');
    }
  };

  const handleUpdateDocumentNotes = async (cs: InventoryCase, docId: string, notes: string) => {
    const currentDocs = cs.documents || [];
    const effectiveList = getEffectiveDocuments(cs);
    const targetDoc = effectiveList.find(d => d.id === docId);
    if (!targetDoc) return;

    let updatedDocs;
    if (currentDocs.some(d => d.id === docId)) {
      updatedDocs = currentDocs.map(d =>
        d.id === docId ? { ...d, notes: notes.trim(), updatedAt: new Date().toISOString() } : d
      );
    } else {
      updatedDocs = [
        ...currentDocs,
        {
          id: docId,
          title: targetDoc.title,
          status: 'Pendente',
          relatedToType: targetDoc.relatedToType,
          relatedToId: targetDoc.relatedToId,
          relatedToName: targetDoc.relatedToName,
          notes: notes.trim(),
          updatedAt: new Date().toISOString()
        }
      ];
    }

    const cleaned = updatedDocs.map(cleanDocForFirestore);

    try {
      await updateDoc(doc(db, 'inventories', cs.id), {
        documents: cleaned
      });
      setSelectedCase({ ...cs, documents: cleaned });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar observações.');
    }
  };

  const handleDeleteDocument = async (cs: InventoryCase, docId: string) => {
    const currentDocs = cs.documents || [];
    const isCustom = !docId.startsWith('general_') && !docId.startsWith('heir_') && !docId.startsWith('asset_');

    if (!isCustom) {
      // Standard required document: clear its db entry to restore default 'Pendente' status
      const updatedDocs = currentDocs.filter(d => d.id !== docId);
      const cleaned = updatedDocs.map(cleanDocForFirestore);
      try {
        await updateDoc(doc(db, 'inventories', cs.id), {
          documents: cleaned
        });
        setSelectedCase({ ...cs, documents: cleaned });
        toast.success('Documento redefinido para Pendente.');
      } catch (err) {
        console.error(err);
        toast.error('Erro ao redefinir documento.');
      }
    } else {
      // Custom document: remove completely
      const updatedDocs = currentDocs.filter(d => d.id !== docId);
      const cleaned = updatedDocs.map(cleanDocForFirestore);
      try {
        await updateDoc(doc(db, 'inventories', cs.id), {
          documents: cleaned
        });
        setSelectedCase({ ...cs, documents: cleaned });
        toast.success('Documento customizado removido.');
      } catch (err) {
        console.error(err);
        toast.error('Erro ao remover documento.');
      }
    }
  };

  const handleResetAllDocs = async (cs: InventoryCase) => {
    try {
      await updateDoc(doc(db, 'inventories', cs.id), {
        documents: []
      });
      setSelectedCase({ ...cs, documents: [] });
      toast.success('Todos os status de documentos foram redefinidos para Pendente.');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao redefinir documentos.');
    }
  };

  // Editing state for Inventory cases
  const [editingCase, setEditingCase] = useState<InventoryCase | null>(null);
  const [editCaseForm, setEditCaseForm] = useState({
    title: '',
    clientId: '',
    itcmdRate: 4,
    attorneyFeeRate: 6,
    courtFeeRate: 1,
    attorneyFeeType: 'percentage' as 'percentage' | 'fixed',
    attorneyFeeValue: 0,
    courtFeeType: 'percentage' as 'percentage' | 'fixed',
    courtFeeValue: 0,
    notes: ''
  });

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingCase) return;
    if (!newCase.title.trim() || !newCase.clientId) {
      toast.error('Preencha os campos obrigatórios (*).');
      return;
    }

    if (![newCase.itcmdRate, newCase.attorneyFeeRate, newCase.courtFeeRate].every(isPercentage)) {
      toast.error('As alíquotas devem estar entre 0% e 100%.');
      return;
    }

    const selectedClient = clients.find(c => c.id === newCase.clientId);
    if (!selectedClient) return;

    setIsCreatingCase(true);
    try {
      const addedData = {
        title: newCase.title.trim(),
        clientId: newCase.clientId,
        clientName: selectedClient.name,
        heirs: [],
        assets: [],
        debts: [],
        itcmdRate: Number(newCase.itcmdRate),
        attorneyFeeRate: Number(newCase.attorneyFeeRate),
        courtFeeRate: Number(newCase.courtFeeRate),
        notes: newCase.notes.trim(),
        userId: auth.currentUser?.uid || '',
        createdBy: auth.currentUser?.email || '',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'inventories'), addedData);
      toast.success('Ficha de inventário de bens aberta com sucesso!');
      setIsAddingCase(false);
      setNewCase({
        title: '',
        clientId: '',
        itcmdRate: 4,
        attorneyFeeRate: 6,
        courtFeeRate: 1,
        notes: ''
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir inventário.');
    } finally {
      setIsCreatingCase(false);
    }
  };

  const handleOpenEditCase = (cs: InventoryCase, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCase(cs);
    setEditCaseForm({
      title: cs.title,
      clientId: cs.clientId,
      itcmdRate: cs.itcmdRate ?? 4,
      courtFeeRate: cs.courtFeeRate ?? 1,
      attorneyFeeRate: cs.attorneyFeeRate ?? 6,
      attorneyFeeType: cs.attorneyFeeType ?? 'percentage',
      attorneyFeeValue: cs.attorneyFeeValue ?? 0,
      courtFeeType: cs.courtFeeType ?? 'percentage',
      courtFeeValue: cs.courtFeeValue ?? 0,
      notes: cs.notes ?? ''
    });
  };

  const handleSaveEditCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCase) return;

    if (!editCaseForm.title.trim() || !editCaseForm.clientId) {
      toast.error('Preencha os campos obrigatórios (*).');
      return;
    }

    if (
      !isPercentage(editCaseForm.itcmdRate)
      || (editCaseForm.attorneyFeeType === 'percentage' && !isPercentage(editCaseForm.attorneyFeeRate))
      || (editCaseForm.courtFeeType === 'percentage' && !isPercentage(editCaseForm.courtFeeRate))
      || (editCaseForm.attorneyFeeType === 'fixed' && !isNonNegativeFiniteNumber(editCaseForm.attorneyFeeValue))
      || (editCaseForm.courtFeeType === 'fixed' && !isNonNegativeFiniteNumber(editCaseForm.courtFeeValue))
    ) {
      toast.error('Informe alíquotas entre 0% e 100% e valores fixos não negativos.');
      return;
    }

    const selectedClient = clients.find(c => c.id === editCaseForm.clientId);
    if (!selectedClient) return;

    try {
      const updates = {
        title: editCaseForm.title.trim(),
        clientId: editCaseForm.clientId,
        clientName: selectedClient.name,
        itcmdRate: Number(editCaseForm.itcmdRate),
        courtFeeRate: Number(editCaseForm.courtFeeRate),
        courtFeeType: editCaseForm.courtFeeType,
        courtFeeValue: Number(editCaseForm.courtFeeValue),
        attorneyFeeRate: Number(editCaseForm.attorneyFeeRate),
        attorneyFeeType: editCaseForm.attorneyFeeType,
        attorneyFeeValue: Number(editCaseForm.attorneyFeeValue),
        notes: editCaseForm.notes.trim()
      };

      await updateDoc(doc(db, 'inventories', editingCase.id), updates);
      
      // Update local state so details view reflects immediately if selected
      if (selectedCase && selectedCase.id === editingCase.id) {
        setSelectedCase({ ...selectedCase, ...updates });
      }
      
      toast.success('Inventário atualizado com sucesso!');
      setEditingCase(null);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar inventário.');
    }
  };

  const handleAddField = async (cs: InventoryCase, type: 'heirs' | 'assets' | 'debts') => {
    let updatedList: any[] = [];
    
    if (type === 'heirs') {
      if (!newHeir.name.trim() || !newHeir.relationship.trim()) {
        toast.error('Informe o nome e o parentesco do herdeiro.');
        return;
      }
      const heirNode: Heir = {
        id: Math.random().toString(36).substr(2, 9),
        name: newHeir.name.trim(),
        relationship: newHeir.relationship.trim(),
        percentage: 0
      };
      updatedList = [...cs.heirs, heirNode];
      setNewHeir({ name: '', relationship: '', percentage: 0 });
    } else if (type === 'assets') {
      if (!newAsset.description.trim() || !isNonNegativeFiniteNumber(newAsset.value)) {
        toast.error('Informe uma descrição e um valor não negativo para o bem.');
        return;
      }
      const assetNode: Asset = {
        id: Math.random().toString(36).substr(2, 9),
        type: newAsset.type,
        description: newAsset.description.trim(),
        value: Number(newAsset.value),
        exemptITCMD: !!newAsset.exemptITCMD,
        heirId: newAsset.heirId || ''
      };
      updatedList = [...cs.assets, assetNode];
      setNewAsset({ type: 'Imóvel', description: '', value: '', exemptITCMD: false, heirId: '' });
    } else if (type === 'debts') {
      if (!newDebt.description.trim() || !isNonNegativeFiniteNumber(newDebt.value)) {
        toast.error('Informe uma descrição e um valor não negativo para a dívida.');
        return;
      }
      const debtNode: Debt = {
        id: Math.random().toString(36).substr(2, 9),
        description: newDebt.description.trim(),
        value: Number(newDebt.value),
        heirId: newDebt.heirId || ''
      };
      updatedList = [...cs.debts, debtNode];
      setNewDebt({ description: '', value: '', heirId: '' });
    }

    try {
      await updateDoc(doc(db, 'inventories', cs.id), { [type]: updatedList });
      setSelectedCase({ ...cs, [type]: updatedList });
      toast.success('Metas de partilha atualizadas.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteField = async (cs: InventoryCase, type: 'heirs' | 'assets' | 'debts', elementId: string) => {
    const updatedList = (cs[type] as any[]).filter(element => element.id !== elementId);
    const updates: Partial<InventoryCase> = { [type]: updatedList };

    if (type === 'heirs') {
      updates.assets = cs.assets.map(asset => asset.heirId === elementId ? { ...asset, heirId: '' } : asset);
      updates.debts = cs.debts.map(debt => debt.heirId === elementId ? { ...debt, heirId: '' } : debt);
    }

    if (type === 'heirs' || type === 'assets') {
      updates.documents = (cs.documents || []).filter(document => document.relatedToId !== elementId);
    }
    
    try {
      await updateDoc(doc(db, 'inventories', cs.id), updates);
      setSelectedCase({ ...cs, ...updates });
      toast.info('Item removido do cálculo.');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateConfig = async (cs: InventoryCase, updates: Partial<InventoryCase>) => {
    const percentageFields: Array<keyof InventoryCase> = ['itcmdRate', 'attorneyFeeRate', 'courtFeeRate'];
    const fixedValueFields: Array<keyof InventoryCase> = ['attorneyFeeValue', 'courtFeeValue'];
    if (percentageFields.some(field => field in updates && !isPercentage(updates[field]))) {
      toast.error('As alíquotas devem estar entre 0% e 100%.');
      return;
    }
    if (fixedValueFields.some(field => field in updates && !isNonNegativeFiniteNumber(updates[field]))) {
      toast.error('Os valores fixos não podem ser negativos.');
      return;
    }
    try {
      await updateDoc(doc(db, 'inventories', cs.id), updates);
      setSelectedCase({ ...cs, ...updates });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEditedAsset = async (cs: InventoryCase, assetId: string) => {
    if (!editingAsset.description.trim() || !isNonNegativeFiniteNumber(editingAsset.value)) {
      toast.error('Preencha a descrição e um valor não negativo para o bem.');
      return;
    }

    const updatedAssets = cs.assets.map(a => {
      if (a.id === assetId) {
        return {
          ...a,
          type: editingAsset.type,
          description: editingAsset.description.trim(),
          value: Number(editingAsset.value),
          exemptITCMD: !!editingAsset.exemptITCMD,
          heirId: editingAsset.heirId || ''
        };
      }
      return a;
    });

    try {
      await updateDoc(doc(db, 'inventories', cs.id), { assets: updatedAssets });
      setSelectedCase({ ...cs, assets: updatedAssets });
      setEditingAssetId(null);
      toast.success('Bem atualizado com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar bem.');
    }
  };

  const handleUpdateHeirPercentage = async (cs: InventoryCase, heirId: string, percentage: number) => {
    if (!isPercentage(percentage)) {
      toast.error('O quinhão deve estar entre 0% e 100%.');
      return;
    }
    const updatedHeirs = cs.heirs.map(h => {
      if (h.id === heirId) {
        return { ...h, percentage };
      }
      return h;
    });

    try {
      await updateDoc(doc(db, 'inventories', cs.id), { heirs: updatedHeirs });
      setSelectedCase({ ...cs, heirs: updatedHeirs });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar porcentagem.');
    }
  };

  const handleSplitEqually = async (cs: InventoryCase) => {
    if (!cs.heirs || cs.heirs.length === 0) return;
    const equalShare = Number((100 / cs.heirs.length).toFixed(2));
    const updatedHeirs = cs.heirs.map((h, index) => {
      if (index === cs.heirs.length - 1) {
        const sumOfOthers = equalShare * (cs.heirs.length - 1);
        const lastShare = Number((100 - sumOfOthers).toFixed(2));
        return { ...h, percentage: lastShare };
      }
      return { ...h, percentage: equalShare };
    });

    try {
      await updateDoc(doc(db, 'inventories', cs.id), { heirs: updatedHeirs });
      setSelectedCase({ ...cs, heirs: updatedHeirs });
      toast.success('Quinhões divididos igualmente entre os herdeiros!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao dividir quinhões igualmente.');
    }
  };

  const handleUpdateDebtHeir = async (cs: InventoryCase, debtId: string, heirId: string) => {
    const updatedDebts = cs.debts.map(d => {
      if (d.id === debtId) {
        return { ...d, heirId };
      }
      return d;
    });

    try {
      await updateDoc(doc(db, 'inventories', cs.id), { debts: updatedDebts });
      setSelectedCase({ ...cs, debts: updatedDebts });
      toast.success('Vínculo de passivo/dívida atualizado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao vincular dívida.');
    }
  };

  const handleLinkAssetToHeir = async (cs: InventoryCase, assetId: string, heirId: string) => {
    const updatedAssets = cs.assets.map(a => {
      if (a.id === assetId) {
        return { ...a, heirId };
      }
      return a;
    });

    try {
      await updateDoc(doc(db, 'inventories', cs.id), { assets: updatedAssets });
      setSelectedCase({ ...cs, assets: updatedAssets });
      toast.success('Vínculo de bem atualizado!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao vincular bem.');
    }
  };

  const handlePrintPDF = (cs: InventoryCase, math: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Por favor, permita popups para gerar o relatório impresso.');
      return;
    }

    const getAssetPrintColors = (type: string) => {
      const normType = (type || '').trim().toLowerCase();
      if (normType === 'imóvel' || normType === 'imovel') {
        return { bg: '#E6F4EA', text: '#137333', border: '#81C995' };
      }
      if (normType === 'veículo' || normType === 'veiculo') {
        return { bg: '#E8F0FE', text: '#1A73E8', border: '#8AB4F8' };
      }
      if (normType === 'dinheiro') {
        return { bg: '#F3E8FF', text: '#6B21A8', border: '#D8B4FE' };
      }
      if (normType === 'saldo bancário' || normType === 'saldo bancario' || normType === 'saldo') {
        return { bg: '#FAE8FF', text: '#86198F', border: '#F5D0FE' };
      }
      if (normType === 'ações' || normType === 'acoes' || normType === 'ação' || normType === 'acao' || normType === 'investimentos' || normType === 'investimento') {
        return { bg: '#E0E7FF', text: '#3730A3', border: '#C7D2FE' };
      }
      if (normType === 'direitos' || normType === 'direito' || normType === 'crédito' || normType === 'credito') {
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      }
      return { bg: '#FFE4E6', text: '#9F1239', border: '#FECDD3' };
    };

    const getHeirColor = (index: number) => {
      const colors = [
        { bg: '#E6F4EA', text: '#137333', border: '#10B981' },
        { bg: '#E8F0FE', text: '#1A73E8', border: '#3B82F6' },
        { bg: '#F3E8FF', text: '#6B21A8', border: '#8B5CF6' },
        { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
        { bg: '#FFE4E6', text: '#9F1239', border: '#EC4899' },
        { bg: '#E0F7FA', text: '#006064', border: '#06B6D4' },
        { bg: '#FFF0F6', text: '#C2185B', border: '#F43F5E' },
      ];
      return colors[index % colors.length];
    };

    const assetsRows = cs.assets.map(a => {
      const colors = getAssetPrintColors(a.type);
      const matchedHeir = a.heirId ? cs.heirs.find(h => h.id === a.heirId) : null;
      const heirBadge = matchedHeir 
        ? `<div style="margin-top: 4px; font-size: 10px; color: #10B981; font-weight: bold; display: flex; align-items: center; gap: 4px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: #10B981;"></span>
            👤 Destinado exclusivamente a: ${matchedHeir.name}
           </div>`
        : '';
      return `
        <tr style="border-left: 4px solid ${colors.border};">
          <td style="padding: 10px 12px;"><span class="badge" style="background-color: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border}; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 10px;">${a.type}</span></td>
          <td style="padding: 10px 12px;">
            <div style="font-weight: 600; color: #1A202C;">${a.description}</div>
            ${heirBadge}
          </td>
          <td style="padding: 10px 12px;">${a.exemptITCMD ? '<span class="badge badge-exempt" style="background-color: #FEFCBF; color: #B7791F; border: 1px solid #F6E05E; font-weight: bold; padding: 2px 6px; border-radius: 4px; font-size: 10px;">Sim (Isento)</span>' : 'Não'}</td>
          <td class="text-right" style="padding: 10px 12px; font-family: monospace; font-weight: bold; color: #1A202C;">${formatBRL(a.value)}</td>
        </tr>
      `;
    }).join('');

    const debtsRows = cs.debts.map(d => `
      <tr>
        <td style="padding: 10px 12px;">${d.description}</td>
        <td class="text-right" style="padding: 10px 12px; font-family: monospace; font-weight: bold; color: #E53E3E;">${formatBRL(d.value)}</td>
      </tr>
    `).join('');

    const heirsRows = math.heirsPie.map((h: any, idx: number) => {
      const exclusiveAssets = cs.assets.filter(a => a.heirId === h.id);
      const assetsListHTML = exclusiveAssets.map(a => {
        const colors = getAssetPrintColors(a.type);
        return `
          <div style="display: inline-flex; align-items: center; gap: 6px; background-color: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border}; border-radius: 4px; padding: 3px 8px; font-size: 10px; margin-right: 6px; margin-top: 4px; font-family: sans-serif; font-weight: 500;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background-color: ${colors.text};"></span>
            <strong>${a.type}</strong>: ${a.description} (${formatBRL(a.value)})
          </div>
        `;
      }).join('');

      const exclusiveSection = assetsListHTML 
        ? `<div style="margin-top: 6px; padding: 4px 0 0 0; border-top: 1px dashed #E2E8F0;">
            <span style="font-size: 9.5px; text-transform: uppercase; color: #718096; letter-spacing: 0.5px; font-weight: bold; display: block; margin-bottom: 2px;">Bens Destinados Exclusivamente:</span>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">${assetsListHTML}</div>
           </div>`
        : '<span style="font-size: 10px; color: #A0AEC0; font-style: italic;">Nenhum bem exclusivo. Recebe cota geral do monte-mor.</span>';

      const linkedDebts = cs.debts.filter(d => d.heirId === h.id);
      let costsListHTML = '';
      if (linkedDebts.length > 0 || h.heirItcmd > 0 || h.heirAttorneyFees > 0 || h.heirCourtFees > 0) {
        costsListHTML = `
          <div style="margin-top: 6px; padding: 6px 0 0 0; border-top: 1px dashed #E2E8F0;">
            <span style="font-size: 9.5px; text-transform: uppercase; color: #E53E3E; letter-spacing: 0.5px; font-weight: bold; display: block; margin-bottom: 2px;">Custas & Dívidas Deduzidas Diretamente:</span>
            <div style="display: flex; flex-wrap: wrap; gap: 4px;">
              ${linkedDebts.map(d => `
                <div style="display: inline-flex; align-items: center; gap: 6px; background-color: #FFF5F5; color: #C53030; border: 1px solid #FEB2B2; border-radius: 4px; padding: 3px 8px; font-size: 10px; margin-right: 6px; margin-top: 4px; font-family: sans-serif; font-weight: 500;">
                  <strong>Dívida</strong>: ${d.description} (${formatBRL(d.value)})
                </div>
              `).join('')}
              ${h.heirItcmd > 0 ? `
                <div style="display: inline-flex; align-items: center; gap: 6px; background-color: #FFF5F5; color: #C53030; border: 1px solid #FEB2B2; border-radius: 4px; padding: 3px 8px; font-size: 10px; margin-right: 6px; margin-top: 4px; font-family: sans-serif; font-weight: 500;">
                  <strong>ITCMD Individual</strong>: ${formatBRL(h.heirItcmd)}
                </div>
              ` : ''}
              ${h.heirAttorneyFees > 0 ? `
                <div style="display: inline-flex; align-items: center; gap: 6px; background-color: #FFF5F5; color: #C53030; border: 1px solid #FEB2B2; border-radius: 4px; padding: 3px 8px; font-size: 10px; margin-right: 6px; margin-top: 4px; font-family: sans-serif; font-weight: 500;">
                  <strong>Honorários Individuais</strong>: ${formatBRL(h.heirAttorneyFees)}
                </div>
              ` : ''}
              ${h.heirCourtFees > 0 ? `
                <div style="display: inline-flex; align-items: center; gap: 6px; background-color: #FFF5F5; color: #C53030; border: 1px solid #FEB2B2; border-radius: 4px; padding: 3px 8px; font-size: 10px; margin-right: 6px; margin-top: 4px; font-family: sans-serif; font-weight: 500;">
                  <strong>Custas Individuais</strong>: ${formatBRL(h.heirCourtFees)}
                </div>
              ` : ''}
            </div>
          </div>
        `;
      }

      const totalExclusiveVal = exclusiveAssets.reduce((sum, curr) => sum + curr.value, 0);
      const balance = h.rawShare - totalExclusiveVal - h.totalHeirLinkedCosts;
      
      const divisionBreakdown = `
        <div style="margin-top: 8px; font-size: 10px; color: #2D3748; background-color: #F8FAFC; border: 1px solid #E2E8F0; padding: 6px 10px; border-radius: 4px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between;"><span>Quinhão Bruto Comum (${h.percentage}%):</span> <span>${formatBRL(h.rawShare)}</span></div>
          <div style="display: flex; justify-content: space-between;"><span>Bens Exclusivos Destinados:</span> <span>- ${formatBRL(totalExclusiveVal)}</span></div>
          <div style="display: flex; justify-content: space-between; color: #C53030;"><span>Custas & Dívidas Deduzidas:</span> <span>- ${formatBRL(h.totalHeirLinkedCosts)}</span></div>
          ${balance > 0 
            ? `<div style="color: #137333; font-weight: bold; margin-top: 4px; border-top: 1px solid #E2E8F0; padding-top: 4px; display: flex; justify-content: space-between;"><span>➔ Saldo Líquido a Receber:</span> <span>${formatBRL(balance)}</span></div>`
            : balance < 0
              ? `<div style="color: #C5221F; font-weight: bold; margin-top: 4px; border-top: 1px solid #E2E8F0; padding-top: 4px; display: flex; justify-content: space-between;"><span>➔ Saldo Negativo (Torna a pagar):</span> <span>${formatBRL(Math.abs(balance))}</span></div>`
              : `<div style="color: #1A202C; font-weight: bold; margin-top: 4px; border-top: 1px solid #E2E8F0; padding-top: 4px; text-align: center;">Quinhão totalmente preenchido</div>`
          }
        </div>
      `;

      const heirColor = getHeirColor(idx);

      return `
        <tr style="border-left: 4px solid ${heirColor.border};">
          <td style="padding: 10px 12px;">
            <strong style="color: #111111; font-size: 12.5px;">${h.name}</strong>
            <div style="font-size: 9.5px; color: #718096; margin-top: 2px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">${h.relationship}</div>
          </td>
          <td style="padding: 10px 12px;">
            ${exclusiveSection}
            ${costsListHTML}
            ${divisionBreakdown}
          </td>
          <td style="padding: 10px 12px; font-family: monospace; font-weight: bold; color: #1A202C;">${h.percentage}%</td>
          <td class="text-right" style="padding: 10px 12px; color: ${heirColor.text}; font-weight: bold; font-family: monospace; font-size: 13px;">${formatBRL(h.value)}</td>
        </tr>
      `;
    }).join('');

    const attorneyFeesDisplay = cs.attorneyFeeType === 'fixed' 
      ? formatBRL(cs.attorneyFeeValue ?? 0) 
      : `${cs.attorneyFeeRate}%`;

    const html = `
      <html>
        <head>
          <title>Relatório de Partilha de Bens - ${cs.title}</title>
          <style>
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #111111; padding: 40px; margin: 0; line-height: 1.5; background-color: #FFFFFF; }
            
            .logo-container {
              display: flex;
              justify-content: center;
              align-items: center;
              margin-bottom: 25px;
            }

            .logo-box {
              display: flex;
              align-items: center;
              justify-content: center;
              box-sizing: border-box;
            }

            .subtitle { text-align: center; color: #047857; font-size: 12px; margin-bottom: 35px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold; }
            
            .section-title { 
              font-size: 14px; 
              font-weight: bold; 
              border-left: 4px solid #047857; 
              padding-left: 10px; 
              margin-top: 35px; 
              margin-bottom: 15px; 
              text-transform: uppercase; 
              color: #000000; 
              letter-spacing: 0.5px;
            }

            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12.5px; }
            
            th { 
              background-color: #0A0A0A; 
              font-weight: bold; 
              text-align: left; 
              padding: 10px 12px; 
              border-bottom: 3px solid #047857; 
              text-transform: uppercase; 
              color: #FFFFFF; 
              font-size: 11.5px; 
              letter-spacing: 0.5px;
            }

            td { padding: 10px 12px; border-bottom: 1px solid #E2E8F0; color: #2D3748; }
            tr:nth-child(even) { background-color: #F8FAFC; }
            
            .text-right { text-align: right; }
            
            .totals-container { 
              background-color: #FAFAFA; 
              border: 1px solid #E2E8F0; 
              border-left: 5px solid #047857; 
              border-radius: 8px; 
              padding: 22px; 
              margin-top: 35px; 
              font-size: 14px; 
            }

            .totals-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: #4A5568; }
            .totals-row.final { 
              border-top: 2px solid #000000; 
              padding-top: 12px; 
              margin-top: 12px; 
              font-size: 18px; 
              font-weight: bold; 
              color: #047857; 
            }

            .footer { margin-top: 60px; text-align: center; font-size: 10.5px; color: #718096; border-top: 1px solid #E2E8F0; padding-top: 15px; }
            
            .badge { 
              display: inline-block; 
              padding: 3px 8px; 
              font-size: 10.5px; 
              font-weight: bold; 
              border-radius: 4px; 
              background-color: #E6F4EA; 
              color: #047857; 
              border: 1px solid #047857; 
            }

            .badge-exempt { 
              background-color: #FEFCBF; 
              color: #B7791F; 
              border: 1px solid #F6E05E; 
            }

            .signature-area { display: flex; justify-content: space-around; margin-top: 90px; page-break-inside: avoid; }
            .signature-box { border-top: 1.5px solid #000000; width: 220px; text-align: center; font-size: 12px; padding-top: 10px; color: #4A5568; text-transform: uppercase; letter-spacing: 0.5px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="logo-container">
            <div class="logo-box">
              <img src="${window.location.origin}/imagens/logo.png" alt="Almeida Advocacia" style="max-height: 120px; object-fit: contain;" referrerpolicy="no-referrer" />
            </div>
          </div>
          
          <div class="subtitle">Relatório Geral de Inventário e Partilha</div>
          
          <div class="section-title">Informações do Processo</div>
          <table>
            <tr>
              <td><strong>Processo / Identificação:</strong></td>
              <td>${cs.title}</td>
              <td><strong>Cliente Responsável:</strong></td>
              <td>${cs.clientName}</td>
            </tr>
            <tr>
              <td><strong>Imposto ITCMD Base:</strong></td>
              <td>${cs.itcmdRate}%</td>
              <td><strong>Honorários do Patrono:</strong></td>
              <td>${attorneyFeesDisplay}</td>
            </tr>
          </table>

          <div class="section-title">Inventário de Ativos (Bens)</div>
          <table>
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Descrição Detalhada / Destinação</th>
                <th>Isento ITCMD</th>
                <th class="text-right">Valor Avaliado</th>
              </tr>
            </thead>
            <tbody>
              ${assetsRows || '<tr><td colspan="4" style="text-align: center; color: #A0AEC0;">Nenhum bem cadastrado.</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">Inventário de Passivos (Dívidas e Obrigações)</div>
          <table>
            <thead>
              <tr>
                <th>Descrição da Dívida / Credor</th>
                <th class="text-right">Valor da Obrigação</th>
              </tr>
            </thead>
            <tbody>
              ${debtsRows || '<tr><td colspan="2" style="text-align: center; color: #A0AEC0;">Nenhuma dívida cadastrada.</td></tr>'}
            </tbody>
          </table>

          <div class="section-title">Cálculo de Quinhões e Partilha por Sucessão</div>
          
          <!-- Visual Share Distribution Demonstration Bar -->
          ${math.heirsPie.length > 0 ? `
          <div style="margin-bottom: 25px; border: 1px solid #E2E8F0; padding: 16px; border-radius: 8px; background-color: #FAFAFA; page-break-inside: avoid;">
            <span style="font-size: 11px; text-transform: uppercase; color: #4A5568; letter-spacing: 1px; font-weight: bold; display: block; margin-bottom: 12px; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px;">
              Gráfico de Distribuição Proporcional dos Quinhões (%)
            </span>
            <div style="display: flex; height: 32px; border-radius: 6px; overflow: hidden; background-color: #EDF2F7; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06); border: 1px solid #D2D6DC; margin-bottom: 14px;">
              ${math.heirsPie.map((h: any, idx: number) => {
                const colors = getHeirColor(idx);
                if (h.percentage <= 0) return '';
                return `
                  <div style="width: ${h.percentage}%; background-color: ${colors.border}; display: flex; align-items: center; justify-content: center; color: #FFFFFF; font-family: 'Inter', sans-serif; font-weight: bold; font-size: 11.5px; text-shadow: 0 1px 2px rgba(0,0,0,0.2);" title="${h.name}: ${h.percentage}%">
                    ${h.percentage >= 8 ? h.percentage + '%' : ''}
                  </div>
                `;
              }).join('')}
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 14px 20px;">
              ${math.heirsPie.map((h: any, idx: number) => {
                const colors = getHeirColor(idx);
                return `
                  <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #2D3748; font-family: sans-serif;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${colors.border}; border: 1px solid rgba(0,0,0,0.15);"></span>
                    <strong>${h.name}</strong> (${h.percentage}%)
                  </div>
                `;
              }).join('')}
            </div>
          </div>
          ` : ''}

          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Herdeiro / Beneficiário</th>
                <th style="width: 50%;">Destinação de Bens Específicos e Quinhão</th>
                <th style="width: 10%;">Porcentagem</th>
                <th style="width: 15%;" class="text-right">Quinhão Líquido</th>
              </tr>
            </thead>
            <tbody>
              ${heirsRows || '<tr><td colspan="4" style="text-align: center; color: #A0AEC0;">Nenhum herdeiro cadastrado.</td></tr>'}
            </tbody>
          </table>

          <div class="totals-container" style="page-break-inside: avoid;">
            <div class="totals-row">
              <span>Bens Totais Declarados:</span>
              <strong>${formatBRL(math.totalAssetsValue)}</strong>
            </div>
            <div class="totals-row" style="color: #E53E3E;">
              <span>Dedução de Dívidas do Espólio:</span>
              <strong>- ${formatBRL(math.totalDebtsValue)}</strong>
            </div>
            <div class="totals-row" style="color: #718096;">
              <span>Imposto ITCMD Calculado (${cs.itcmdRate}%):</span>
              <strong>- ${formatBRL(math.itcmdTax)}</strong>
            </div>
            <div class="totals-row" style="color: #718096;">
              <span>Honorários Advocatícios Contratuais:</span>
              <strong>- ${formatBRL(math.attorneyFees)}</strong>
            </div>
            <div class="totals-row" style="color: #718096;">
              <span>Custas e Emolumentos Judiciais:</span>
              <strong>- ${formatBRL(math.courtFees)}</strong>
            </div>
            <div class="totals-row final">
              <span>Quinhão Líquido / Monte-Mor Partilhável:</span>
              <span>${formatBRL(math.distributableValue)}</span>
            </div>
          </div>

          <div class="signature-area">
            <div class="signature-box">
              Advogado Patrono
            </div>
            <div class="signature-box">
              Inventariante / Cliente
            </div>
          </div>

          <div class="footer">
            Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} por Almeida Advocacia Core ERP Security.
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleDeleteInventory = (id: string) => {
    setDeleteConfirm({
      id,
      title: 'Excluir Inventário de Partilha',
      message: 'Deseja realmente arquivar e apagar este inventário de partilha? Todos os cálculos de bens, herdeiros e passivos serão limpos.'
    });
  };

  // Advanced calculations
  const calculateTotals = (cs: InventoryCase) => {
    const assets = cs.assets ?? [];
    const debts = cs.debts ?? [];
    const heirs = cs.heirs ?? [];

    const totalAssetsValue = assets.reduce((sum, curr) => sum + (Number(curr.value) || 0), 0);
    const totalDebtsValue = debts.reduce((sum, curr) => sum + (Number(curr.value) || 0), 0);
    
    // Monte-mor líquido = total assets - debts
    const netEstateValue = Math.max(0, totalAssetsValue - totalDebtsValue);
    
    // Calculate ITCMD taxable assets (excluding those marked exemptITCMD)
    const taxableAssetsValue = assets
      .filter(a => !a.exemptITCMD)
      .reduce((sum, curr) => sum + (Number(curr.value) || 0), 0);

    // Taxes
    const itcmdRate = numberOrDefault(cs.itcmdRate, 4);
    const itcmdTax = (taxableAssetsValue * itcmdRate) / 100;
    
    const attorneyFeeRate = numberOrDefault(cs.attorneyFeeRate, 6);
    const attorneyFeeValue = numberOrDefault(cs.attorneyFeeValue, 0);
    const attorneyFees = cs.attorneyFeeType === 'fixed'
      ? attorneyFeeValue
      : (totalAssetsValue * attorneyFeeRate) / 100;
      
    const courtFeeRate = numberOrDefault(cs.courtFeeRate, 1);
    const courtFeeValue = numberOrDefault(cs.courtFeeValue, 0);
    const courtFees = cs.courtFeeType === 'fixed'
      ? courtFeeValue
      : (totalAssetsValue * courtFeeRate) / 100;

    const totalCosts = itcmdTax + attorneyFees + courtFees;

    // Check cost associations
    const hasHeir = (heirId?: string) => heirId && heirs.some(h => h.id === heirId);

    const isItcmdLinked = hasHeir(cs.itcmdHeirId);
    const isAttorneyFeeLinked = hasHeir(cs.attorneyFeeHeirId);
    const isCourtFeeLinked = hasHeir(cs.courtFeeHeirId);

    const commonItcmdTax = isItcmdLinked ? 0 : itcmdTax;
    const commonAttorneyFees = isAttorneyFeeLinked ? 0 : attorneyFees;
    const commonCourtFees = isCourtFeeLinked ? 0 : courtFees;

    // Common debts (not linked to any specific heir)
    const commonDebtsValue = debts
      .filter(d => !hasHeir(d.heirId))
      .reduce((sum, curr) => sum + (Number(curr.value) || 0), 0);

    const commonCosts = commonItcmdTax + commonAttorneyFees + commonCourtFees;
    const commonDistributableValue = Math.max(0, totalAssetsValue - commonDebtsValue - commonCosts);

    // Distribution pie
    const heirsPie = heirs.map(h => {
      const percentage = typeof h.percentage === 'number' ? h.percentage : Number(h.percentage) || 0;
      
      const rawShare = Math.round((commonDistributableValue * percentage) / 100);

      const heirDebtsValue = debts
        .filter(d => d.heirId === h.id)
        .reduce((sum, curr) => sum + (Number(curr.value) || 0), 0);
      
      const heirItcmd = cs.itcmdHeirId === h.id ? itcmdTax : 0;
      const heirAttorneyFees = cs.attorneyFeeHeirId === h.id ? attorneyFees : 0;
      const heirCourtFees = cs.courtFeeHeirId === h.id ? courtFees : 0;

      const totalHeirLinkedCosts = heirDebtsValue + heirItcmd + heirAttorneyFees + heirCourtFees;
      const value = Math.round(rawShare - totalHeirLinkedCosts);

      return {
        id: h.id,
        name: h.name,
        percentage: percentage,
        relationship: h.relationship || '',
        rawShare,
        heirDebtsValue,
        heirItcmd,
        heirAttorneyFees,
        heirCourtFees,
        totalHeirLinkedCosts,
        value // Net Share
      };
    });

    const distributableValue = Math.max(0, netEstateValue - totalCosts);

    return {
      totalAssetsValue,
      taxableAssetsValue,
      totalDebtsValue,
      netEstateValue,
      itcmdTax,
      attorneyFees,
      courtFees,
      totalCosts,
      distributableValue,
      heirsPie,
      commonDistributableValue,
      commonDebtsValue,
      commonCosts
    };
  };

  const formatBRL = (val: any) => {
    if (val === undefined || val === null || isNaN(val) || !isFinite(val)) {
      return 'R$ 0,00';
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const CHAR_COLORS = ['#199300', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];

  return (
    <div className="space-y-6 text-neutral-100 inventory-theme">
      
      {!selectedCase ? (
        // LIST VIEW
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
            <h2 className="text-sm font-semibold font-display text-neutral-200">Módulo de Planejamento de Inventários e Partilhas</h2>
            <button
              onClick={() => setIsAddingCase(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Abrir Novo Processo de Espólio</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventories.length > 0 ? (
              inventories.map(inv => {
                const math = calculateTotals(inv);
                return (
                  <div 
                    key={inv.id} 
                    className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-emerald-600 transition-all flex flex-col justify-between shadow-sm cursor-pointer"
                    onClick={() => {
                      setSelectedCase(inv);
                      setDocFilter('all');
                      setShowOnlyPending(false);
                      setIndividualFilter(null);
                    }}
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-mono bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded text-neutral-400 font-bold">
                          Inventário Ativo
                        </span>
                        <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleOpenEditCase(inv, e)}
                            className="p-1 hover:bg-neutral-800 rounded text-neutral-400 hover:text-emerald-500 transition-colors"
                            title="Editar Inventário"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <Scale className="w-4 h-4 text-emerald-500" />
                        </div>
                      </div>
                      
                      <h3 className="text-md font-bold text-neutral-200 font-display line-clamp-1 leading-snug">{inv.title}</h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5">Inventariante / Cliente: <strong className="text-neutral-300">{inv.clientName}</strong></p>
                      
                      <div className="space-y-2 pt-2 border-t border-neutral-850 text-xs">
                        <div className="flex justify-between">
                          <span className="text-neutral-500">Bens Totais:</span>
                          <strong className="text-neutral-300">{formatBRL(math.totalAssetsValue)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-500 font-mono">Quinhão Líquido:</span>
                          <strong className="text-emerald-450 text-emerald-450">{formatBRL(math.distributableValue)}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="pt-5 mt-5 border-t border-neutral-850 flex justify-between items-center text-xs">
                      <span className="text-neutral-500 font-mono">{inv.heirs.length} herdeiro(s)</span>
                      <button
                        onClick={() => {
                          setSelectedCase(inv);
                          setDocFilter('all');
                          setIndividualFilter(null);
                        }}
                        className="text-xs font-bold text-emerald-500 flex items-center space-x-1"
                      >
                        <span>Calcular Partilha</span>
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-3 bg-neutral-900/50 p-12 text-center rounded-2xl border border-neutral-800 text-neutral-510 italic">
                Nenhum inventário registrado para partilha patrimonial. Abra um novo processo acima para calcular cotas.
              </div>
            )}
          </div>
        </div>
      ) : (
        // Master Details deep solver equivalent: InventoryDetailsPage
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-3">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => {
                  setSelectedCase(null);
                  setDocFilter('all');
                  setIndividualFilter(null);
                }}
                className="px-3.5 py-1.5 border border-neutral-800 hover:bg-neutral-850 text-neutral-300 rounded-lg text-xs font-bold font-display cursor-pointer"
              >
                Voltar aos Inventários
              </button>
              
              <button
                onClick={() => handlePrintPDF(selectedCase, calculateTotals(selectedCase))}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold font-display flex items-center space-x-1.5 cursor-pointer transition-colors"
                title="Imprimir ou Salvar Relatório Completo de Partilha em PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Gerar Relação/Relatório PDF</span>
              </button>

              <button
                onClick={(e) => handleOpenEditCase(selectedCase, e)}
                className="px-3.5 py-1.5 bg-neutral-950 border border-neutral-800 hover:border-emerald-600 hover:text-emerald-500 text-neutral-300 rounded-lg text-xs font-bold font-display flex items-center space-x-1.5 cursor-pointer transition-all"
                title="Editar informações do Inventário"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Editar Ficha</span>
              </button>
            </div>
            
            <button
              onClick={() => handleDeleteInventory(selectedCase.id)}
              className="px-3 py-1.5 hover:bg-red-950/20 text-red-500 border border-neutral-800 hover:border-red-900/30 rounded text-xs cursor-pointer self-start sm:self-auto"
            >
              Excluir este Processo
            </button>
          </div>

          {(() => {
            const math = calculateTotals(selectedCase);
            return (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Calculations metrics summary heading */}
                <div className="lg:col-span-12 bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl shadow-sm text-center space-y-4">
                  <span className="text-xs uppercase tracking-wider font-mono font-bold text-neutral-450 text-neutral-400">Monte-Mor Líquido Partilhável (Deduzido Dívidas e Impostos)</span>
                  <div className="text-3xl sm:text-4.5xl font-extrabold text-emerald-450 mt-1 font-display text-emerald-400">
                    {formatBRL(math.distributableValue)}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 max-w-4xl mx-auto pt-4 text-xs font-mono border-t border-neutral-850">
                    <div>
                      <span className="text-neutral-500 block">Total de Bens:</span>
                      <strong className="text-neutral-200">{formatBRL(math.totalAssetsValue)}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">Dívidas do Espólio:</span>
                      <strong className="text-red-400">({formatBRL(math.totalDebtsValue)})</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">ITCMD ({selectedCase.itcmdRate}%):</span>
                      <strong className="text-neutral-300">{formatBRL(math.itcmdTax)}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">
                        Honorários ({selectedCase.attorneyFeeType === 'fixed' ? 'Fixo' : `${selectedCase.attorneyFeeRate}%`}):
                      </span>
                      <strong className="text-neutral-300">{formatBRL(math.attorneyFees)}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-500 block">
                        Custas ({selectedCase.courtFeeType === 'fixed' ? 'Fixo' : `${selectedCase.courtFeeRate}%`}):
                      </span>
                      <strong className="text-neutral-300">{formatBRL(math.courtFees)}</strong>
                    </div>
                  </div>
                </div>

                {/* Individual Share Division Demonstrator */}
                <div className="lg:col-span-12 bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-neutral-850 pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-neutral-200 uppercase tracking-wider font-mono flex items-center space-x-2">
                        <Award className="w-4.5 h-4.5 text-emerald-500" />
                        <span>Partilha e Divisão Individual de Quinhões Líquidos</span>
                      </h3>
                      <p className="text-[11px] text-neutral-400">Rateio proporcional do monte-mor após abatimento de dívidas, custas judiciais e obrigações tributárias.</p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-3 py-1 rounded-xl">
                      {selectedCase.heirs.length} Herdeiro(s) Cadastrado(s)
                    </span>
                  </div>

                  {math.heirsPie.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {math.heirsPie.map((hr, idx) => {
                        const exclusiveAssets = selectedCase.assets.filter(a => a.heirId === hr.id);
                        const heirColors = [
                          { border: 'border-emerald-900/40 hover:border-emerald-500/50', text: 'text-emerald-400', bg: 'bg-emerald-950/20' },
                          { border: 'border-sky-900/40 hover:border-sky-500/50', text: 'text-sky-400', bg: 'bg-sky-950/20' },
                          { border: 'border-violet-900/40 hover:border-violet-500/50', text: 'text-violet-400', bg: 'bg-violet-950/20' },
                          { border: 'border-amber-900/40 hover:border-amber-500/50', text: 'text-amber-400', bg: 'bg-amber-950/20' },
                          { border: 'border-rose-900/40 hover:border-rose-500/50', text: 'text-rose-400', bg: 'bg-rose-950/20' },
                          { border: 'border-cyan-900/40 hover:border-cyan-500/50', text: 'text-cyan-400', bg: 'bg-cyan-950/20' },
                          { border: 'border-fuchsia-900/40 hover:border-fuchsia-500/50', text: 'text-fuchsia-400', bg: 'bg-fuchsia-950/20' },
                        ];
                        const hc = heirColors[idx % heirColors.length];

                        const getBulletHex = (bulletClass: string) => {
                          if (bulletClass.includes('emerald')) return '#10B981';
                          if (bulletClass.includes('sky')) return '#0EA5E9';
                          if (bulletClass.includes('violet')) return '#8B5CF6';
                          if (bulletClass.includes('purple')) return '#A855F7';
                          if (bulletClass.includes('indigo')) return '#6366F1';
                          if (bulletClass.includes('amber')) return '#F59E0B';
                          return '#F43F5E';
                        };

                        return (
                          <div key={idx} className={`p-4 bg-neutral-950 border ${hc.border} rounded-xl space-y-3.5 hover:shadow-lg transition-all font-mono`}>
                            <div className="flex justify-between items-start">
                              <div>
                                <strong className="text-neutral-200 font-sans block text-xs leading-none">{hr.name}</strong>
                                <span className="text-[9px] text-neutral-500 uppercase tracking-wide">{hr.relationship}</span>
                              </div>
                              <div className="flex items-center space-x-1 shrink-0">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={hr.percentage}
                                  onChange={(e) => handleUpdateHeirPercentage(selectedCase, hr.id, Number(e.target.value))}
                                  className={`w-14 text-center text-[11px] font-bold py-0.5 px-1 bg-neutral-900 border ${hc.border} text-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500`}
                                  title="Definir porcentagem de quinhão"
                                />
                                <span className="text-[10px] text-neutral-400 font-bold">%</span>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t border-neutral-850/40 flex justify-between items-baseline">
                              <span className="text-[9px] text-neutral-500 uppercase font-sans">Quinhão Líquido:</span>
                              <span className={`text-sm font-extrabold ${hc.text}`}>{formatBRL(hr.value)}</span>
                            </div>

                            {/* Exclusive Destined Assets Summary inside each Heir Card */}
                            <div className="pt-2.5 border-t border-neutral-850/45 space-y-2">
                              <span className="text-[8.5px] text-neutral-400 uppercase font-sans block tracking-wider font-extrabold flex items-center gap-1">
                                <span>📦 Bens Exclusivos</span>
                                {exclusiveAssets.length > 0 && (
                                  <span className="bg-emerald-950/40 text-emerald-400 text-[7px] px-1.5 py-0.2 rounded-full border border-emerald-900/30">
                                    {exclusiveAssets.length}
                                  </span>
                                )}
                              </span>
                              {exclusiveAssets.length > 0 ? (
                                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                  {exclusiveAssets.map(a => {
                                    const assetColors = getAssetColorConfig(a.type);
                                    const bulletHex = getBulletHex(assetColors.bullet);
                                    return (
                                      <div 
                                        key={a.id} 
                                        className={`flex flex-col p-2 rounded bg-neutral-900 border border-neutral-850 text-[10px] font-sans ${assetColors.shadow}`}
                                        style={{ borderLeft: `3px solid ${bulletHex}` }}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className={`font-semibold truncate ${assetColors.text} flex-1`} title={a.description}>{a.description}</span>
                                          <div className="flex items-center space-x-1 shrink-0">
                                            <span className="text-neutral-200 font-mono text-[9px]">{formatBRL(a.value)}</span>
                                            <button
                                              onClick={() => handleLinkAssetToHeir(selectedCase, a.id, '')}
                                              className="text-neutral-500 hover:text-red-400 font-sans font-bold text-[9.5px] p-0.5 focus:outline-none transition-colors"
                                              title="Remover vínculo deste bem"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5 text-[8px] text-neutral-500 font-mono uppercase tracking-wide">
                                          <span>{a.type}</span>
                                          {a.exemptITCMD && <span className="text-amber-500 text-[7.5px] font-sans">Isento</span>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[9px] text-neutral-500 italic font-sans block">Nenhum bem exclusivo. Dividido proporcionalmente.</span>
                              )}

                              {/* Quick Asset Linker Dropdown */}
                              <div className="pt-1.5">
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleLinkAssetToHeir(selectedCase, e.target.value, hr.id);
                                    }
                                  }}
                                  className="w-full text-[9px] bg-neutral-900 text-neutral-400 py-1 px-2 rounded border border-neutral-850 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                  <option value="">➕ Vincular bem exclusivo...</option>
                                  {selectedCase.assets.map(a => {
                                    const isLinkedToThis = a.heirId === hr.id;
                                    const otherHeirName = a.heirId && a.heirId !== hr.id 
                                      ? selectedCase.heirs.find(h => h.id === a.heirId)?.name 
                                      : null;
                                    return (
                                      <option key={a.id} value={a.id} disabled={isLinkedToThis}>
                                        {a.description} ({formatBRL(a.value)}) {otherHeirName ? `[👤 ${otherHeirName}]` : isLinkedToThis ? '[Já vinculado]' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>

                            {/* Costs and debts linked to this heir */}
                            <div className="pt-2.5 border-t border-neutral-850/45 space-y-2">
                              <span className="text-[8.5px] text-neutral-400 uppercase font-sans block tracking-wider font-extrabold flex items-center gap-1">
                                <span>💸 Custos & Dívidas Assumidos</span>
                                {hr.totalHeirLinkedCosts > 0 && (
                                  <span className="bg-red-950/40 text-red-400 text-[7px] px-1.5 py-0.2 rounded-full border border-red-900/30">
                                    {formatBRL(hr.totalHeirLinkedCosts)}
                                  </span>
                                )}
                              </span>
                              
                              <div className="space-y-1.5">
                                {hr.heirDebtsValue > 0 && (
                                  <div className="flex justify-between items-center text-[10px] bg-neutral-900 border border-neutral-850 p-1.5 rounded">
                                    <span className="text-neutral-450 truncate max-w-[130px]" title="Dívidas e Passivos">Dívidas Vinculadas</span>
                                    <span className="text-red-400 font-bold">{formatBRL(hr.heirDebtsValue)}</span>
                                  </div>
                                )}
                                {hr.heirItcmd > 0 && (
                                  <div className="flex justify-between items-center text-[10px] bg-neutral-900 border border-neutral-850 p-1.5 rounded">
                                    <span className="text-neutral-455">ITCMD Vinculado</span>
                                    <span className="text-red-400 font-bold">{formatBRL(hr.heirItcmd)}</span>
                                  </div>
                                )}
                                {hr.heirAttorneyFees > 0 && (
                                  <div className="flex justify-between items-center text-[10px] bg-neutral-900 border border-neutral-850 p-1.5 rounded">
                                    <span className="text-neutral-455">Honorários Vinculados</span>
                                    <span className="text-red-400 font-bold">{formatBRL(hr.heirAttorneyFees)}</span>
                                  </div>
                                )}
                                {hr.heirCourtFees > 0 && (
                                  <div className="flex justify-between items-center text-[10px] bg-neutral-900 border border-neutral-850 p-1.5 rounded">
                                    <span className="text-neutral-455">Custas Vinculadas</span>
                                    <span className="text-red-400 font-bold">{formatBRL(hr.heirCourtFees)}</span>
                                  </div>
                                )}
                                
                                {hr.totalHeirLinkedCosts === 0 && (
                                  <span className="text-[9px] text-neutral-500 italic font-sans block">Nenhum custo ou dívida vinculado a este herdeiro.</span>
                                )}
                              </div>

                              {/* Quick Debt Linker Dropdown */}
                              <div className="pt-1">
                                <select
                                  value=""
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      handleUpdateDebtHeir(selectedCase, e.target.value, hr.id);
                                    }
                                  }}
                                  className="w-full text-[9px] bg-neutral-900 text-neutral-400 py-1 px-2 rounded border border-neutral-850 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                >
                                  <option value="">➕ Vincular dívida/passivo...</option>
                                  {selectedCase.debts.map(d => {
                                    const isLinkedToThis = d.heirId === hr.id;
                                    const otherHeirName = d.heirId && d.heirId !== hr.id
                                      ? selectedCase.heirs.find(h => h.id === d.heirId)?.name
                                      : null;
                                    return (
                                      <option key={d.id} value={d.id} disabled={isLinkedToThis}>
                                        {d.description} ({formatBRL(d.value)}) {otherHeirName ? `[👤 ${otherHeirName}]` : isLinkedToThis ? '[Já vinculada]' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                            </div>

                            {/* Division breakdown on-screen */}
                            <div className="pt-2.5 border-t border-neutral-850/45 space-y-1.5 text-[10px] font-sans">
                              {(() => {
                                const totalExclusiveVal = exclusiveAssets.reduce((sum, curr) => sum + curr.value, 0);
                                const balance = hr.rawShare - totalExclusiveVal - hr.totalHeirLinkedCosts;
                                return (
                                  <div className="bg-neutral-900/60 p-2 rounded border border-neutral-850 space-y-1 text-neutral-300 font-mono text-[9.5px]">
                                    <div className="flex justify-between">
                                      <span className="text-neutral-500">Quinhão Bruto Comum ({hr.percentage}%):</span>
                                      <span className="font-semibold">{formatBRL(hr.rawShare)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-neutral-500">Bens Exclusivos Destinados:</span>
                                      <span className="font-semibold">({formatBRL(totalExclusiveVal)})</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-neutral-500">Custas & Dívidas Deduzidas:</span>
                                      <span className="font-semibold text-rose-450 text-rose-400">({formatBRL(hr.totalHeirLinkedCosts)})</span>
                                    </div>
                                    {balance > 0 ? (
                                      <div className="flex justify-between text-emerald-400 font-bold border-t border-neutral-850 pt-1">
                                        <span>Saldo Líquido a Receber:</span>
                                        <span>{formatBRL(balance)}</span>
                                      </div>
                                    ) : balance < 0 ? (
                                      <div className="flex justify-between text-rose-400 font-bold border-t border-neutral-850 pt-1">
                                        <span>Saldo Negativo (Torna a pagar):</span>
                                        <span>{formatBRL(Math.abs(balance))}</span>
                                      </div>
                                    ) : (
                                      <div className="text-neutral-400 text-center pt-1 border-t border-neutral-850 text-[8.5px]">
                                        Quinhão Totalmente Preenchido
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-neutral-500 italic py-4 text-center font-sans">
                      Nenhum herdeiro ou legatário cadastrado. Adicione os herdeiros no painel abaixo para ratear o valor líquido de {formatBRL(math.distributableValue)}.
                    </div>
                  )}
                </div>

                {/* Left controls: adds heirs, assets, debts */}
                <div className="lg:col-span-8 space-y-8">
                  
                  {/* Assets itemization */}
                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4 shadow-sm">
                    <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono border-b border-neutral-850 pb-2 flex items-center space-x-1.5">
                      <Gem className="w-4.5 h-4.5 text-emerald-500" />
                      <span>Relação de Bens e Ativos</span>
                    </h3>

                    <div className="space-y-2">
                      {selectedCase.assets.map(ass => {
                        if (editingAssetId === ass.id) {
                          return (
                            <div key={ass.id} className="p-3.5 bg-neutral-950 rounded-lg border border-emerald-500/50 text-xs space-y-3 font-mono">
                              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                                <div className="sm:col-span-4 relative flex items-center bg-neutral-900 border border-neutral-800 rounded focus-within:ring-1 focus-within:ring-emerald-500">
                                  <span className={`absolute left-2.5 w-2 h-2 rounded-full ${getAssetColorConfig(editingAsset.type).bullet}`} />
                                  <select
                                    value={editingAsset.type}
                                    onChange={(e) => setEditingAsset({...editingAsset, type: e.target.value})}
                                    className="w-full bg-transparent text-xs py-1.5 pl-7 pr-2 focus:outline-none text-neutral-200 cursor-pointer"
                                  >
                                    <option value="Imóvel" className="bg-neutral-900">🟢 Imóvel</option>
                                    <option value="Veículo" className="bg-neutral-900">🔵 Veículo</option>
                                    <option value="Dinheiro" className="bg-neutral-900">🟣 Dinheiro</option>
                                    <option value="Saldo Bancário" className="bg-neutral-900">🟪 Saldo Bancário</option>
                                    <option value="Ações" className="bg-neutral-900">🔵 Ações / Investimentos</option>
                                    <option value="Direitos" className="bg-neutral-900">🟡 Direitos / Créditos</option>
                                    <option value="Outro" className="bg-neutral-900">🔴 Outro bem</option>
                                  </select>
                                </div>
                                <input
                                  type="text"
                                  value={editingAsset.description}
                                  onChange={(e) => setEditingAsset({...editingAsset, description: e.target.value})}
                                  placeholder="Descrição"
                                  className="sm:col-span-4 bg-neutral-900 border border-neutral-800 text-xs p-1.5 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                                />
                                <div className="sm:col-span-4 relative flex items-center bg-neutral-900 border border-neutral-800 rounded focus-within:ring-1 focus-within:ring-emerald-500">
                                  <select
                                    value={editingAsset.heirId || ''}
                                    onChange={(e) => setEditingAsset({...editingAsset, heirId: e.target.value})}
                                    className="w-full bg-transparent text-xs py-1.5 px-2 focus:outline-none text-neutral-200 cursor-pointer"
                                  >
                                    <option value="" className="bg-neutral-900">👤 Sem herdeiro exclusivo</option>
                                    {selectedCase.heirs.map(h => (
                                      <option key={h.id} value={h.id} className="bg-neutral-900">👤 Exclusivo: {h.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-neutral-850/45">
                                <div className="flex items-center space-x-2">
                                  <input
                                    id={`edit-exempt-${ass.id}`}
                                    type="checkbox"
                                    checked={editingAsset.exemptITCMD || false}
                                    onChange={(e) => setEditingAsset({...editingAsset, exemptITCMD: e.target.checked})}
                                    className="rounded border-neutral-800 bg-neutral-950 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                  />
                                  <label htmlFor={`edit-exempt-${ass.id}`} className="text-[10px] text-neutral-400 select-none cursor-pointer">
                                    Isento de ITCMD (Excluir do Cálculo de Imposto)
                                  </label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-[10px] text-neutral-500">Valor (R$):</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={editingAsset.value}
                                    onChange={(e) => setEditingAsset({...editingAsset, value: e.target.value})}
                                    placeholder="Valor"
                                    className="w-24 bg-neutral-900 border border-neutral-800 text-xs p-1 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                                  />
                                  <button
                                    onClick={() => handleSaveEditedAsset(selectedCase, ass.id)}
                                    className="p-1.5 bg-emerald-650 hover:bg-emerald-700 bg-emerald-650 text-white rounded flex items-center justify-center cursor-pointer"
                                    title="Salvar alterações"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingAssetId(null)}
                                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded text-neutral-400 flex items-center justify-center cursor-pointer"
                                    title="Cancelar"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        const matchedHeir = ass.heirId ? selectedCase.heirs.find(h => h.id === ass.heirId) : null;
                        return (
                          <div key={ass.id} className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 text-xs flex justify-between items-center font-mono">
                            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
                              <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold border ${getAssetColorConfig(ass.type).badge}`}>{ass.type}</span>
                              <span className="text-neutral-200">{ass.description}</span>
                              {matchedHeir && (
                                <span className="text-[8.5px] uppercase tracking-wider bg-emerald-950/40 border border-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 shadow-sm">
                                  <span>👤 Destinado a: {matchedHeir.name}</span>
                                </span>
                              )}
                              {ass.exemptITCMD && (
                                <span className="text-[8px] uppercase tracking-wider bg-orange-950/40 border border-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded font-bold">
                                  Isento de ITCMD
                                </span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4">
                              <strong className="text-neutral-300">{formatBRL(ass.value)}</strong>
                              <div className="flex items-center space-x-1.5">
                                <button
                                  onClick={() => {
                                    setEditingAssetId(ass.id);
                                    setEditingAsset({
                                      type: ass.type,
                                      description: ass.description,
                                      value: ass.value,
                                      exemptITCMD: !!ass.exemptITCMD,
                                      heirId: ass.heirId || ''
                                    });
                                  }}
                                  className="text-neutral-400 hover:text-emerald-400 focus:outline-none p-1 rounded hover:bg-neutral-900 transition-colors"
                                  title="Editar informações do bem"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteField(selectedCase, 'assets', ass.id)}
                                  className="text-neutral-400 hover:text-red-500 focus:outline-none p-1 rounded hover:bg-neutral-900 transition-colors"
                                  title="Remover bem"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2.5 pt-1.5 border-t border-neutral-850/40">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-3 relative flex items-center bg-neutral-950 border border-neutral-850 rounded focus-within:ring-1 focus-within:ring-emerald-500">
                          <span className={`absolute left-3 w-2 h-2 rounded-full ${getAssetColorConfig(newAsset.type).bullet}`} />
                          <select
                            value={newAsset.type}
                            onChange={(e) => setNewAsset({...newAsset, type: e.target.value})}
                            className="w-full bg-transparent text-xs py-2 pl-7.5 pr-2 focus:outline-none text-neutral-200 cursor-pointer"
                          >
                            <option value="Imóvel" className="bg-neutral-950">🟢 Imóvel</option>
                            <option value="Veículo" className="bg-neutral-950">🔵 Veículo</option>
                            <option value="Dinheiro" className="bg-neutral-950">🟣 Dinheiro</option>
                            <option value="Saldo Bancário" className="bg-neutral-950">🟪 Saldo Bancário</option>
                            <option value="Ações" className="bg-neutral-950">🔵 Ações / Investimentos</option>
                            <option value="Direitos" className="bg-neutral-950">🟡 Direitos / Créditos</option>
                            <option value="Outro" className="bg-neutral-950">🔴 Outro bem</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={newAsset.description}
                          onChange={(e) => setNewAsset({...newAsset, description: e.target.value})}
                          placeholder="Descrição (Ex: Apartamento Paulista)"
                          className="sm:col-span-3 bg-neutral-950 border border-neutral-850 text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                        />
                        <div className="sm:col-span-3 bg-neutral-950 border border-neutral-850 rounded focus-within:ring-1 focus-within:ring-emerald-500">
                          <select
                            value={newAsset.heirId || ''}
                            onChange={(e) => setNewAsset({...newAsset, heirId: e.target.value})}
                            className="w-full bg-transparent text-xs py-2 px-2 focus:outline-none text-neutral-200 cursor-pointer"
                          >
                            <option value="" className="bg-neutral-950">👤 Sem herdeiro exclusivo / Dividido</option>
                            {selectedCase.heirs.map(h => (
                              <option key={h.id} value={h.id} className="bg-neutral-950">👤 Exclusivo: {h.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-3 flex space-x-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={newAsset.value}
                            onChange={(e) => setNewAsset({...newAsset, value: e.target.value})}
                            placeholder="Valor BRL"
                            className="w-full bg-neutral-950 border border-neutral-850 text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                          />
                          <button
                            onClick={() => handleAddField(selectedCase, 'assets')}
                            className="px-3 bg-emerald-600 hover:bg-emerald-700 rounded text-white font-bold text-xs cursor-pointer"
                            title="Adicionar bem"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 pl-1">
                        <input
                          id="new-asset-exempt"
                          type="checkbox"
                          checked={newAsset.exemptITCMD || false}
                          onChange={(e) => setNewAsset({...newAsset, exemptITCMD: e.target.checked})}
                          className="rounded border-neutral-850 bg-neutral-950 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="new-asset-exempt" className="text-[10px] text-neutral-400 select-none cursor-pointer">
                          Este bem é <strong className="text-orange-400">isento do ITCMD</strong> (será excluído da base tributável do cálculo do imposto)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Debts list */}
                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4 shadow-sm">
                    <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono border-b border-neutral-850 pb-2 flex items-center space-x-1.5">
                      <CircleDot className="w-4.5 h-4.5 text-red-500" />
                      <span>Relação de Passivos / Dívidas do De Cujus</span>
                    </h3>

                    <div className="space-y-2">
                      {selectedCase.debts.map(db => (
                        <div key={db.id} className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-2 font-mono">
                          <div>
                            <span className="text-neutral-200 block">{db.description}</span>
                            <span className="text-[9px] text-neutral-500">
                              {db.heirId ? `👤 Vinculado a: ${selectedCase.heirs.find(h => h.id === db.heirId)?.name || 'Desconhecido'}` : '🌐 Dívida Geral (Espólio Comum)'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-3 shrink-0 self-end sm:self-auto">
                            <select
                              value={db.heirId || ''}
                              onChange={(e) => handleUpdateDebtHeir(selectedCase, db.id, e.target.value)}
                              className="bg-neutral-900 border border-neutral-850 rounded px-1.5 py-0.5 text-neutral-300 text-[10px] focus:outline-none cursor-pointer max-w-[130px]"
                            >
                              <option value="">🌐 Espólio Comum</option>
                              {selectedCase.heirs.map(h => (
                                <option key={h.id} value={h.id}>👤 {h.name}</option>
                              ))}
                            </select>
                            <strong className="text-red-400 font-bold">{formatBRL(db.value)}</strong>
                            <button
                              onClick={() => handleDeleteField(selectedCase, 'debts', db.id)}
                              className="text-red-500 hover:text-red-400 focus:outline-none cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3">
                      <input
                        type="text"
                        value={newDebt.description}
                        onChange={(e) => setNewDebt({...newDebt, description: e.target.value})}
                        placeholder="Ex: IPTU em atraso"
                        className="sm:col-span-4 bg-neutral-950 border border-neutral-850 text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                      />
                      <div className="sm:col-span-4 bg-neutral-950 border border-neutral-850 rounded focus-within:ring-1 focus-within:ring-emerald-500">
                        <select
                          value={newDebt.heirId || ''}
                          onChange={(e) => setNewDebt({...newDebt, heirId: e.target.value})}
                          className="w-full bg-transparent text-xs py-2 px-2 focus:outline-none text-neutral-200 cursor-pointer"
                        >
                          <option value="" className="bg-neutral-950">🌐 Dívida Geral / Espólio Comum</option>
                          {selectedCase.heirs.map(h => (
                            <option key={h.id} value={h.id} className="bg-neutral-950">👤 Exclusivo: {h.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-4 flex space-x-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={newDebt.value}
                          onChange={(e) => setNewDebt({...newDebt, value: e.target.value})}
                          placeholder="Valor BRL"
                          className="w-full bg-neutral-950 border border-neutral-850 text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                        />
                        <button
                          onClick={() => handleAddField(selectedCase, 'debts')}
                          className="px-3 bg-emerald-600 hover:bg-emerald-700 rounded text-white font-bold text-xs shrink-0 cursor-pointer"
                          title="Adicionar dívida"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Heirs list */}
                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex justify-between items-center border-b border-neutral-850 pb-2">
                      <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center space-x-1.5">
                        <User className="w-4.5 h-4.5 text-emerald-500" />
                        <span>Metas de Herdeiros e Legatários</span>
                      </h3>
                      {selectedCase.heirs.length > 0 && (
                        <button
                          onClick={() => handleSplitEqually(selectedCase)}
                          className="px-2 py-0.5 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-900/40 text-emerald-400 text-[10px] font-bold font-mono rounded transition-colors cursor-pointer"
                        >
                          Dividir Igualmente
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {selectedCase.heirs.map(hr => {
                        const share = (math.distributableValue * hr.percentage) / 100;
                        return (
                          <div key={hr.id} className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 text-xs flex flex-col sm:flex-row justify-between sm:items-center gap-2 font-mono">
                            <div>
                              <strong className="text-neutral-200 block">{hr.name}</strong>
                              <span className="text-[10px] text-neutral-500 capitalize">{hr.relationship}</span>
                            </div>
                            <div className="flex items-center space-x-4 shrink-0 self-end sm:self-auto">
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={hr.percentage}
                                  onChange={(e) => handleUpdateHeirPercentage(selectedCase, hr.id, Number(e.target.value))}
                                  className="w-14 text-center text-[11px] font-bold py-0.5 px-1 bg-neutral-900 border border-neutral-850 text-neutral-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                  title="Editar porcentagem"
                                />
                                <span className="text-[10px] text-neutral-400 font-bold">%</span>
                              </div>
                              <div className="min-w-[100px] text-right">
                                <strong className="text-emerald-400 font-bold">{formatBRL(share)}</strong>
                              </div>
                              <button
                                onClick={() => handleDeleteField(selectedCase, 'heirs', hr.id)}
                                className="text-red-500 hover:text-red-400 focus:outline-none cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-3">
                      <input
                        type="text"
                        value={newHeir.name}
                        onChange={(e) => setNewHeir({...newHeir, name: e.target.value})}
                        placeholder="Nome herdeiro"
                        className="sm:col-span-2 bg-neutral-950 border border-neutral-850 text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                      />
                      <input
                        type="text"
                        value={newHeir.relationship}
                        onChange={(e) => setNewHeir({...newHeir, relationship: e.target.value})}
                        placeholder="Ex: Filho / Meeira"
                        className="bg-neutral-950 border border-neutral-850 text-xs p-2 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
                      />
                      <button
                        onClick={() => handleAddField(selectedCase, 'heirs')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded cursor-pointer"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>

                  {/* Controle de Documentos e Certidões */}
                  <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-850 pb-4">
                      <div>
                        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center space-x-1.5">
                          <ClipboardList className="w-4.5 h-4.5 text-emerald-500" />
                          <span>Controle Dinâmico de Documentos</span>
                        </h3>
                        <p className="text-[10px] text-neutral-500 mt-0.5">Identificação automática baseada nos herdeiros e bens cadastrados.</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleResetAllDocs(selectedCase)}
                          className="px-2.5 py-1 bg-neutral-950 border border-neutral-800 hover:border-red-900 hover:text-red-400 text-neutral-400 rounded-lg text-[10px] font-mono tracking-wider uppercase font-bold transition-all cursor-pointer flex items-center space-x-1"
                          title="Zerar todos os status salvos e redefinir para Pendente"
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                          <span>Zerar Status</span>
                        </button>
                      </div>
                    </div>

                    {/* DYNAMIC PROGRESS HUD */}
                    {(() => {
                      const effectiveDocs = getEffectiveDocuments(selectedCase);
                      const totalCount = effectiveDocs.filter(d => d.status !== 'Não se aplica').length;
                      const deliveredCount = effectiveDocs.filter(d => d.status === 'Entregue').length;
                      const generalPercentage = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

                      const decujusDocs = effectiveDocs.filter(d => d.relatedToType === 'general');
                      const decujusTotal = decujusDocs.filter(d => d.status !== 'Não se aplica').length;
                      const decujusDelivered = decujusDocs.filter(d => d.status === 'Entregue').length;
                      const decujusPercentage = decujusTotal > 0 ? Math.round((decujusDelivered / decujusTotal) * 100) : 0;

                      const partesDocs = effectiveDocs.filter(d => d.relatedToType === 'part');
                      const partesTotal = partesDocs.filter(d => d.status !== 'Não se aplica').length;
                      const partesDelivered = partesDocs.filter(d => d.status === 'Entregue').length;
                      const partesPercentage = partesTotal > 0 ? Math.round((partesDelivered / partesTotal) * 100) : 0;

                      const bensDocs = effectiveDocs.filter(d => d.relatedToType === 'asset');
                      const bensTotal = bensDocs.filter(d => d.status !== 'Não se aplica').length;
                      const bensDelivered = bensDocs.filter(d => d.status === 'Entregue').length;
                      const bensPercentage = bensTotal > 0 ? Math.round((bensDelivered / bensTotal) * 100) : 0;

                      const heirsProgress = selectedCase.heirs.map(h => {
                        const hDocs = effectiveDocs.filter(d => d.relatedToType === 'part' && d.relatedToId === h.id);
                        const total = hDocs.filter(d => d.status !== 'Não se aplica').length;
                        const delivered = hDocs.filter(d => d.status === 'Entregue').length;
                        const percentage = total > 0 ? Math.round((delivered / total) * 100) : 0;
                        return { id: h.id, name: h.name, relationship: h.relationship, total, delivered, percentage };
                      });

                      const assetsProgress = selectedCase.assets.map(a => {
                        const aDocs = effectiveDocs.filter(d => d.relatedToType === 'asset' && d.relatedToId === a.id);
                        const total = aDocs.filter(d => d.status !== 'Não se aplica').length;
                        const delivered = aDocs.filter(d => d.status === 'Entregue').length;
                        const percentage = total > 0 ? Math.round((delivered / total) * 100) : 0;
                        return { id: a.id, description: a.description, type: a.type, total, delivered, percentage, heirId: a.heirId };
                      });

                      return (
                        <div className="space-y-4">
                          {/* General Progress Bar */}
                          <div className="bg-neutral-950 p-4 border border-neutral-850 rounded-xl space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider">Progresso Geral das Certidões</span>
                              <span className="text-sm font-bold text-emerald-400 font-mono">{generalPercentage}% <span className="text-xs text-neutral-500 font-normal">({deliveredCount}/{totalCount})</span></span>
                            </div>
                            <div className="w-full h-2.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                              <div 
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${generalPercentage}%` }}
                              />
                            </div>
                          </div>

                          {/* Categories Subgrid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* De Cujus / Geral */}
                            <div 
                              onClick={() => {
                                if (docFilter === 'general') {
                                  setDocFilter('all');
                                } else {
                                  setDocFilter('general');
                                }
                              }}
                              className={`p-3 border rounded-xl space-y-1.5 text-center sm:text-left cursor-pointer hover:scale-[1.01] transition-all duration-200 ${
                                docFilter === 'general'
                                  ? 'border-purple-500 bg-purple-950/15 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                                  : 'bg-neutral-950 border-neutral-850 hover:border-neutral-700'
                              }`}
                            >
                              <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-[10px] text-neutral-400 font-mono uppercase tracking-wider font-semibold">
                                <Scale className="w-3.5 h-3.5 text-purple-400" />
                                <span>De Cujus / Geral</span>
                              </div>
                              <div className="flex items-baseline justify-center sm:justify-start space-x-1.5 mt-1">
                                <span className="text-lg font-bold text-neutral-200 font-mono">{decujusPercentage}%</span>
                                <span className="text-[10px] text-neutral-500 font-mono">({decujusDelivered}/{decujusTotal} docs)</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${decujusPercentage}%` }} />
                              </div>
                            </div>

                            {/* Partes */}
                            <div 
                              onClick={() => {
                                if (docFilter === 'part') {
                                  setDocFilter('all');
                                } else {
                                  setDocFilter('part');
                                }
                              }}
                              className={`p-3 border rounded-xl space-y-1.5 text-center sm:text-left cursor-pointer hover:scale-[1.01] transition-all duration-200 ${
                                docFilter === 'part'
                                  ? 'border-blue-500 bg-blue-950/15 shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                                  : 'bg-neutral-950 border-neutral-850 hover:border-neutral-700'
                              }`}
                            >
                              <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-[10px] text-neutral-400 font-mono uppercase tracking-wider font-semibold">
                                <User className="w-3.5 h-3.5 text-blue-400" />
                                <span>Partes ({selectedCase.heirs.length})</span>
                              </div>
                              <div className="flex items-baseline justify-center sm:justify-start space-x-1.5 mt-1">
                                <span className="text-lg font-bold text-neutral-200 font-mono">{partesPercentage}%</span>
                                <span className="text-[10px] text-neutral-500 font-mono">({partesDelivered}/{partesTotal} docs)</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${partesPercentage}%` }} />
                              </div>
                            </div>

                            {/* Bens */}
                            <div 
                              onClick={() => {
                                if (docFilter === 'asset') {
                                  setDocFilter('all');
                                } else {
                                  setDocFilter('asset');
                                }
                              }}
                              className={`p-3 border rounded-xl space-y-1.5 text-center sm:text-left cursor-pointer hover:scale-[1.01] transition-all duration-200 ${
                                docFilter === 'asset'
                                  ? 'border-emerald-500 bg-emerald-950/15 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                                  : 'bg-neutral-950 border-neutral-850 hover:border-neutral-700'
                              }`}
                            >
                              <div className="flex items-center justify-center sm:justify-start space-x-1.5 text-[10px] text-neutral-400 font-mono uppercase tracking-wider font-semibold">
                                <Gem className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Bens ({selectedCase.assets.length})</span>
                              </div>
                              <div className="flex items-baseline justify-center sm:justify-start space-x-1.5 mt-1">
                                <span className="text-lg font-bold text-neutral-200 font-mono">{bensPercentage}%</span>
                                <span className="text-[10px] text-neutral-500 font-mono">({bensDelivered}/{bensTotal} docs)</span>
                              </div>
                              <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${bensPercentage}%` }} />
                              </div>
                            </div>
                          </div>

                          {/* Individualized Progress drawer */}
                          {(heirsProgress.length > 0 || assetsProgress.length > 0) && (
                            <div className="bg-neutral-950 p-3.5 border border-neutral-850 rounded-xl space-y-2.5">
                              <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-widest block border-b border-neutral-900 pb-1.5">Progresso Individualizado</span>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[140px] overflow-y-auto pr-1">
                                {/* Heirs */}
                                {heirsProgress.length > 0 && (
                                  <div className="space-y-1.5 transition-all duration-300 ease-in-out opacity-100">
                                    <div className="text-[9px] font-bold text-blue-400 uppercase tracking-wider font-mono">Por Herdeiro</div>
                                    <div className="space-y-1">
                                      {heirsProgress.map(h => {
                                        const isActive = individualFilter?.type === 'part' && individualFilter?.id === h.id;
                                        return (
                                          <div 
                                            key={h.id} 
                                            onClick={() => {
                                              if (isActive) {
                                                setIndividualFilter(null);
                                              } else {
                                                setIndividualFilter({ type: 'part', id: h.id, name: h.name });
                                                if (docFilter !== 'part') {
                                                  setDocFilter('part');
                                                }
                                              }
                                            }}
                                            className={`text-[11px] p-2 border rounded-lg flex justify-between items-center cursor-pointer hover:scale-[1.01] transition-all duration-200 ${
                                              isActive 
                                                ? 'border-blue-500 bg-blue-950/15 shadow-[0_0_8px_rgba(59,130,246,0.15)] text-blue-100' 
                                                : 'bg-neutral-900/60 border-neutral-850 text-neutral-300 hover:border-neutral-700'
                                            }`}
                                          >
                                            <div className="truncate pr-2">
                                              <span className={`font-semibold block truncate ${isActive ? 'text-blue-300' : 'text-neutral-300'}`} title={h.name}>{h.name}</span>
                                              <span className="text-[9px] text-neutral-500 capitalize">{h.relationship}</span>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <span className="font-mono font-bold text-blue-300 block">{h.percentage}%</span>
                                              <span className="text-[9px] text-neutral-500 font-mono">{h.delivered}/{h.total} entregues</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Assets */}
                                {assetsProgress.length > 0 && (
                                  <div className="space-y-1.5 transition-all duration-300 ease-in-out opacity-100">
                                    <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-mono">Por Bem</div>
                                    <div className="space-y-1">
                                      {assetsProgress.map(a => {
                                        const isActive = individualFilter?.type === 'asset' && individualFilter?.id === a.id;
                                        const assetColors = getAssetColorConfig(a.type);
                                        const exclusiveHeirName = a.heirId ? selectedCase.heirs.find(h => h.id === a.heirId)?.name : null;
                                        return (
                                          <div 
                                            key={a.id} 
                                            onClick={() => {
                                              if (isActive) {
                                                setIndividualFilter(null);
                                              } else {
                                                setIndividualFilter({ type: 'asset', id: a.id, name: a.description });
                                                if (docFilter !== 'asset') {
                                                  setDocFilter('asset');
                                                }
                                              }
                                            }}
                                            className={`text-[11px] p-2 border-y border-r border-l-4 rounded-lg flex justify-between items-center cursor-pointer hover:scale-[1.01] transition-all duration-200 ${
                                              isActive 
                                                ? `${assetColors.activeBorder} ${assetColors.activeBg} ${assetColors.shadow} ${assetColors.text}` 
                                                : `bg-neutral-900/60 border-neutral-850 text-neutral-300 hover:border-neutral-750 ${assetColors.borderLeft}`
                                            }`}
                                          >
                                            <div className="truncate pr-2">
                                              <span className={`font-semibold block truncate ${isActive ? assetColors.text : 'text-neutral-300'}`} title={a.description}>{a.description}</span>
                                              <span className="text-[9px] text-neutral-500 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                <span className={`w-1.5 h-1.5 rounded-full ${assetColors.bullet}`} />
                                                <span>{a.type}</span>
                                                {exclusiveHeirName && (
                                                  <span className="text-[8.5px] text-emerald-450 font-sans ml-1 bg-emerald-950/40 px-1 py-0.2 rounded-full border border-emerald-900/30 flex items-center gap-0.5 shrink-0 font-medium">
                                                    <span>👤 {exclusiveHeirName}</span>
                                                  </span>
                                                )}
                                              </span>
                                            </div>
                                            <div className="text-right shrink-0">
                                              <span className={`font-mono font-bold block ${isActive ? assetColors.text : 'text-neutral-300'}`}>{a.percentage}%</span>
                                              <span className="text-[9px] text-neutral-500 font-mono">{a.delivered}/{a.total} entregues</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-1.5 border-b border-neutral-850 pb-2">
                      <button
                        onClick={() => {
                          setDocFilter('all');
                          setShowOnlyPending(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                          docFilter === 'all' && !showOnlyPending
                            ? 'bg-neutral-100 text-neutral-950 font-bold' 
                            : 'bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        Todos
                      </button>
                      <button
                        onClick={() => {
                          setDocFilter('general');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                          docFilter === 'general' 
                            ? 'bg-purple-600 text-white font-bold' 
                            : 'bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        Geral
                      </button>
                      <button
                        onClick={() => {
                          setDocFilter('part');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                          docFilter === 'part' 
                            ? 'bg-blue-600 text-white font-bold' 
                            : 'bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        Partes
                      </button>
                      <button
                        onClick={() => {
                          setDocFilter('asset');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                          docFilter === 'asset' 
                            ? 'bg-emerald-600 text-white font-bold' 
                            : 'bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        Bens
                      </button>
                      <button
                        onClick={() => setShowOnlyPending(prev => !prev)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider font-semibold transition-all cursor-pointer ${
                          showOnlyPending 
                            ? 'bg-red-900 text-red-100 font-bold animate-pulse' 
                            : 'bg-neutral-950 border border-neutral-850 text-neutral-400 hover:text-neutral-200'
                        }`}
                      >
                        Pendentes
                      </button>
                    </div>

                    {individualFilter && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-neutral-900 border border-neutral-850 rounded-xl px-3.5 py-2.5 text-xs transition-all duration-300 gap-2">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${individualFilter.type === 'part' ? 'bg-blue-400' : 'bg-emerald-400'} animate-pulse`} />
                          <span className="text-neutral-300 leading-relaxed">
                            Exibindo documentos de:{' '}
                            <strong className="text-neutral-100 font-bold">{individualFilter.name}</strong>
                          </span>
                        </div>
                        <button
                          onClick={() => setIndividualFilter(null)}
                          className="flex items-center justify-center space-x-1.5 text-red-400 hover:text-red-300 font-mono text-[10px] uppercase font-bold px-2 py-1 rounded bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 transition-all cursor-pointer self-start sm:self-center"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Limpar Filtro Individual</span>
                        </button>
                      </div>
                    )}

                    {/* Documents List */}
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {(() => {
                        const effectiveDocs = getEffectiveDocuments(selectedCase);
                        const filtered = effectiveDocs.filter(docItem => {
                          if (individualFilter) {
                            if (individualFilter.type === 'part') {
                              // It's a heir. Show heir's own documents OR documents of assets linked to this heir.
                              const isHeirDoc = docItem.relatedToType === 'part' && docItem.relatedToId === individualFilter.id;
                              
                              let isLinkedAssetDoc = false;
                              if (docItem.relatedToType === 'asset') {
                                const matchedAsset = selectedCase.assets.find(a => a.id === docItem.relatedToId);
                                if (matchedAsset && matchedAsset.heirId === individualFilter.id) {
                                  isLinkedAssetDoc = true;
                                }
                              }
                              
                              if (!isHeirDoc && !isLinkedAssetDoc) {
                                return false;
                              }
                            } else {
                              if (docItem.relatedToType !== individualFilter.type || docItem.relatedToId !== individualFilter.id) {
                                return false;
                              }
                            }
                          }
                          if (docFilter !== 'all') {
                            if (docItem.relatedToType !== docFilter) {
                              return false;
                            }
                          }
                          if (showOnlyPending) {
                            if (docItem.status !== 'Pendente') {
                              return false;
                            }
                          }
                          return true;
                        });

                        if (filtered.length === 0) {
                          return (
                            <div className="text-center py-8 text-neutral-500 border border-dashed border-neutral-850 rounded-xl space-y-1">
                              <AlertCircle className="w-5 h-5 text-neutral-600 mx-auto" />
                              <p className="text-xs text-neutral-400">Nenhum documento nesta categoria.</p>
                            </div>
                          );
                        }

                        return filtered.map(docItem => {
                          const statusColors = {
                            Pendente: 'bg-red-950/40 text-red-400 border-red-500/20',
                            Entregue: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20',
                            'Em Análise': 'bg-blue-950/40 text-blue-400 border-blue-500/20',
                            Rejeitado: 'bg-yellow-950/40 text-yellow-400 border-yellow-500/20',
                            'Não se aplica': 'bg-neutral-800/60 text-neutral-400 border-neutral-700/20'
                          };

                          return (
                            <div key={docItem.id} className="p-3 bg-neutral-950 rounded-xl border border-neutral-850 space-y-2.5 hover:border-neutral-700 transition-all">
                              <div className="flex justify-between items-start gap-3">
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-start space-x-2">
                                    <FileText className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                                    <h4 className="text-xs font-semibold text-neutral-200 leading-tight">{docItem.title}</h4>
                                  </div>

                                  {/* Relation Tag */}
                                  <div className="flex items-center space-x-1.5 text-[10px] text-neutral-400 font-mono">
                                    {docItem.relatedToType === 'part' ? (
                                      <>
                                        <User className="w-3 h-3 text-blue-400 shrink-0" />
                                        <span className="text-neutral-500">Parte:</span>
                                        <span className="text-blue-300 font-sans font-medium truncate max-w-[180px]">{docItem.relatedToName}</span>
                                      </>
                                    ) : docItem.relatedToType === 'asset' ? (
                                      <>
                                        <Gem className="w-3 h-3 text-emerald-400 shrink-0" />
                                        <span className="text-neutral-500">Bem:</span>
                                        <span className="text-emerald-300 font-sans font-medium truncate max-w-[180px]">{docItem.relatedToName}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Scale className="w-3 h-3 text-neutral-500 shrink-0" />
                                        <span className="text-neutral-500 font-mono">Geral do Espólio</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center space-x-1.5 shrink-0">
                                  {/* Status Selector */}
                                  <select
                                    value={docItem.status}
                                    onChange={(e) => handleUpdateDocumentStatus(selectedCase, docItem.id, e.target.value as any)}
                                    className={`text-[10px] font-bold border rounded px-1.5 py-0.5 bg-neutral-900 cursor-pointer focus:outline-none ${statusColors[docItem.status] || 'text-neutral-300'}`}
                                  >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Em Análise">Em Análise</option>
                                    <option value="Entregue">Entregue</option>
                                    <option value="Rejeitado">Rejeitado</option>
                                    <option value="Não se aplica">Não se aplica</option>
                                  </select>

                                  <button
                                    onClick={() => handleDeleteDocument(selectedCase, docItem.id)}
                                    className="p-1 text-neutral-500 hover:text-red-500 rounded hover:bg-neutral-900 transition-colors cursor-pointer"
                                    title="Remover / Redefinir documento"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Document Notes */}
                              <div className="flex items-center space-x-2 pt-1.5 border-t border-neutral-900">
                                <span className="text-[10px] text-neutral-500 font-mono shrink-0">Notas:</span>
                                <input
                                  type="text"
                                  defaultValue={docItem.notes || ''}
                                  placeholder="Ex: Falta reconhecer firma..."
                                  onBlur={(e) => handleUpdateDocumentNotes(selectedCase, docItem.id, e.target.value)}
                                  className="w-full bg-transparent border-none text-[11px] text-neutral-300 placeholder-neutral-700 focus:outline-none focus:ring-0 px-0 py-0"
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    {/* Document Addition Form */}
                    <div className="pt-4 border-t border-neutral-850 space-y-3">
                      <div className="text-[11px] font-bold text-neutral-400 font-mono uppercase tracking-wider font-semibold">Adicionar Documento Customizado</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={newDoc.title}
                          onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                          placeholder="Nome do Documento (Ex: Certidão Especial da Junta)"
                          className="sm:col-span-2 w-full bg-neutral-950 border border-neutral-850 text-xs px-3 py-2 rounded-lg text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono text-neutral-500 uppercase">Relacionar com</label>
                          <select
                            value={newDoc.relatedToType}
                            onChange={(e) => setNewDoc({ ...newDoc, relatedToType: e.target.value as any, relatedToId: '' })}
                            className="w-full bg-neutral-950 border border-neutral-850 text-xs px-2 py-1.5 rounded-lg text-neutral-200 focus:outline-none cursor-pointer"
                          >
                            <option value="general">Geral (Processo do Espólio)</option>
                            <option value="part">Herdeiro / Legatário</option>
                            <option value="asset">Bem / Ativo</option>
                          </select>
                        </div>

                        {newDoc.relatedToType !== 'general' && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono text-neutral-500 uppercase">
                              Selecione {newDoc.relatedToType === 'part' ? 'o Herdeiro' : 'o Bem'}
                            </label>
                            <select
                              value={newDoc.relatedToId}
                              onChange={(e) => setNewDoc({ ...newDoc, relatedToId: e.target.value })}
                              required
                              className="w-full bg-neutral-950 border border-neutral-850 text-xs px-2 py-1.5 rounded-lg text-neutral-200 focus:outline-none cursor-pointer"
                            >
                              <option value="">-- Selecione --</option>
                              {newDoc.relatedToType === 'part' ? (
                                selectedCase.heirs.map(h => (
                                  <option key={h.id} value={h.id}>{h.name} ({h.relationship})</option>
                                ))
                              ) : (
                                selectedCase.assets.map(a => (
                                  <option key={a.id} value={a.id}>{a.type} - {a.description}</option>
                                ))
                              )}
                            </select>
                          </div>
                        )}

                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-mono text-neutral-500 uppercase">Observações Iniciais</label>
                          <input
                            type="text"
                            value={newDoc.notes}
                            onChange={(e) => setNewDoc({ ...newDoc, notes: e.target.value })}
                            placeholder="Notas adicionais sobre custas, regularização, etc."
                            className="w-full bg-neutral-950 border border-neutral-850 text-xs px-3 py-2 rounded-lg text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => handleAddDocument(selectedCase)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Documento Customizado</span>
                      </button>
                    </div>
                  </div>

                </div>

                {/* Right controls: Aliquotes & Pie distributions */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Rates sliders */}
                  <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-neutral-400 border-b border-neutral-850 pb-2">Alíquotas de Imposto e Custas</h3>
                    
                    <div className="space-y-4 text-xs font-mono">
                      {/* ITCMD */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-neutral-400">
                          <span>Imposto ITCMD:</span>
                          <strong className="text-white">{selectedCase.itcmdRate}%</strong>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          value={selectedCase.itcmdRate}
                          onChange={(e) => handleUpdateConfig(selectedCase, { itcmdRate: Number(e.target.value) })}
                          className="w-full accent-emerald-500"
                        />
                        <div className="flex items-center justify-between text-[10px] text-neutral-450 pt-0.5">
                          <span className="text-neutral-500 font-sans">Vincular ITCMD a:</span>
                          <select
                            value={selectedCase.itcmdHeirId || ''}
                            onChange={(e) => handleUpdateConfig(selectedCase, { itcmdHeirId: e.target.value })}
                            className="bg-neutral-950 border border-neutral-850 rounded px-1.5 py-0.5 text-neutral-300 text-[10px] focus:outline-none cursor-pointer max-w-[150px]"
                          >
                            <option value="">🌐 Espólio Comum (Todos)</option>
                            {selectedCase.heirs.map(h => (
                              <option key={h.id} value={h.id}>👤 {h.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Attorney Fee */}
                      <div className="space-y-2 border-t border-neutral-850 pt-2">
                        <div className="flex justify-between items-center text-neutral-400">
                          <span>Honorários Advocatícios:</span>
                          <select
                            value={selectedCase.attorneyFeeType || 'percentage'}
                            onChange={(e) => handleUpdateConfig(selectedCase, { attorneyFeeType: e.target.value as 'percentage' | 'fixed' })}
                            className="bg-neutral-950 border border-neutral-850 text-[10px] rounded px-1.5 py-0.5 text-neutral-300 focus:outline-none cursor-pointer"
                          >
                            <option value="percentage">Porcentagem (%)</option>
                            <option value="fixed">Valor Fixo (R$)</option>
                          </select>
                        </div>
                        {selectedCase.attorneyFeeType === 'fixed' ? (
                          <div className="space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase">Digitar Valor Manual (R$):</span>
                            <input
                              type="number"
                              value={selectedCase.attorneyFeeValue ?? 0}
                              onChange={(e) => handleUpdateConfig(selectedCase, { attorneyFeeValue: Number(e.target.value) })}
                              placeholder="Valor em R$"
                              className="w-full bg-neutral-950 border border-neutral-850 text-xs px-2 py-1 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-neutral-500">
                              <span>Alíquota:</span>
                              <strong className="text-white">{selectedCase.attorneyFeeRate}%</strong>
                            </div>
                            <input
                              type="range"
                              min="3"
                              max="20"
                              value={selectedCase.attorneyFeeRate}
                              onChange={(e) => handleUpdateConfig(selectedCase, { attorneyFeeRate: Number(e.target.value) })}
                              className="w-full accent-emerald-500"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-neutral-450 pt-0.5">
                          <span className="text-neutral-500 font-sans">Vincular Honorários a:</span>
                          <select
                            value={selectedCase.attorneyFeeHeirId || ''}
                            onChange={(e) => handleUpdateConfig(selectedCase, { attorneyFeeHeirId: e.target.value })}
                            className="bg-neutral-950 border border-neutral-850 rounded px-1.5 py-0.5 text-neutral-300 text-[10px] focus:outline-none cursor-pointer max-w-[150px]"
                          >
                            <option value="">🌐 Espólio Comum (Todos)</option>
                            {selectedCase.heirs.map(h => (
                              <option key={h.id} value={h.id}>👤 {h.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Court Fee */}
                      <div className="space-y-2 border-t border-neutral-850 pt-2">
                        <div className="flex justify-between items-center text-neutral-400">
                          <span>Custas com Emolumentos:</span>
                          <select
                            value={selectedCase.courtFeeType || 'percentage'}
                            onChange={(e) => handleUpdateConfig(selectedCase, { courtFeeType: e.target.value as 'percentage' | 'fixed' })}
                            className="bg-neutral-950 border border-neutral-850 text-[10px] rounded px-1.5 py-0.5 text-neutral-300 focus:outline-none cursor-pointer"
                          >
                            <option value="percentage">Porcentagem (%)</option>
                            <option value="fixed">Valor Fixo (R$)</option>
                          </select>
                        </div>
                        {selectedCase.courtFeeType === 'fixed' ? (
                          <div className="space-y-1">
                            <span className="text-[10px] text-neutral-500 uppercase">Digitar Valor Manual (R$):</span>
                            <input
                              type="number"
                              value={selectedCase.courtFeeValue ?? 0}
                              onChange={(e) => handleUpdateConfig(selectedCase, { courtFeeValue: Number(e.target.value) })}
                              placeholder="Valor em R$"
                              className="w-full bg-neutral-950 border border-neutral-850 text-xs px-2 py-1 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-neutral-500">
                              <span>Alíquota:</span>
                              <strong className="text-white">{selectedCase.courtFeeRate}%</strong>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="4"
                              value={selectedCase.courtFeeRate}
                              onChange={(e) => handleUpdateConfig(selectedCase, { courtFeeRate: Number(e.target.value) })}
                              className="w-full accent-emerald-500"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-neutral-450 pt-0.5">
                          <span className="text-neutral-500 font-sans">Vincular Custas a:</span>
                          <select
                            value={selectedCase.courtFeeHeirId || ''}
                            onChange={(e) => handleUpdateConfig(selectedCase, { courtFeeHeirId: e.target.value })}
                            className="bg-neutral-950 border border-neutral-850 rounded px-1.5 py-0.5 text-neutral-300 text-[10px] focus:outline-none cursor-pointer max-w-[150px]"
                          >
                            <option value="">🌐 Espólio Comum (Todos)</option>
                            {selectedCase.heirs.map(h => (
                              <option key={h.id} value={h.id}>👤 {h.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pie graphic representation */}
                  <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
                    <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-neutral-400 border-b border-neutral-850 pb-2">Rateio Gráfico de Quinhões</h3>
                    
                    <div className="h-44 w-full flex items-center justify-center relative">
                      {math.heirsPie.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={math.heirsPie}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {math.heirsPie.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHAR_COLORS[index % CHAR_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatBRL(value as number)} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-[11px] text-neutral-500 italic py-4">Sem partilhas herdeiras cadastradas.</div>
                      )}
                    </div>

                    <div className="space-y-2 text-[11px] font-mono border-t border-neutral-850 pt-3">
                      {math.heirsPie.map((hr, idx) => (
                        <div key={hr.name} className="flex justify-between items-center text-neutral-400">
                          <span className="flex items-center space-x-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHAR_COLORS[idx % CHAR_COLORS.length] }} />
                            <span className="truncate max-w-[120px] capitalize">{hr.name}:</span>
                          </span>
                          <strong className="text-neutral-200">{formatBRL(hr.value)} ({hr.percentage}%)</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            );
          })()}
        </div>
      )}

      {/* Adding/Opening visual overlay case */}
      {isAddingCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-lg w-full space-y-6">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-md font-bold text-neutral-100 font-display">Abertura de Cálculo de Partilha de Bens</h3>
              <button 
                onClick={() => setIsAddingCase(false)}
                className="p-1 hover:bg-neutral-850 rounded font-semibold text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Associar ao Cliente *</label>
                <select
                  required
                  value={newCase.clientId}
                  onChange={(e) => setNewCase({ ...newCase, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                >
                  <option value="">-- Selecione o Cliente --</option>
                  {clients.map(cli => (
                    <option key={cli.id} value={cli.id}>
                      {cli.name} (CPF {cli.cpf}){cli.status === 'inativo' ? ' [INATIVO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Título / Nome de Identificação de Espólio *</label>
                <input
                  type="text"
                  required
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                  placeholder="Ex: Inventário Extrajudicial - Espólio de Dr. Albuquerque"
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Imposto ITCMD (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={newCase.itcmdRate}
                    onChange={(e) => setNewCase({ ...newCase, itcmdRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                    placeholder="4"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Taxas Judiciárias (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={newCase.courtFeeRate}
                    onChange={(e) => setNewCase({ ...newCase, courtFeeRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Honorários (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={newCase.attorneyFeeRate}
                    onChange={(e) => setNewCase({ ...newCase, attorneyFeeRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                    placeholder="6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Observações Estratégicas</label>
                <textarea
                  rows={2}
                  value={newCase.notes}
                  onChange={(e) => setNewCase({ ...newCase, notes: e.target.value })}
                  placeholder="Se é extrajudicial em tabelionato, se há menores..."
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddingCase(false)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-450 hover:bg-neutral-850 text-neutral-400 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCase}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-transform"
                >
                  {isCreatingCase ? 'Criando...' : 'Criar Ficha de Inventário'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full space-y-4 text-left">
            <h3 className="text-md font-bold text-neutral-100 font-display">{deleteConfirm.title}</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">{deleteConfirm.message}</p>
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
                    await updateDoc(doc(db, 'inventories', deleteConfirm.id), {
                      deleted: true,
                      deletedAt: new Date().toISOString()
                    });
                    setSelectedCase(null);
                    toast.success('Inventário ocultado com sucesso (Soft Delete).');
                  } catch (err) {
                    console.error(err);
                    toast.error('Erro ao ocultar inventário.');
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

      {editingCase && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-lg w-full space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-md font-bold text-neutral-100 font-display">Editar Ficha de Inventário</h3>
              <button 
                onClick={() => setEditingCase(null)}
                className="p-1 hover:bg-neutral-850 rounded font-semibold text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCase} className="space-y-4 text-xs font-semibold">
              
              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Associar ao Cliente *</label>
                <select
                  required
                  value={editCaseForm.clientId}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none cursor-pointer font-sans"
                >
                  <option value="">-- Selecione o Cliente --</option>
                  {clients.map(cli => (
                    <option key={cli.id} value={cli.id}>
                      {cli.name} (CPF {cli.cpf}){cli.status === 'inativo' ? ' [INATIVO]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Título / Nome de Identificação de Espólio *</label>
                <input
                  type="text"
                  required
                  value={editCaseForm.title}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, title: e.target.value })}
                  placeholder="Ex: Inventário Extrajudicial - Espólio de Dr. Albuquerque"
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Imposto ITCMD (%)</label>
                  <input
                    type="number"
                    value={editCaseForm.itcmdRate}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, itcmdRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                    placeholder="4"
                  />
                </div>
              </div>

              {/* Honorários Advocatícios Section */}
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-3">
                <div className="flex justify-between items-center text-neutral-400">
                  <span className="text-xs uppercase font-mono font-bold tracking-wider">Honorários Advocatícios</span>
                  <select
                    value={editCaseForm.attorneyFeeType}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, attorneyFeeType: e.target.value as 'percentage' | 'fixed' })}
                    className="bg-neutral-900 border border-neutral-800 text-[10px] rounded px-1.5 py-0.5 text-neutral-300 focus:outline-none cursor-pointer"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>
                {editCaseForm.attorneyFeeType === 'fixed' ? (
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-mono mb-1">Valor Fixo (R$)</label>
                    <input
                      type="number"
                      value={editCaseForm.attorneyFeeValue}
                      onChange={(e) => setEditCaseForm({ ...editCaseForm, attorneyFeeValue: Number(e.target.value) })}
                      placeholder="Valor em R$"
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs px-2 py-1.5 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-mono mb-1">Alíquota (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={editCaseForm.attorneyFeeRate}
                      onChange={(e) => setEditCaseForm({ ...editCaseForm, attorneyFeeRate: Number(e.target.value) })}
                      placeholder="Ex: 6"
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs px-2 py-1.5 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Custas Judiciais Section */}
              <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-850 space-y-3">
                <div className="flex justify-between items-center text-neutral-400">
                  <span className="text-xs uppercase font-mono font-bold tracking-wider">Custas e Emolumentos</span>
                  <select
                    value={editCaseForm.courtFeeType}
                    onChange={(e) => setEditCaseForm({ ...editCaseForm, courtFeeType: e.target.value as 'percentage' | 'fixed' })}
                    className="bg-neutral-900 border border-neutral-800 text-[10px] rounded px-1.5 py-0.5 text-neutral-300 focus:outline-none cursor-pointer"
                  >
                    <option value="percentage">Porcentagem (%)</option>
                    <option value="fixed">Valor Fixo (R$)</option>
                  </select>
                </div>
                {editCaseForm.courtFeeType === 'fixed' ? (
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-mono mb-1">Valor Fixo (R$)</label>
                    <input
                      type="number"
                      value={editCaseForm.courtFeeValue}
                      onChange={(e) => setEditCaseForm({ ...editCaseForm, courtFeeValue: Number(e.target.value) })}
                      placeholder="Valor em R$"
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs px-2 py-1.5 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] text-neutral-500 uppercase font-mono mb-1">Alíquota (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editCaseForm.courtFeeRate}
                      onChange={(e) => setEditCaseForm({ ...editCaseForm, courtFeeRate: Number(e.target.value) })}
                      placeholder="Ex: 1"
                      className="w-full bg-neutral-900 border border-neutral-800 text-xs px-2 py-1.5 rounded text-neutral-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Observações Estratégicas</label>
                <textarea
                  rows={2}
                  value={editCaseForm.notes}
                  onChange={(e) => setEditCaseForm({ ...editCaseForm, notes: e.target.value })}
                  placeholder="Observações adicionais..."
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-450 hover:bg-neutral-850 text-neutral-400 rounded-lg text-xs font-semibold cursor-pointer"
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

    </div>
  );
}
