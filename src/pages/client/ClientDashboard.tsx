import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, onSnapshot, orderBy, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { Case, Client, CaseMessage, CaseDocument } from '../../types';
import { 
  LogOut, 
  User, 
  Scale, 
  ChevronRight, 
  MessageCircle, 
  Loader2,
  FolderGit,
  Clock,
  ArrowLeft,
  Send,
  Activity,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  CheckSquare,
  FileUp,
  FileText,
  File,
  Download,
  Eye,
  Trash2,
  ShieldCheck,
  Lock,
  UploadCloud,
  FileCheck2,
  X,
  Search,
  Image as ImageIcon,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid, 
  PieChart, 
  Pie 
} from 'recharts';
import { toast } from 'sonner';
import { 
  generateSingleCaseReportPdf, 
  downloadPdfDocument 
} from '../../utils/casePdfGenerator';

export const DOCUMENT_CATEGORIES = [
  'Documentos Pessoais (RG / CPF / CNH)',
  'Comprovante de Residência Atualizado',
  'Comprovante de Renda / Extratos Bancários',
  'Certidão (Nascimento, Casamento, Óbito)',
  'Matrícula, Escritura ou IPTU do Imóvel',
  'Contratos, Recibos e Acordos',
  'Procuração e Declaração Assinadas',
  'Outros Documentos / Provas Complementares'
];

export function formatBytes(bytes: number, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getDocFileIcon(type: string, name: string) {
  if (type.includes('pdf') || name.toLowerCase().endsWith('.pdf')) {
    return <FileText className="w-5 h-5 text-red-400 flex-shrink-0" />;
  }
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(name)) {
    return <ImageIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />;
  }
  if (type.includes('word') || type.includes('officedocument') || /\.(doc|docx)$/i.test(name)) {
    return <FileCheck2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
  }
  return <File className="w-5 h-5 text-neutral-400 flex-shrink-0" />;
}

// Client-side image compression and file reader
export async function processFileForUpload(file: File): Promise<{ dataUrl: string; size: number; name: string; type: string }> {
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1400;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const approxSize = Math.round((dataUrl.length * 3) / 4);
            resolve({
              dataUrl,
              size: approxSize,
              name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
              type: 'image/jpeg'
            });
          } else {
            resolve({ dataUrl: e.target?.result as string, size: file.size, name: file.name, type: file.type });
          }
        };
        img.onerror = () => resolve({ dataUrl: e.target?.result as string, size: file.size, name: file.name, type: file.type });
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // PDF or other documents limit
  if (file.size > 850 * 1024) {
    throw new Error('O arquivo excede o limite recomendado de 850 KB para transmissão criptografada direta. Por favor, utilize um PDF otimizado ou envie em páginas separadas.');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({
        dataUrl: e.target?.result as string,
        size: file.size,
        name: file.name,
        type: file.type || 'application/octet-stream'
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper to compute case progress percentage
export function getCaseProgress(c: Case): number {
  if (c.status === 'Concluído') return 100;
  if (c.status === 'Renunciado') return 0;
  if (c.tasks && c.tasks.length > 0) {
    const done = c.tasks.filter(t => t.completed).length;
    return Math.round((done / c.tasks.length) * 100);
  }
  if (c.status === 'Suspenso') return 25;
  // Estimate based on timeline events
  const steps = c.timeline && c.timeline.length > 0 ? c.timeline.length : 1;
  return Math.min(85, Math.max(25, steps * 20));
}

// Custom tooltip for Active Cases Progress BarChart
function CustomProgressTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-750 p-3.5 rounded-xl shadow-2xl text-xs space-y-2 z-50 min-w-[240px]">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-white text-[13px] leading-snug line-clamp-2">{data.fullName}</p>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {data.status}
          </span>
        </div>
        <p className="text-[11px] text-neutral-400 font-mono">Nº: {data.caseNumber}</p>
        <p className="text-[11px] text-neutral-400">Área: <span className="text-neutral-200">{data.area}</span></p>
        
        <div className="pt-2 border-t border-neutral-800 space-y-1">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-neutral-400">Progresso Atual:</span>
            <span className="text-emerald-400 font-mono font-bold">{data.progress}%</span>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all" 
              style={{ width: `${data.progress}%` }} 
            />
          </div>
          <p className="text-[10px] text-neutral-400 font-mono pt-0.5">{data.tasksInfo}</p>
        </div>
        
        <p className="text-[10px] text-emerald-500/90 font-mono pt-1 text-center border-t border-neutral-800/80">
          Clique na barra para abrir a central do processo
        </p>
      </div>
    );
  }
  return null;
}

