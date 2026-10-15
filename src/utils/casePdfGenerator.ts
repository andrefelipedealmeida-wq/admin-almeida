import { jsPDF } from 'jspdf';
import { Case, Client } from '../types';

/**
 * Formats date from ISO or YYYY-MM-DD to DD/MM/YYYY
 */
export const formatPtDate = (dateStr?: string): string => {
  if (!dateStr) return 'Não informado';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  } catch {
    // fallback
  }
  return dateStr;
};

/**
 * Formats currency value in BRL
 */
export const formatCurrency = (val?: number): string => {
  if (val === undefined || val === null) return 'Não informado';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

interface SingleCasePdfOptions {
  includeNotes?: boolean;
  includeTasks?: boolean;
  includeTimeline?: boolean;
  client?: Client | null;
}

/**
 * Generates an official, high-fidelity PDF report for a single legal case.
 */
export const generateSingleCaseReportPdf = (
  caseItem: Case,
  options: SingleCasePdfOptions = {}
): jsPDF => {
  const {
    includeNotes = true,
    includeTasks = true,
    includeTimeline = true,
    client = null
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 16;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 22) {
      doc.addPage();
      currentY = 18;
      drawRunningHeader();
    }
  };

  const drawRunningHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ALMEIDA ADVOCACIA & CONSULTORIA JURÍDICA • RELATÓRIO DE PROCESSO', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proc.: ${caseItem.caseNumber || 'S/N'}`, pageWidth - margin, currentY, { align: 'right' });
    
    currentY += 2.5;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;
  };

  // --- Main Header (Page 1) ---
  // Top decorative bar
  doc.setFillColor(5, 150, 105); // emerald-600
  doc.rect(margin, currentY, contentWidth, 3, 'F');
  currentY += 7;

  // Law firm title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('ALMEIDA ADVOCACIA', margin, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.text(`Emissão: ${dateFormatted} às ${timeFormatted}`, pageWidth - margin, currentY - 2, { align: 'right' });
  doc.text('Dr. André Felipe de Almeida • OAB/SP', pageWidth - margin, currentY + 2, { align: 'right' });

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text('RELATÓRIO DE ACOMPANHAMENTO PROCESSUAL', margin, currentY);

  currentY += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 6;

  // --- Process Identification Card ---
  const hasLink = Boolean(caseItem.processLink);
  const cardY = currentY;
  const cardHeight = (client ? 48 : 42) + (hasLink ? 6.5 : 0);
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, cardY, contentWidth, cardHeight, 2, 2, 'FD');

  // Left vertical status accent
  let statusColor: [number, number, number] = [16, 185, 129]; // emerald
  if (caseItem.status === 'Suspenso') statusColor = [245, 158, 11]; // amber
  else if (caseItem.status === 'Concluído') statusColor = [59, 130, 246]; // blue
  else if (caseItem.status === 'Renunciado') statusColor = [107, 114, 128]; // gray

  doc.setFillColor(...statusColor);
  doc.roundedRect(margin, cardY, 3, cardHeight, 1, 1, 'F');

  let innerY = cardY + 6;
  const innerLeft = margin + 6;

  // Row 1: Case Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const truncatedTitle = doc.splitTextToSize(caseItem.title, contentWidth - 45);
  doc.text(truncatedTitle[0] || caseItem.title, innerLeft, innerY);

  // Status Badge on the right
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - margin - 32, innerY - 4.5, 28, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(caseItem.status.toUpperCase(), pageWidth - margin - 18, innerY - 0.5, { align: 'center' });

  innerY += 7;

  // Row 2: Two Columns of details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Nº Processo Unificado:', innerLeft, innerY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(caseItem.caseNumber || 'Pendente / Não cadastrado', innerLeft + 35, innerY);

  const col2X = innerLeft + 90;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Área de Atuação:', col2X, innerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(caseItem.area || 'Geral', col2X + 25, innerY);

  innerY += 6;

  // Row 3: Tribunal & Órgão Julgador
  const courtText = caseItem.tribunal && caseItem.orgaoJulgador 
    ? `${caseItem.tribunal} • ${caseItem.orgaoJulgador}`
    : (caseItem.orgaoJulgador || caseItem.tribunal || caseItem.court || 'Não especificado');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Tribunal / Vara:', innerLeft, innerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(courtText, innerLeft + 35, innerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Data de Abertura:', col2X, innerY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPtDate(caseItem.createdAt), col2X + 25, innerY);

  innerY += 6;

  // Row 4: Client info & Value
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Cliente Representado:', innerLeft, innerY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(5, 150, 105);
  doc.text(caseItem.clientName || 'Cliente Geral / Avulso', innerLeft + 35, innerY);

  if (caseItem.value) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Valor da Causa:', col2X, innerY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCurrency(caseItem.value), col2X + 25, innerY);
  }

  // Row 5: Process Link if present
  if (hasLink && caseItem.processLink) {
    innerY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Autos Eletrônicos:', innerLeft, innerY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    const linkStr = caseItem.processLink.length > 70 ? caseItem.processLink.substring(0, 67) + '...' : caseItem.processLink;
    doc.text(linkStr, innerLeft + 35, innerY);
  }

  // Extra line for Client Contacts if available
  if (client) {
    innerY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const clientDetails = [
      client.cpf ? `CPF: ${client.cpf}` : '',
      client.phone ? `Tel: ${client.phone}` : '',
      client.email ? `Email: ${client.email}` : ''
    ].filter(Boolean).join('  •  ');
    if (clientDetails) {
      doc.text(clientDetails, innerLeft, innerY);
    }
  }

  currentY = cardY + cardHeight + 8;

  // --- Operational Tasks / Metas Section ---
  if (includeTasks && caseItem.tasks && caseItem.tasks.length > 0) {
    checkPageBreak(30);

    const completedTasks = caseItem.tasks.filter(t => t.completed).length;
    const totalTasks = caseItem.tasks.length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Section Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('INCUMBÊNCIAS OPERACIONAIS & TAREFAS PROCESSUAIS', margin, currentY);

    // Progress percentage
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`${completedTasks} de ${totalTasks} concluídas (${progressPercent}%)`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 3;

    // Progress bar vector
    doc.setFillColor(226, 232, 240); // track
    doc.roundedRect(margin, currentY, contentWidth, 2.5, 1, 1, 'F');
    if (progressPercent > 0) {
      doc.setFillColor(16, 185, 129); // fill
      const fillW = Math.max(3, (contentWidth * progressPercent) / 100);
      doc.roundedRect(margin, currentY, fillW, 2.5, 1, 1, 'F');
    }

    currentY += 6;

    // Task items
    caseItem.tasks.forEach(task => {
      checkPageBreak(8);
      
      const isDone = task.completed;
      
      // Checkbox / marker
      if (isDone) {
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(margin, currentY - 2.5, 3.5, 3.5, 0.8, 0.8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.text('✓', margin + 1.75, currentY - 0.2, { align: 'center' });
      } else {
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, currentY - 2.5, 3.5, 3.5, 0.8, 0.8, 'D');
      }

      // Task text
      doc.setFont('helvetica', isDone ? 'normal' : 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(isDone ? 100 : 30, isDone ? 116 : 41, isDone ? 139 : 59);
      
      const taskLines = doc.splitTextToSize(task.text, contentWidth - 7);
      doc.text(taskLines, margin + 6, currentY);
      currentY += Math.max(5.5, taskLines.length * 4);
    });

    currentY += 4;
  }

  // --- Timeline / Movimentações Processuais Section ---
  if (includeTimeline && caseItem.timeline && caseItem.timeline.length > 0) {
    checkPageBreak(35);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('HISTÓRICO DE ANDAMENTOS E MOVIMENTAÇÕES', margin, currentY);

    currentY += 3;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 5;

    caseItem.timeline.forEach((node, index) => {
      const formattedDate = formatPtDate(node.date);
      const msgLines = doc.splitTextToSize(node.message, contentWidth - 28);
      const estimatedItemHeight = Math.max(12, msgLines.length * 4 + 6);

      checkPageBreak(estimatedItemHeight);

      // Date box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, currentY - 3, 22, 5.5, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(formattedDate, margin + 11, currentY + 0.6, { align: 'center' });

      // Bullet and vertical connector
      doc.setFillColor(5, 150, 105);
      doc.circle(margin + 26, currentY - 0.5, 1.2, 'F');

      if (index < caseItem.timeline.length - 1) {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(margin + 26, currentY + 1, margin + 26, currentY + estimatedItemHeight - 2);
      }

      // Message text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(msgLines, margin + 30, currentY);

      currentY += estimatedItemHeight;
    });

    currentY += 3;
  }

  // --- Internal Notes Section ---
  if (includeNotes && caseItem.notes && caseItem.notes.trim()) {
    checkPageBreak(30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('OBSERVAÇÕES E PARECERES JURÍDICOS', margin, currentY);

    currentY += 4;
    const notesBoxY = currentY;
    const noteLines = doc.splitTextToSize(caseItem.notes, contentWidth - 8);
    const notesBoxH = Math.max(16, noteLines.length * 4.2 + 8);

    checkPageBreak(notesBoxH);

    doc.setFillColor(254, 252, 232); // amber-50
    doc.setDrawColor(254, 240, 138); // amber-200
    doc.roundedRect(margin, currentY, contentWidth, notesBoxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 63, 18); // amber-900
    doc.text(noteLines, margin + 4, currentY + 5.5);

    currentY += notesBoxH + 6;
  }

  // --- Authenticity & Signature Seal ---
  checkPageBreak(25);
  currentY += 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin + 40, currentY + 10, pageWidth - margin - 40, currentY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Dr. André Felipe de Almeida', pageWidth / 2, currentY + 14, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Advogado • OAB/SP • Almeida Advocacia', pageWidth / 2, currentY + 18, { align: 'center' });

  // --- Footers on all pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Top boundary line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    
    const disclaimer = 'Documento confidencial gerado pelo Sistema Jurídico Almeida Advocacia. Sigilo profissional resguardado pelo Art. 7º, II da Lei 8.906/94.';
    doc.text(disclaimer, margin, pageHeight - 9.5);

    const pageNumStr = `Página ${i} de ${totalPages}`;
    doc.text(pageNumStr, pageWidth - margin, pageHeight - 9.5, { align: 'right' });
  }

  return doc;
};

