import { Case, Client } from '../types';

/**
 * Escapes a cell value for CSV (RFC 4180 compliant)
 * Uses double quotes around values and escapes inner quotes as ""
 */
const escapeCsvCell = (value: any): string => {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  // Replace internal quotes with double quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

/**
 * Formats a currency value as standard number string for spreadsheets (e.g. 15000.00 or 15.000,00)
 */
const formatCsvCurrency = (val?: number): string => {
  if (val === undefined || val === null || isNaN(val)) {
    return '0,00';
  }
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Formats date into DD/MM/YYYY
 */
const formatCsvDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // fallback
  }
  return dateStr;
};

export interface CasesCsvOptions {
  delimiter?: string;
  clients?: Client[];
  includeNotes?: boolean;
}

/**
 * Generates CSV content for a list of legal cases.
 * Default delimiter is semicolon (;) for native compatibility with Microsoft Excel in Portuguese/BR.
 */
export const generateCasesCsv = (
  casesList: Case[],
  options: CasesCsvOptions = {}
): string => {
  const delimiter = options.delimiter || ';';
  const clients = options.clients || [];

  // Define headers for the CSV report
  const headers = [
    'ID do Processo',
    'Número do Processo (CNJ)',
    'Título da Ação',
    'Cliente',
    'CPF/CNPJ do Cliente',
    'E-mail do Cliente',
    'Telefone do Cliente',
    'Endereço do Cliente',
    'Área de Atuação',
    'Situação / Status',
    'Vara / Comarca / Tribunal',
    'Valor da Causa (R$)',
    'Data de Cadastro',
    'Total de Metas / Tarefas',
    'Tarefas Concluídas',
    'Tarefas Pendentes',
    'Progresso das Tarefas (%)',
    'Total de Andamentos na Timeline',
    'Último Andamento (Data)',
    'Último Andamento (Descrição)',
    'Observações / Pareceres Internos'
  ];

  const rows: string[] = [];
  rows.push(headers.map(escapeCsvCell).join(delimiter));

  casesList.forEach((cs) => {
    // Match linked client if available
    const client = clients.find((c) => c.id === cs.clientId);

    // Compute task counts
    const totalTasks = cs.tasks?.length || 0;
    const completedTasks = cs.tasks?.filter((t) => t.completed).length || 0;
    const pendingTasks = totalTasks - completedTasks;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Timeline information
    const totalTimeline = cs.timeline?.length || 0;
    const lastTimeline = cs.timeline && cs.timeline.length > 0 ? cs.timeline[cs.timeline.length - 1] : null;

    const rowData = [
      cs.id,
      cs.caseNumber || 'S/N',
      cs.title || 'Processo sem título',
      cs.clientName || client?.name || 'Cliente Avulso',
      client?.cpf || 'Não informado',
      client?.email || 'Não informado',
      client?.phone || 'Não informado',
      client?.address || 'Não informado',
      cs.area || 'Outros',
      cs.status || 'Em andamento',
      cs.court || 'Não especificado',
      formatCsvCurrency(cs.value),
      formatCsvDate(cs.createdAt),
      String(totalTasks),
      String(completedTasks),
      String(pendingTasks),
      `${progressPercent}%`,
      String(totalTimeline),
      lastTimeline ? formatCsvDate(lastTimeline.date) : 'Sem andamento',
      lastTimeline ? lastTimeline.message : 'Nenhum andamento registrado',
      cs.notes ? cs.notes.replace(/\r?\n/g, ' ') : ''
    ];

    rows.push(rowData.map(escapeCsvCell).join(delimiter));
  });

  return rows.join('\r\n');
};

/**
 * Generates an in-depth CSV report for a single case, including its complete timeline and task lists.
 */