// Custom tooltip for Status Overview PieChart
function CustomStatusTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const item = payload[0];
    return (
      <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-750 px-3 py-2 rounded-lg shadow-xl text-xs space-y-1 z-50">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.payload.color }} />
          <span className="font-semibold text-white">{item.name}</span>
        </div>
        <p className="text-[11px] text-neutral-300 font-mono">
          {item.value} {item.value === 1 ? 'processo' : 'processos'} ({item.payload.percentage}%)
        </p>
      </div>
    );
  }
  return null;
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [clientData, setClientData] = useState<Client | null>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Navigation & Sub-views
  const [activeNav, setActiveNav] = useState<'cases' | 'documents'>('cases');
  const [caseTab, setCaseTab] = useState<'messages' | 'documents'>('messages');

  // Chat/Messages State
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Documents State
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [selectedUploadCaseId, setSelectedUploadCaseId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [documentNotes, setDocumentNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<CaseDocument | null>(null);
  const [filterDocCaseId, setFilterDocCaseId] = useState('all');
  const [filterDocCategory, setFilterDocCategory] = useState('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const caseFileInputRef = useRef<HTMLInputElement | null>(null);

  // PDF Export for Client
  const handleExportClientCasePdf = (caseToExport: Case) => {
    try {
      toast.info('Gerando relatório oficial do processo em PDF...');
      const clientObj: Client = {
        id: clientData?.id || currentUser?.uid || '',
        name: clientData?.name || currentUser?.displayName || 'Cliente',
        cpf: clientData?.cpf || '',
        email: clientData?.email || currentUser?.email || '',
        phone: clientData?.phone || '',
        address: clientData?.address || '',
        notes: '',
        createdAt: clientData?.createdAt || new Date().toISOString()
      };
      
      const docPdf = generateSingleCaseReportPdf(caseToExport, {
        client: clientObj,
        includeNotes: false, // Internal notes hidden from client export
        includeTasks: true,
        includeTimeline: true
      });
      
      const safeNum = (caseToExport.caseNumber || 'sem_numero').replace(/[^a-zA-Z0-9_-]/g, '_');
      const safeTitle = (caseToExport.title || 'processo').substring(0, 25).replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadPdfDocument(docPdf, `Relatorio_Processo_${safeNum}_${safeTitle}.pdf`);
      toast.success('Relatório do processo baixado com sucesso!');
    } catch (err) {
      console.error('Erro ao exportar PDF do processo:', err);
      toast.error('Erro ao gerar relatório do processo em PDF.');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        try {
          // Find the client document that matches the UID
          const q = query(collection(db, 'clients'), where('uid', '==', user.uid));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            const clientDoc = snapshot.docs[0];
            const clientObj = { id: clientDoc.id, ...clientDoc.data() } as Client;
            setClientData(clientObj);
            
            // Now listen to their cases
            // Since we can't easily query cases by client UID directly (unless we added uid to case),
            // we query cases by clientId
            const casesQuery = query(
              collection(db, 'cases'),
              where('clientId', '==', clientDoc.id)
            );
            
            // Real-time listener for cases
            onSnapshot(casesQuery, (caseSnap) => {
              const casesList = caseSnap.docs
                .map(d => ({ id: d.id, ...d.data() } as Case))
                .filter(c => !c.deleted);
              
              const sorted = casesList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setCases(sorted);
              if (sorted.length > 0 && !selectedUploadCaseId) {
                setSelectedUploadCaseId(sorted[0].id);
              }
            }, (err) => {
              console.error('Error fetching cases:', err);
              toast.error('Erro ao buscar seus processos.');
            });
          } else {
            // Not a client! Log them out or send to admin
            toast.error('Conta de cliente não encontrada.');
            navigate('/');
          }
        } catch (error) {
          console.error("Error fetching client profile", error);
        } finally {
          setLoading(false);
        }
      } else {
        navigate('/login');
      }
    });

    return unsubscribe;
  }, [navigate]);

  // Real-time listener for documents across all client cases
  useEffect(() => {
    if (!cases || cases.length === 0) {
      setDocuments([]);
      return;
    }

    if (!selectedUploadCaseId && cases.length > 0) {
      setSelectedUploadCaseId(cases[0].id);
    }

    const unsubs: (() => void)[] = [];
    const docsMap = new Map<string, CaseDocument[]>();

    cases.forEach((cs) => {
      const docsRef = collection(db, `cases/${cs.id}/documents`);
      const q = query(docsRef, orderBy('uploadedAt', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseDocument));
        docsMap.set(cs.id, list);

        const allDocs: CaseDocument[] = [];
        docsMap.forEach((cDocs) => allDocs.push(...cDocs));
        allDocs.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        setDocuments(allDocs);
      }, (err) => {
        console.error('Error fetching documents for case:', cs.id, err);
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [cases]);

  // Handle messages when a case is selected
  useEffect(() => {
    if (!selectedCase) return;
    
    setLoadingMessages(true);
    const messagesRef = collection(db, `cases/${selectedCase.id}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'asc'));
    
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as CaseMessage));
      setMessages(msgs);
      setLoadingMessages(false);
    }, (err) => {
      console.error('Error fetching messages:', err);
      toast.error('Erro ao carregar mensagens.');
      setLoadingMessages(false);
    });

    return () => unsub();
  }, [selectedCase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCase || !clientData || !currentUser) return;

    try {
      const messagesRef = collection(db, `cases/${selectedCase.id}/messages`);
      await addDoc(messagesRef, {
        caseId: selectedCase.id,
        senderId: currentUser.uid,
        senderName: clientData.name,
        senderRole: 'client',
        text: newMessage.trim(),
        createdAt: new Date().toISOString()
      });
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      toast.error('Erro ao enviar mensagem.');
    }
  };

  const handleFileChosen = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. O limite máximo permitido é de 10 MB.');
      return;
    }
    if (!file.type.startsWith('image/') && file.size > 850 * 1024) {
      toast.error('Para PDFs e documentos de texto, o tamanho máximo para transmissão direta é de 850 KB.');
      return;
    }
    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChosen(e.dataTransfer.files[0]);
    }
  };

  const handleUploadDocument = async (e: React.FormEvent, targetCaseOverride?: string) => {
    e.preventDefault();
    const caseIdToUse = targetCaseOverride || selectedUploadCaseId;
    if (!caseIdToUse) {
      toast.error('Por favor, selecione o processo correspondente.');
      return;
    }
    if (!selectedFile) {
      toast.error('Selecione ou arraste um arquivo para transmitir.');
      return;
    }
    if (!clientData || !currentUser) {
      toast.error('Sessão expirada. Faça login novamente.');
      return;
    }

    const targetCase = cases.find(c => c.id === caseIdToUse);
    if (!targetCase) {
      toast.error('Processo selecionado não encontrado.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Processando e transmitindo documento com segurança...');

    try {
      const processed = await processFileForUpload(selectedFile);

      const docPayload = {
        caseId: targetCase.id,
        caseTitle: targetCase.title,
        clientId: clientData.id,
        clientName: clientData.name,
        fileName: processed.name,
        fileSize: processed.size,
        fileType: processed.type,
        fileData: processed.dataUrl,
        category: selectedCategory,
        notes: documentNotes.trim(),
        status: 'Enviado' as const,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'client' as const,
        uploadedByUid: currentUser.uid
      };

      const docsRef = collection(db, `cases/${targetCase.id}/documents`);
      await addDoc(docsRef, docPayload);

      // System notification message in case chat
      try {
        const messagesRef = collection(db, `cases/${targetCase.id}/messages`);
        await addDoc(messagesRef, {
          caseId: targetCase.id,
          senderId: currentUser.uid,
          senderName: clientData.name,
          senderRole: 'client',
          text: `📎 [DOCUMENTO TRANSMITIDO] Arquivo: "${processed.name}" (${selectedCategory})${documentNotes.trim() ? ` • Obs: ${documentNotes.trim()}` : ''}`,
          createdAt: new Date().toISOString()
        });
      } catch (chatErr) {
        console.warn('Could not post chat notice for document:', chatErr);
      }

      toast.success('Documento transmitido com sucesso ao seu advogado!', { id: toastId });
      setSelectedFile(null);
      setDocumentNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (caseFileInputRef.current) {
        caseFileInputRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Error uploading document:', err);
      toast.error(err?.message || 'Falha ao transmitir documento.', { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docItem: CaseDocument) => {
    if (!window.confirm(`Deseja realmente remover o arquivo "${docItem.fileName}"?`)) return;
    try {
      await deleteDoc(doc(db, `cases/${docItem.caseId}/documents`, docItem.id));
      toast.success('Documento removido.');
    } catch (err) {
      console.error('Error deleting document:', err);
      toast.error('Erro ao excluir documento.');
    }
  };

  const handleDownloadDocument = (docItem: CaseDocument) => {
    if (!docItem.fileData) {
      toast.error('Arquivo indisponível para download.');
      return;
    }
    const a = document.createElement('a');
    a.href = docItem.fileData;
    a.download = docItem.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Download de ${docItem.fileName} iniciado.`);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  if (loading) {
    return (
      <div className="bg-neutral-950 min-h-screen text-emerald-500 font-mono flex flex-col justify-center items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs">Carregando seu portal seguro...</span>
      </div>
    );
  }

  if (!clientData) return null;

  // Active cases calculations
  const activeCases = cases.filter(c => !c.deleted && (c.status === 'Em andamento' || c.status === 'Suspenso'));
  const strictlyActiveCases = cases.filter(c => !c.deleted && c.status === 'Em andamento');
  const completedCasesCount = cases.filter(c => !c.deleted && c.status === 'Concluído').length;

  const averageActiveProgress = activeCases.length > 0
    ? Math.round(activeCases.reduce((acc, c) => acc + getCaseProgress(c), 0) / activeCases.length)
    : 0;

  // Data for Active Cases Progress Chart
  const activeCasesChartData = activeCases.map(c => {
    const progress = getCaseProgress(c);
    const completedTasks = c.tasks ? c.tasks.filter(t => t.completed).length : 0;
    const totalTasks = c.tasks ? c.tasks.length : 0;
    const shortTitle = c.title.length > 22 ? c.title.substring(0, 20) + '...' : c.title;
    return {
      id: c.id,
      name: shortTitle,
      fullName: c.title,
      caseNumber: c.caseNumber || 'Não informado',
      status: c.status,
      area: c.area || 'Jurídico',
      progress,
      completedTasks,
      totalTasks,
      tasksInfo: totalTasks > 0 ? `${completedTasks} de ${totalTasks} etapas concluídas` : `${c.timeline?.length || 1} movimentações registradas`,
      rawCase: c
    };
  });

  // Data for Status Overview Pie Chart
  const statusCounts = cases.reduce((acc, curr) => {
    const s = curr.status || 'Em andamento';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalCasesCount = cases.length;
  const statusPieData = [
    { name: 'Em andamento', value: statusCounts['Em andamento'] || 0, color: '#10b981' },
    { name: 'Concluído', value: statusCounts['Concluído'] || 0, color: '#06b6d4' },
    { name: 'Suspenso', value: statusCounts['Suspenso'] || 0, color: '#f59e0b' },
    { name: 'Renunciado', value: statusCounts['Renunciado'] || 0, color: '#64748b' }
  ].filter(item => item.value > 0).map(item => ({
    ...item,
    percentage: totalCasesCount > 0 ? Math.round((item.value / totalCasesCount) * 100) : 0
  }));

  const activeBarChartHeight = Math.min(360, Math.max(220, activeCasesChartData.length * 52));

  return (
    <div className="bg-neutral-950 min-h-screen text-slate-200 font-segoe antialiased flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-neutral-900 border-b md:border-b-0 md:border-r border-neutral-800/80 p-6 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-8">
          {/* Logo brand */}
          <div className="flex items-center space-x-3 pb-4 border-b border-neutral-800">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-white">Portal do Cliente</h2>
              <p className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Área Restrita</p>
            </div>
          </div>

          <nav className="space-y-1.5 text-xs font-semibold">
            <button
              onClick={() => { setSelectedCase(null); setActiveNav('cases'); }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                !selectedCase && activeNav === 'cases'
                  ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/25 shadow-md shadow-emerald-500/5' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
              }`}
            >
              <FolderGit className="w-4 h-4" />
              <span>Meus Processos</span>
            </button>

            <button
              onClick={() => { setSelectedCase(null); setActiveNav('documents'); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ${
                !selectedCase && activeNav === 'documents'
                  ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/25 shadow-md shadow-emerald-500/5' 
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
              }`}
            >
              <div className="flex items-center space-x-3">
                <FileUp className="w-4 h-4" />
                <span>Envio de Documentos</span>
              </div>
              {documents.length > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {documents.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold flex-shrink-0">
              {clientData.name.charAt(0)}
            </div>
            <div className="truncate max-w-[120px]">
              <span className="text-white font-semibold font-sans block truncate text-[11px]">{clientData.name}</span>
              <span className="text-[9px] text-neutral-500 block uppercase font-mono">Cliente</span>
            </div>
          </div>
          
          <button 
            onClick={handleSignOut}
            className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow flex flex-col h-screen overflow-hidden">
        
        {/* Header */}
        <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex-shrink-0 flex items-center justify-between">
          {selectedCase ? (
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setSelectedCase(null)}
                className="p-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                title="Voltar para a visão geral"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-bold font-display text-neutral-100">{selectedCase.title}</h1>
                <p className="text-xs text-neutral-400 font-mono">Processo: {selectedCase.caseNumber || 'N/A'} • Status: {selectedCase.status}</p>
              </div>
            </div>
          ) : activeNav === 'documents' ? (
            <div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h1 className="text-lg font-bold font-display text-neutral-100">Central Segura de Documentos</h1>
              </div>
              <p className="text-xs text-neutral-400 font-mono">Transmissão protegida com sigilo profissional advocatício (Art. 7º, II - OAB).</p>
            </div>
          ) : (
            <div>
              <h1 className="text-lg font-bold font-display text-neutral-100">Visão Geral</h1>
              <p className="text-xs text-neutral-400 font-mono">Bem-vindo(a), acompanhe o status e a evolução das suas ações.</p>
            </div>
          )}

          {!selectedCase && activeNav === 'cases' && (
            <button
              onClick={() => setActiveNav('documents')}
              className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Enviar Documentos</span>
            </button>
          )}

          {selectedCase && (
            <button
              onClick={() => handleExportClientCasePdf(selectedCase)}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition-all cursor-pointer shadow-sm"
              title="Baixar Relatório de Acompanhamento Processual em PDF"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Baixar Relatório (PDF)</span>
              <span className="sm:hidden">PDF</span>
            </button>
          )}
        </header>

        {/* Dynamic Workspace */}
        <div className="flex-grow overflow-y-auto bg-neutral-950 p-6">
          {!selectedCase && activeNav === 'cases' ? (
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Summary Stats Strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[11px] font-mono uppercase tracking-wider">Processos Ativos</span>
                    <Activity className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold font-display text-white">{activeCases.length}</div>
                  <p className="text-[10px] text-emerald-400 font-mono">{strictlyActiveCases.length} em andamento</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[11px] font-mono uppercase tracking-wider">Progresso Médio</span>
                    <TrendingUp className="w-4 h-4 text-cyan-500" />
                  </div>
                  <div className="text-2xl font-bold font-display text-white">{averageActiveProgress}%</div>
                  <p className="text-[10px] text-neutral-400 font-mono">Demandas ativas</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[11px] font-mono uppercase tracking-wider">Concluídos</span>
                    <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold font-display text-white">{completedCasesCount}</div>
                  <p className="text-[10px] text-neutral-400 font-mono">Ações finalizadas</p>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-1">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-[11px] font-mono uppercase tracking-wider">Documentos Enviados</span>
                    <FileText className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold font-display text-white">{documents.length}</div>
                  <p className="text-[10px] text-neutral-400 font-mono">Transmitidos ao escritório</p>
                </div>
              </div>

              {/* Case Status & Progress Charts (Recharts) */}
              {cases.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Active Cases Progress Chart */}
                  <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4 text-emerald-500" />
                        <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-widest font-mono">
                          Progresso dos Processos Ativos
                        </h3>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {activeCases.length} {activeCases.length === 1 ? 'ativo' : 'ativos'}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-400">
                      Percentual de conclusão baseado nas etapas e fases processuais. Clique na barra para abrir a central do caso.
                    </p>

                    {activeCasesChartData.length > 0 ? (
                      <div style={{ height: activeBarChartHeight }} className="w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={activeCasesChartData}
                            layout="vertical"
                            margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
                          >
                            <CartesianGrid stroke="#262626" strokeDasharray="3 3" horizontal={false} />
                            <XAxis
                              type="number"
                              domain={[0, 100]}
                              stroke="#737373"
                              fontSize={11}
                              tickLine={false}
                              tickFormatter={(v) => `${v}%`}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={130}
                              stroke="#a3a3a3"
                              fontSize={11}
                              tickLine={false}
                            />
                            <Tooltip
                              content={<CustomProgressTooltip />}
                              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                            />
                            <Bar
                              dataKey="progress"
                              radius={[0, 6, 6, 0]}
                              maxBarSize={24}
                              onClick={(entry) => {
                                if (entry && (entry as any).rawCase) {
                                  setSelectedCase((entry as any).rawCase);
                                }
                              }}
                              className="cursor-pointer"
                            >
                              {activeCasesChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={
                                    entry.progress >= 75
                                      ? '#10b981'
                                      : entry.progress >= 40
                                      ? '#06b6d4'
                                      : '#f59e0b'
                                  }
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="py-10 text-center text-xs text-neutral-500 font-mono">
                        Nenhum processo ativo no momento.
                      </div>
                    )}
                  </div>

                  {/* Status Overview Pie Chart */}
                  <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex items-center space-x-2">
                      <PieChartIcon className="w-4 h-4 text-cyan-500" />
                      <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-widest font-mono">
                        Visão Geral de Status
                      </h3>
                    </div>

                    <div className="h-44 w-full flex items-center justify-center relative">
                      {statusPieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statusPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={46}
                              outerRadius={68}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {statusPieData.map((entry, index) => (
                                <Cell key={`pie-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomStatusTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-xs text-neutral-500">Sem dados.</div>
                      )}
                    </div>

                    {/* Status Legend Breakdown */}
                    <div className="space-y-1.5 pt-2 border-t border-neutral-800 text-xs font-mono">
                      {statusPieData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-neutral-300">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                            <span>{item.name}</span>
                          </div>
                          <span className="text-neutral-400 font-semibold">{item.value} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Cases List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-semibold font-mono uppercase tracking-widest text-emerald-500">
                    Seus Processos ({cases.length})
                  </h2>
                </div>
                
                {cases.length === 0 ? (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 text-center space-y-3">
                    <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center mx-auto text-neutral-500">
                      <FolderGit className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-neutral-400">Nenhum processo vinculado à sua conta no momento.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cases.map(c => {
                      const progress = getCaseProgress(c);
                      return (
                        <div 
                          key={c.id} 
                          onClick={() => setSelectedCase(c)}
                          className="bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 rounded-xl p-5 cursor-pointer transition-colors group flex flex-col justify-between space-y-4"
                        >
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <h3 className="font-bold text-neutral-200 group-hover:text-emerald-400 transition-colors line-clamp-2">{c.title}</h3>
                              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border flex-shrink-0 ${
                                c.status === 'Concluído' ? 'bg-neutral-800 text-neutral-400 border-neutral-700' :
                                c.status === 'Renunciado' ? 'bg-red-950/30 text-red-400 border-red-900/50' :
                                c.status === 'Suspenso' ? 'bg-amber-950/30 text-amber-400 border-amber-900/50' :
                                'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {c.status}
                              </span>
                            </div>
                            <p className="text-xs text-neutral-400 font-mono">Nº: {c.caseNumber || 'Não informado'}</p>
                          </div>
                          
                          {/* Case Progress Bar */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400">
                              <span>Progresso das etapas</span>
                              <span className="font-bold text-neutral-200">{progress}%</span>
                            </div>
                            <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  c.status === 'Concluído' ? 'bg-blue-500' :
                                  progress >= 75 ? 'bg-emerald-500' :
                                  progress >= 40 ? 'bg-cyan-500' : 'bg-amber-500'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs text-neutral-500 border-t border-neutral-800 pt-3">
                            <div className="flex items-center space-x-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Adicionado {new Date(c.createdAt).toLocaleDateString()}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-emerald-500 transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : !selectedCase && activeNav === 'documents' ? (
            /* Secure Document Upload & Management Section */
            <div className="max-w-5xl mx-auto space-y-6">
              
              {/* Security Banner */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        Transmissão Segura de Documentos Jurídicos
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Art. 7º, II OAB
                        </span>
                      </h3>
                      <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl">
                        Os arquivos transmitidos por esta central são protegidos pelo sigilo profissional advocatício e criptografia. Seu advogado recebe a documentação imediatamente vinculada aos autos do seu processo.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap sm:flex-col gap-1.5 text-[10px] font-mono text-neutral-400 flex-shrink-0">
                    <span className="flex items-center gap-1.5"><Lock className="w-3 h-3 text-emerald-400" /> Criptografia de Ponta</span>
                    <span className="flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-emerald-400" /> Notificação ao Advogado</span>
                    <span className="flex items-center gap-1.5"><FileCheck2 className="w-3 h-3 text-emerald-400" /> Histórico com Auditoria</span>
                  </div>
                </div>
              </div>

              {/* Upload Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <div className="flex items-center space-x-2.5">
                    <UploadCloud className="w-5 h-5 text-emerald-400" />
                    <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-white">Novo Envio de Arquivo</h2>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono">Formatos: PDF, Imagens (JPG, PNG), DOCX</span>
                </div>

                <form onSubmit={(e) => handleUploadDocument(e)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Target Process */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400">
                        Processo Vinculado <span className="text-red-400">*</span>
                      </label>
                      {cases.length === 0 ? (
                        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                          Nenhum processo ativo disponível para vínculo.
                        </p>
                      ) : (
                        <select
                          value={selectedUploadCaseId}
                          onChange={(e) => setSelectedUploadCaseId(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          required
                        >
                          {cases.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title} (Nº: {c.caseNumber || 'N/A'}) - {c.status}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* Document Category */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400">
                        Categoria do Documento <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        {DOCUMENT_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? 'border-emerald-500 bg-emerald-500/10 scale-[0.99]' 
                        : selectedFile 
                          ? 'border-emerald-500/50 bg-neutral-950/80' 
                          : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950/40 hover:bg-neutral-950/80'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileChosen(e.target.files[0]);
                        }
                      }}
                    />

                    {selectedFile ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left p-2">
                        <div className="flex items-center space-x-3 truncate">
                          <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                            {getDocFileIcon(selectedFile.type, selectedFile.name)}
                          </div>
                          <div className="truncate">
                            <p className="text-sm font-semibold text-white truncate">{selectedFile.name}</p>
                            <p className="text-xs text-neutral-400 font-mono">
                              {formatBytes(selectedFile.size)} • {selectedFile.type || 'Documento'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-mono text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                        >
                          Trocar arquivo
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 py-3">
                        <div className="w-12 h-12 mx-auto rounded-full bg-neutral-800/80 text-emerald-400 flex items-center justify-center">
                          <FileUp className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            Arraste e solte seu arquivo aqui, ou <span className="text-emerald-400 underline">clique para selecionar</span>
                          </p>
                          <p className="text-xs text-neutral-500 font-mono">
                            Aceita PDF, fotos de certidões/documentos (JPG, PNG) e arquivos DOCX (até 10 MB)
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes for Lawyer */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono uppercase tracking-wider text-neutral-400">
                      Observações ou Contexto para a Equipe Jurídica (Opcional)
                    </label>
                    <input
                      type="text"
                      value={documentNotes}
                      onChange={(e) => setDocumentNotes(e.target.value)}
                      placeholder="Ex: Certidão atualizada emitida no cartório..."
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={uploading || !selectedFile || cases.length === 0}
                      className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-600/10"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Transmitindo com segurança...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Transmitir Documento ao Advogado</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Uploaded Documents List */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
                  <div>
                    <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-white">
                      Documentos Transmitidos ({documents.length})
                    </h2>
                    <p className="text-xs text-neutral-400">Acompanhe a recepção e o status dos arquivos protocolados.</p>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        placeholder="Buscar documento..."
                        className="bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-44"
                      />
                    </div>

                    <select
                      value={filterDocCaseId}
                      onChange={(e) => setFilterDocCaseId(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">Todos os Processos</option>
                      {cases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title.length > 20 ? c.title.substring(0, 18) + '...' : c.title}
                        </option>
                      ))}
                    </select>

                    <select
                      value={filterDocCategory}
                      onChange={(e) => setFilterDocCategory(e.target.value)}
                      className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="all">Todas as Categorias</option>
                      {DOCUMENT_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {documents.filter(d => {
                  const matchesCase = filterDocCaseId === 'all' || d.caseId === filterDocCaseId;
                  const matchesCat = filterDocCategory === 'all' || d.category === filterDocCategory;
                  const matchesQuery = !docSearchQuery.trim() || 
                    d.fileName.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                    (d.notes && d.notes.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
                    (d.caseTitle && d.caseTitle.toLowerCase().includes(docSearchQuery.toLowerCase()));
                  return matchesCase && matchesCat && matchesQuery;
                }).length === 0 ? (
                  <div className="text-center py-12 space-y-2">
                    <FileText className="w-10 h-10 text-neutral-600 mx-auto" />
                    <p className="text-xs text-neutral-400">Nenhum documento encontrado.</p>
                    <p className="text-[11px] text-neutral-500 font-mono">
                      {documents.length === 0
                        ? 'Utilize o formulário acima para transmitir seus arquivos diretamente ao seu advogado.'
                        : 'Nenhum documento corresponde aos filtros aplicados.'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-neutral-800/60">
                    {documents.filter(d => {
                      const matchesCase = filterDocCaseId === 'all' || d.caseId === filterDocCaseId;
                      const matchesCat = filterDocCategory === 'all' || d.category === filterDocCategory;
                      const matchesQuery = !docSearchQuery.trim() || 
                        d.fileName.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                        (d.notes && d.notes.toLowerCase().includes(docSearchQuery.toLowerCase())) ||
                        (d.caseTitle && d.caseTitle.toLowerCase().includes(docSearchQuery.toLowerCase()));
                      return matchesCase && matchesCat && matchesQuery;
                    }).map((docItem) => {
                      const isImage = docItem.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(docItem.fileName);
                      const isPdf = docItem.fileType?.includes('pdf') || docItem.fileName.toLowerCase().endsWith('.pdf');
                      return (
                        <div key={docItem.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:bg-neutral-850/40 px-3 -mx-3 rounded-xl transition-colors">
                          <div className="flex items-start space-x-3.5 min-w-0">
                            <div className="p-2.5 bg-neutral-950 rounded-xl border border-neutral-800 flex-shrink-0 mt-0.5">
                              {getDocFileIcon(docItem.fileType, docItem.fileName)}
                            </div>
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-white truncate max-w-sm">
                                  {docItem.fileName}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                                  {docItem.category}
                                </span>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                  docItem.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                  docItem.status === 'Em Análise' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                  docItem.status === 'Recusado' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                  'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                }`}>
                                  {docItem.status === 'Aprovado' ? 'Aprovado pelo Advogado' :
                                   docItem.status === 'Em Análise' ? 'Em Análise' :
                                   docItem.status === 'Recusado' ? 'Revisão Solicitada' : 'Enviado'}
                                </span>
                              </div>

                              <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-2 flex-wrap">
                                <span>Processo: <strong className="text-neutral-300 font-normal">{docItem.caseTitle}</strong></span>
                                <span>•</span>
                                <span>{formatBytes(docItem.fileSize)}</span>
                                <span>•</span>
                                <span>Enviado em {new Date(docItem.uploadedAt).toLocaleDateString()} às {new Date(docItem.uploadedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>

                              {docItem.notes && (
                                <p className="text-[11px] text-neutral-400 bg-neutral-950/70 border border-neutral-800/80 rounded-md px-2.5 py-1 mt-1 max-w-xl">
                                  <span className="text-neutral-500 font-mono">Obs:</span> {docItem.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-1.5 self-end sm:self-center flex-shrink-0">
                            {(isImage || isPdf) && docItem.fileData && (
                              <button
                                onClick={() => setPreviewDoc(docItem)}
                                className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                                title="Visualizar documento"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadDocument(docItem)}
                              className="p-2 text-neutral-400 hover:text-emerald-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                              title="Baixar documento"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            {docItem.status === 'Enviado' && (
                              <button
                                onClick={() => handleDeleteDocument(docItem)}
                                className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                                title="Excluir arquivo enviado"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Process Info & Progress */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Progress Details Card */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase font-mono tracking-widest text-emerald-400 border-b border-neutral-800 pb-2 flex items-center justify-between">
                    <span>Evolução do Processo</span>
                    <span className="text-white font-mono">{getCaseProgress(selectedCase)}%</span>
                  </h3>
                  
                  <div className="space-y-2">
                    <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedCase.status === 'Concluído' ? 'bg-blue-500' :
                          getCaseProgress(selectedCase) >= 75 ? 'bg-emerald-500' :
                          getCaseProgress(selectedCase) >= 40 ? 'bg-cyan-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${getCaseProgress(selectedCase)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Situação: <span className="font-semibold text-neutral-200">{selectedCase.status}</span>
                    </p>
                  </div>

                  {/* Tasks / Etapas */}
                  {selectedCase.tasks && selectedCase.tasks.length > 0 && (
                    <div className="pt-2 border-t border-neutral-800 space-y-2">
                      <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider font-mono block">
                        Etapas e Tarefas
                      </span>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {selectedCase.tasks.map((task) => (
                          <div key={task.id} className="flex items-start space-x-2 text-xs">
                            <CheckSquare className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${task.completed ? 'text-emerald-500' : 'text-neutral-600'}`} />
                            <span className={task.completed ? 'text-neutral-400 line-through' : 'text-neutral-200'}>
                              {task.text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Case General Info */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase font-mono tracking-widest text-neutral-400 border-b border-neutral-800 pb-2">Detalhes</h3>
                  
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="block text-neutral-500 mb-0.5">Órgão Julgador / Vara</span>
                      <span className="text-neutral-200 font-medium">{selectedCase.orgaoJulgador || selectedCase.court || 'Não informado'}</span>
                    </div>
                    {selectedCase.tribunal && (
                      <div>
                        <span className="block text-neutral-500 mb-0.5">Tribunal</span>
                        <span className="text-neutral-200 font-medium">{selectedCase.tribunal}</span>
                      </div>
                    )}
                    <div>
                      <span className="block text-neutral-500 mb-0.5">Área do Direito</span>
                      <span className="text-neutral-200 font-medium">{selectedCase.area || 'Não informada'}</span>
                    </div>
                    <div>
                      <span className="block text-neutral-500 mb-0.5">Fase Atual / Situação</span>
                      <span className="text-neutral-200 font-medium">{selectedCase.status || 'Inicial'}</span>
                    </div>
                    {selectedCase.processLink && (
                      <div>
                        <span className="block text-neutral-500 mb-1">Autos do Processo</span>
                        <a
                          href={selectedCase.processLink.startsWith('http') ? selectedCase.processLink : `https://${selectedCase.processLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-medium transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Consultar Autos Eletrônicos</span>
                        </a>
                      </div>
                    )}
                    <div>
                      <span className="block text-neutral-500 mb-0.5">Descrição / Notas</span>
                      <p className="text-neutral-300 leading-relaxed">{selectedCase.notes || 'Nenhuma descrição fornecida.'}</p>
                    </div>

                    <div className="pt-2 border-t border-neutral-800">
                      <button
                        onClick={() => handleExportClientCasePdf(selectedCase)}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm"
                        title="Baixar Relatório Oficial de Acompanhamento Processual em PDF"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Baixar Relatório Oficial (PDF)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Tabbed Chat & Documents */}
              <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl flex flex-col h-[calc(100vh-140px)]">
                {/* Tab Switcher Header */}
                <div className="p-2.5 border-b border-neutral-800 bg-neutral-950/60 rounded-t-xl flex items-center justify-between">
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => setCaseTab('messages')}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        caseTab === 'messages'
                          ? 'bg-neutral-800 text-white border border-neutral-700'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Mensagens</span>
                    </button>
                    <button
                      onClick={() => setCaseTab('documents')}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        caseTab === 'documents'
                          ? 'bg-neutral-800 text-white border border-neutral-700'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <FileUp className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Documentos do Processo</span>
                      {documents.filter(d => d.caseId === selectedCase.id).length > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-mono rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {documents.filter(d => d.caseId === selectedCase.id).length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {caseTab === 'messages' ? (
                  <>
                    {/* Messages List */}
                    <div className="flex-grow p-4 overflow-y-auto space-y-4">
                      {loadingMessages ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="text-center py-10 text-xs text-neutral-500 font-mono">
                          Nenhuma mensagem enviada ainda.<br/>Use este canal para enviar dúvidas ou orientações.
                        </div>
                      ) : (
                        messages.map(msg => {
                          const isMe = msg.senderId === currentUser.uid;
                          return (
                            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                                isMe 
                                  ? 'bg-emerald-600 text-white rounded-br-sm' 
                                  : 'bg-neutral-800 text-neutral-200 rounded-bl-sm border border-neutral-700'
                              }`}>
                                {msg.text}
                              </div>
                              <span className="text-[9px] text-neutral-500 mt-1 px-1">
                                {isMe ? 'Você' : 'Escritório'} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="p-4 border-t border-neutral-800 bg-neutral-950/50 rounded-b-xl">
                      <form onSubmit={handleSendMessage} className="flex space-x-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Digite sua mensagem ao advogado..."
                          className="flex-grow bg-neutral-900 border border-neutral-700 rounded-lg px-4 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <button
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </form>
                    </div>
                  </>
                ) : (
                  /* Documents Tab in Case View */
                  <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {/* Quick upload box for this specific case */}
                    <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase font-mono tracking-wider text-emerald-400">
                          Transmitir Documento para Este Processo
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">Sigilo OAB assegurado</span>
                      </div>

                      <form onSubmit={(e) => handleUploadDocument(e, selectedCase.id)} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">Categoria</label>
                            <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {DOCUMENT_CATEGORIES.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-mono uppercase text-neutral-400 mb-1">Observações (opcional)</label>
                            <input
                              type="text"
                              value={documentNotes}
                              onChange={(e) => setDocumentNotes(e.target.value)}
                              placeholder="Breve nota..."
                              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-3">
                          <input
                            ref={caseFileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleFileChosen(e.target.files[0]);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => caseFileInputRef.current?.click()}
                            className="w-full sm:w-auto flex-grow flex items-center justify-center space-x-2 border border-dashed border-neutral-700 hover:border-emerald-500/50 bg-neutral-900/50 hover:bg-neutral-900 rounded-lg py-2 px-3 text-xs text-neutral-300 transition-colors cursor-pointer truncate"
                          >
                            <FileUp className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span className="truncate">
                              {selectedFile ? selectedFile.name : 'Selecionar arquivo (PDF, Imagem, DOCX)'}
                            </span>
                          </button>

                          <button
                            type="submit"
                            disabled={uploading || !selectedFile}
                            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center space-x-1.5 flex-shrink-0"
                          >
                            {uploading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Lock className="w-3.5 h-3.5" />
                            )}
                            <span>Enviar</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Case documents list */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase font-mono tracking-wider text-neutral-400">
                        Documentos Protocolados Neste Processo
                      </h4>

                      {documents.filter(d => d.caseId === selectedCase.id).length === 0 ? (
                        <div className="text-center py-8 text-xs text-neutral-500 font-mono bg-neutral-950/40 rounded-xl border border-neutral-850">
                          Nenhum documento protocolado ainda neste processo.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {documents.filter(d => d.caseId === selectedCase.id).map((docItem) => (
                            <div key={docItem.id} className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3 flex items-center justify-between gap-3">
                              <div className="flex items-center space-x-3 min-w-0">
                                {getDocFileIcon(docItem.fileType, docItem.fileName)}
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-white truncate">{docItem.fileName}</p>
                                  <p className="text-[10px] text-neutral-400 font-mono">
                                    {docItem.category} • {formatBytes(docItem.fileSize)} • {new Date(docItem.uploadedAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                {docItem.fileData && (
                                  <button
                                    onClick={() => setPreviewDoc(docItem)}
                                    className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800"
                                    title="Visualizar"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDownloadDocument(docItem)}
                                  className="p-1.5 text-neutral-400 hover:text-emerald-400 rounded-lg hover:bg-neutral-800"
                                  title="Baixar"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                {docItem.status === 'Enviado' && (
                                  <button
                                    onClick={() => handleDeleteDocument(docItem)}
                                    className="p-1.5 text-neutral-400 hover:text-red-400 rounded-lg hover:bg-neutral-800"
                                    title="Excluir"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
              <div className="flex items-center space-x-3 truncate">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                  {getDocFileIcon(previewDoc.fileType, previewDoc.fileName)}
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-white truncate max-w-md">{previewDoc.fileName}</h3>
                  <p className="text-[11px] text-neutral-400 font-mono">
                    {previewDoc.category} • {formatBytes(previewDoc.fileSize)} • Processo: {previewDoc.caseTitle}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                <button
                  onClick={() => handleDownloadDocument(previewDoc)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </button>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-grow p-4 overflow-auto flex items-center justify-center bg-black/60 min-h-[400px]">
              {previewDoc.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(previewDoc.fileName) ? (
                <img
                  src={previewDoc.fileData}
                  alt={previewDoc.fileName}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              ) : previewDoc.fileType?.includes('pdf') || previewDoc.fileName.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.fileData}
                  title={previewDoc.fileName}
                  className="w-full h-[70vh] rounded-lg border border-neutral-800 bg-white"
                />
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-12 h-12 text-neutral-500 mx-auto" />
                  <p className="text-sm text-neutral-300">Este formato não suporta pré-visualização direta no navegador.</p>
                  <button
                    onClick={() => handleDownloadDocument(previewDoc)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar para Visualizar</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