interface CasesSummaryOptions {
  title?: string;
  filterLabel?: string;
  statusFilter?: string;
  areaFilter?: string;
}

/**
 * Generates a comprehensive portfolio overview PDF summarizing multiple cases.
 */
export const generateCasesSummaryPdf = (
  casesList: Case[],
  options: CasesSummaryOptions = {}
): jsPDF => {
  const {
    title = 'RELATÓRIO GERAL DA CARTEIRA DE PROCESSOS',
    filterLabel = 'Todos os processos ativos',
    statusFilter = 'Todos',
    areaFilter = 'Todos'
  } = options;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 16;

  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - 18) {
      doc.addPage();
      currentY = 16;
      drawRunningHeader();
    }
  };

  const drawRunningHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('ALMEIDA ADVOCACIA • RELATÓRIO CONSOLIDADO DE PROCESSOS', margin, currentY);
    doc.setFont('helvetica', 'normal');
    doc.text(`${casesList.length} processos listados`, pageWidth - margin, currentY, { align: 'right' });
    
    currentY += 2;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 6;
  };

  // --- Header ---
  doc.setFillColor(5, 150, 105);
  doc.rect(margin, currentY, contentWidth, 2.5, 'F');
  currentY += 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('ALMEIDA ADVOCACIA & CONSULTORIA JURÍDICA', margin, currentY);

  const now = new Date();
  const dateFormatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Emissão: ${dateFormatted} às ${timeFormatted} • Dr. André Felipe de Almeida (OAB/SP)`, pageWidth - margin, currentY, { align: 'right' });

  currentY += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(5, 150, 105);
  doc.text(title.toUpperCase(), margin, currentY);

  currentY += 4;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 5;

  // --- Metrics Summary Strip ---
  const activeCount = casesList.filter(c => c.status === 'Em andamento').length;
  const suspendedCount = casesList.filter(c => c.status === 'Suspenso').length;
  const completedCount = casesList.filter(c => c.status === 'Concluído').length;
  const otherCount = casesList.length - activeCount - suspendedCount - completedCount;

  const statBoxWidth = (contentWidth - 9) / 4;
  const statBoxHeight = 13;

  const stats = [
    { label: 'Total de Processos', val: casesList.length.toString(), color: [15, 23, 42] as [number, number, number] },
    { label: 'Em Andamento', val: activeCount.toString(), color: [5, 150, 105] as [number, number, number] },
    { label: 'Suspensos', val: suspendedCount.toString(), color: [217, 119, 6] as [number, number, number] },
    { label: 'Concluídos', val: completedCount.toString(), color: [59, 130, 246] as [number, number, number] }
  ];

  stats.forEach((st, idx) => {
    const boxX = margin + idx * (statBoxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(boxX, currentY, statBoxWidth, statBoxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(st.label.toUpperCase(), boxX + 4, currentY + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...st.color);
    doc.text(st.val, boxX + 4, currentY + 10.5);
  });

  currentY += statBoxHeight + 5;

  // Filter info line
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Filtros aplicados: Situação = ${statusFilter}  |  Área = ${areaFilter}  |  Critério: ${filterLabel}`, margin, currentY);
  currentY += 4;

  // --- Cases Table Header ---
  const colWidths = {
    title: 68,
    caseNum: 48,
    client: 48,
    area: 44,
    status: 25,
    tasks: 18,
    date: 18
  };

  const drawTableHeader = () => {
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, currentY, contentWidth, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let x = margin + 3;
    doc.text('Título do Processo / Ação', x, currentY + 4.8);
    x += colWidths.title;
    doc.text('Nº Processo Unificado', x, currentY + 4.8);
    x += colWidths.caseNum;
    doc.text('Cliente Representado', x, currentY + 4.8);
    x += colWidths.client;
    doc.text('Área / Especialidade', x, currentY + 4.8);
    x += colWidths.area;
    doc.text('Situação', x, currentY + 4.8);
    x += colWidths.status;
    doc.text('Tarefas', x, currentY + 4.8);
    x += colWidths.tasks;
    doc.text('Cadastro', x, currentY + 4.8);

    currentY += 7;
  };

  drawTableHeader();

  // --- Table Rows ---
  casesList.forEach((cs, idx) => {
    const rowHeight = 7.5;
    checkPageBreak(rowHeight + 2);

    // Alternate row fill
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + rowHeight, margin + contentWidth, currentY + rowHeight);

    let x = margin + 3;
    const textY = currentY + 5;

    // Title (truncate if needed)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    const titleTruncated = doc.splitTextToSize(cs.title || 'Sem título', colWidths.title - 4);
    doc.text(titleTruncated[0], x, textY);
    x += colWidths.title;

    // Case Number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    const caseNumTruncated = doc.splitTextToSize(cs.caseNumber || 'Pendente', colWidths.caseNum - 4);
    doc.text(caseNumTruncated[0], x, textY);
    x += colWidths.caseNum;

    // Client
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(5, 150, 105);
    const clientTruncated = doc.splitTextToSize(cs.clientName || 'Geral', colWidths.client - 4);
    doc.text(clientTruncated[0], x, textY);
    x += colWidths.client;

    // Area
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const areaTruncated = doc.splitTextToSize(cs.area || 'Geral', colWidths.area - 4);
    doc.text(areaTruncated[0], x, textY);
    x += colWidths.area;

    // Status pill
    let stFill: [number, number, number] = [209, 250, 229]; // emerald-100
    let stText: [number, number, number] = [6, 95, 70]; // emerald-800
    if (cs.status === 'Suspenso') {
      stFill = [254, 243, 199];
      stText = [146, 64, 14];
    } else if (cs.status === 'Concluído') {
      stFill = [224, 231, 255];
      stText = [55, 48, 163];
    } else if (cs.status === 'Renunciado') {
      stFill = [241, 245, 249];
      stText = [71, 85, 105];
    }

    doc.setFillColor(...stFill);
    doc.roundedRect(x, currentY + 1.2, 22, 5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...stText);
    doc.text(cs.status, x + 11, textY - 0.5, { align: 'center' });
    x += colWidths.status;

    // Tasks ratio
    const compTasks = (cs.tasks || []).filter(t => t.completed).length;
    const totTasks = (cs.tasks || []).length;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${compTasks}/${totTasks}`, x + 2, textY);
    x += colWidths.tasks;

    // Date
    doc.text(formatPtDate(cs.createdAt), x, textY);

    currentY += rowHeight;
  });

  // --- Footers on all pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    const disclaimer = 'Almeida Advocacia • Relatório gerencial emitido para fins de auditoria e acompanhamento da carteira processual. Documento confidencial.';
    doc.text(disclaimer, margin, pageHeight - 7.5);

    const pageNumStr = `Página ${i} de ${totalPages}`;
    doc.text(pageNumStr, pageWidth - margin, pageHeight - 7.5, { align: 'right' });
  }

  return doc;
};

/**
 * Downloads a generated jsPDF instance with a sanitized filename.
 */
export const downloadPdfDocument = (doc: jsPDF, filename: string): void => {
  const sanitized = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  doc.save(sanitized);
};