export const generateSingleCaseDetailedCsv = (
  caseItem: Case,
  client?: Client | null,
  delimiter: string = ';'
): string => {
  const lines: string[] = [];

  // Section 1: General Info Header
  lines.push(escapeCsvCell('=== RELATÓRIO DETALHADO DO PROCESSO ==='));
  lines.push('');
  lines.push(['Campo', 'Valor'].map(escapeCsvCell).join(delimiter));
  lines.push([escapeCsvCell('Número do Processo (CNJ)'), escapeCsvCell(caseItem.caseNumber || 'S/N')].join(delimiter));
  lines.push([escapeCsvCell('Título da Ação'), escapeCsvCell(caseItem.title)].join(delimiter));
  lines.push([escapeCsvCell('Cliente'), escapeCsvCell(caseItem.clientName || client?.name || 'Não informado')].join(delimiter));
  lines.push([escapeCsvCell('CPF/CNPJ do Cliente'), escapeCsvCell(client?.cpf || 'Não informado')].join(delimiter));
  lines.push([escapeCsvCell('E-mail'), escapeCsvCell(client?.email || 'Não informado')].join(delimiter));
  lines.push([escapeCsvCell('Telefone'), escapeCsvCell(client?.phone || 'Não informado')].join(delimiter));
  lines.push([escapeCsvCell('Área'), escapeCsvCell(caseItem.area)].join(delimiter));
  lines.push([escapeCsvCell('Situação / Status'), escapeCsvCell(caseItem.status)].join(delimiter));
  lines.push([escapeCsvCell('Juízo / Vara / Tribunal'), escapeCsvCell(caseItem.court || 'Não especificado')].join(delimiter));
  lines.push([escapeCsvCell('Valor da Causa (R$)'), escapeCsvCell(formatCsvCurrency(caseItem.value))].join(delimiter));
  lines.push([escapeCsvCell('Data de Cadastro'), escapeCsvCell(formatCsvDate(caseItem.createdAt))].join(delimiter));
  lines.push([escapeCsvCell('Anotações / Pareceres'), escapeCsvCell(caseItem.notes || 'Nenhuma anotação')].join(delimiter));
  lines.push('');

  // Section 2: Timeline Milestones
  lines.push(escapeCsvCell('=== HISTÓRICO DE ANDAMENTOS E MOVIMENTAÇÕES ==='));
  lines.push(['#', 'Data do Andamento', 'Descrição / Despacho / Publicação'].map(escapeCsvCell).join(delimiter));

  if (caseItem.timeline && caseItem.timeline.length > 0) {
    caseItem.timeline.forEach((item, index) => {
      lines.push([
        String(index + 1),
        formatCsvDate(item.date),
        item.message
      ].map(escapeCsvCell).join(delimiter));
    });
  } else {
    lines.push([escapeCsvCell('1'), escapeCsvCell('-'), escapeCsvCell('Nenhum andamento registrado na timeline')].join(delimiter));
  }
  lines.push('');

  // Section 3: Tasks and Goals
  lines.push(escapeCsvCell('=== TAREFAS E METAS OPERACIONAIS ==='));
  lines.push(['#', 'Situação', 'Incumbência / Tarefa'].map(escapeCsvCell).join(delimiter));

  if (caseItem.tasks && caseItem.tasks.length > 0) {
    caseItem.tasks.forEach((task, index) => {
      lines.push([
        String(index + 1),
        task.completed ? 'Concluída' : 'Pendente',
        task.text
      ].map(escapeCsvCell).join(delimiter));
    });
  } else {
    lines.push([escapeCsvCell('1'), escapeCsvCell('-'), escapeCsvCell('Nenhuma tarefa cadastrada para este processo')].join(delimiter));
  }

  return lines.join('\r\n');
};

/**
 * Triggers a browser download of the generated CSV content with UTF-8 BOM encoding.
 * The UTF-8 BOM (\uFEFF) ensures proper accented character rendering in Microsoft Excel,
 * Google Sheets, LibreOffice Calc, and Apple Numbers.
 */
export const downloadCsvFile = (csvContent: string, fileName: string): void => {
  // UTF-8 BOM prefix
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.setAttribute('download', fileName);
  document.body.appendChild(anchor);
  anchor.click();

  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
