export interface Client {
  id: string;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  status?: 'ativo' | 'inativo';
  deleted?: boolean;
  deletedAt?: string;
  userId?: string;
  uid?: string; // Firebase Auth UID
  role?: 'client' | 'admin';
  createdAt: string;
}

export interface CaseMessage {
  id: string;
  caseId: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'client';
  text: string;
  createdAt: string;
}

export interface CaseDocument {
  id: string;
  caseId: string;
  caseTitle?: string;
  clientId: string;
  clientName: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData?: string; // Base64 data URL for preview/download
  category: string;
  notes?: string;
  status: 'Enviado' | 'Em Análise' | 'Aprovado' | 'Recusado';
  uploadedAt: string;
  uploadedBy: 'client' | 'lawyer';
  uploadedByUid?: string;
  feedback?: string;
}

export interface CaseTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface CaseTimeline {
  id: string;
  date: string;
  message: string;
}

export interface Case {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  caseNumber: string;
  status: 'Em andamento' | 'Suspenso' | 'Concluído' | 'Renunciado';
  area: 'Inventários e Partilhas' | 'Direito Imobiliário' | 'Direito de Família' | 'Direito Civil e Contratos' | 'Registro de Marcas' | 'Outros' | string;
  court: string;
  timeline: CaseTimeline[];
  notes: string;
  tasks: CaseTask[];
  createdAt: string;
  value?: number;
  deleted?: boolean;
  deletedAt?: string;
  userId?: string;
}

export interface SubEvent {
  id: string;
  title: string;
  completed: boolean;
  important?: boolean;
  position?: number;
  subEvents?: SubEvent[];
}

export interface EventLog {
  id: string;
  text: string;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  description: string;
  type: 'audiência' | 'reunião' | 'prazo' | 'lembrete' | 'tarefa' | 'financeiro' | 'outro';
  status: 'Pendente' | 'Confirmado' | 'Cancelado' | 'Concluído';
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientId?: string;
  priority?: 'Fatal' | 'Urgente' | 'Alta' | 'Média' | 'Baixa';
  position?: number;
  subEvents?: SubEvent[];
  logs?: EventLog[];
  caseId?: string;
  caseTitle?: string;
  postponeCount?: number;
  impreterivel?: boolean;
  createdAt: string;
  deleted?: boolean;
  deletedAt?: string;
  userId?: string;
  executionStatus?: 'a_fazer' | 'iniciado' | 'concluido';
  isPublicRequest?: boolean;
}

export interface Transaction {
  id: string;
  type: 'receita' | 'despesa';
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  category: string;
  caseId?: string;
  caseTitle?: string;
  createdAt: string;
  deleted?: boolean;
  deletedAt?: string;
  userId?: string;
}

export interface Heir {
  id: string;
  name: string;
  relationship: string;
  percentage: number; // 0 to 100
  shareAmount?: number;
}

export interface Asset {
  id: string;
  type: string;
  description: string;
  value: number;
  exemptITCMD?: boolean;
  heirId?: string;
}

export interface Debt {
  id: string;
  description: string;
  value: number;
  heirId?: string;
}

export interface InventoryDocument {
  id: string;
  title: string;
  status: 'Pendente' | 'Entregue' | 'Em Análise' | 'Rejeitado' | 'Não se aplica';
  relatedToType: 'part' | 'asset' | 'general';
  relatedToId?: string; // id of Heir or Asset
  relatedToName?: string; // cached name/desc of related party or asset
  notes?: string;
  updatedAt?: string;
}

export interface InventoryCase {
  id: string;
  title: string;
  clientName: string;
  clientId: string;
  heirs: Heir[];
  assets: Asset[];
  debts: Debt[];
  documents?: InventoryDocument[];
  itcmdRate: number; // e.g. 4 (for 4%)
  attorneyFeeRate: number; // e.g. 6 (for 6%)
  courtFeeRate: number; // e.g. 1 (for 1%)
  attorneyFeeType?: 'percentage' | 'fixed';
  attorneyFeeValue?: number;
  courtFeeType?: 'percentage' | 'fixed';
  courtFeeValue?: number;
  itcmdHeirId?: string;
  attorneyFeeHeirId?: string;
  courtFeeHeirId?: string;
  notes: string;
  createdAt: string;
  deleted?: boolean;
  deletedAt?: string;
  userId?: string;
}

export interface Article {
  id: string;
  title: string;
  content: string; // markdown content
  excerpt?: string;
  snippet?: string;
  category: string;
  author: string;
  date: string; // YYYY-MM-DD
  readTime: string;
  imageUrl?: string;
  image?: string;
  createdAt: string;
  deleted?: boolean;
  deletedAt?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string; // e.g. 'Cliente - Causa Cível'
  text: string;
  rating: number; // 1 to 5
  approved: boolean;
  date: string;
  createdAt: string;
}

export interface ContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'Pendente' | 'Respondido' | 'Arquivado';
  date: string;
  createdAt: string;
}

export interface ErpUser {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: 'master' | 'collaborator';
  createdAt: string;
  deleted?: boolean;
  deletedAt?: string;
}
