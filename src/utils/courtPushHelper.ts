/**
 * Utilitário de Suporte para Vinculação de Push Oficial dos Tribunais
 * Almeida Advocacia Core Legal Engine
 */

export interface TribunalInfo {
  code: string;
  name: string;
  shortName: string;
  system: 'esaj' | 'pje' | 'projudi' | 'eproc' | 'cnj_datajud';
  pushUrl: string;
  consultUrl: string;
}

// Mapeamento de Tribunais Estaduais (Segmento 8)
const ESTADUAL_MAP: Record<string, TribunalInfo> = {
  '26': {
    code: '8.26',
    name: 'Tribunal de Justiça de São Paulo',
    shortName: 'TJSP',
    system: 'esaj',
    pushUrl: 'https://esaj.tjsp.jus.br/push/abrirCadastrarProcesso.do',
    consultUrl: 'https://esaj.tjsp.jus.br/cpopg/open.do'
  },
  '19': {
    code: '8.19',
    name: 'Tribunal de Justiça do Rio de Janeiro',
    shortName: 'TJRJ',
    system: 'pje',
    pushUrl: 'https://www.tjrj.jus.br/servicos/push',
    consultUrl: 'https://www.tjrj.jus.br/consultas'
  },
  '13': {
    code: '8.13',
    name: 'Tribunal de Justiça de Minas Gerais',
    shortName: 'TJMG',
    system: 'pje',
    pushUrl: 'https://pje.tjmg.jus.br/pje/Push/login.seam',
    consultUrl: 'https://www.tjmg.jus.br/portal-tjmg/processos/consulta/'
  },
  '21': {
    code: '8.21',
    name: 'Tribunal de Justiça do Rio Grande do Sul',
    shortName: 'TJRS',
    system: 'eproc',
    pushUrl: 'https://eproc1g.tjrs.jus.br/eproc/externo_controlador.php',
    consultUrl: 'https://www.tjrs.jus.br/novo/busca-processual/'
  },
  '16': {
    code: '8.16',
    name: 'Tribunal de Justiça do Paraná',
    shortName: 'TJPR',
    system: 'projudi',
    pushUrl: 'https://projudi.tjpr.jus.br/projudi/',
    consultUrl: 'https://www.tjpr.jus.br/consulta-processual'
  },
  '24': {
    code: '8.24',
    name: 'Tribunal de Justiça de Santa Catarina',
    shortName: 'TJSC',
    system: 'eproc',
    pushUrl: 'https://eproc1g.tjsc.jus.br/eproc/',
    consultUrl: 'https://www.tjsc.jus.br/processos'
  },
  '07': {
    code: '8.07',
    name: 'Tribunal de Justiça do DF e Territórios',
    shortName: 'TJDFT',
    system: 'pje',
    pushUrl: 'https://pje.tjdft.jus.br/pje/Push/login.seam',
    consultUrl: 'https://www.tjdft.jus.br/consultas'
  },
  '05': {
    code: '8.05',
    name: 'Tribunal de Justiça da Bahia',
    shortName: 'TJBA',
    system: 'pje',
    pushUrl: 'https://pje.tjba.jus.br/pje/Push/login.seam',
    consultUrl: 'https://www.tjba.jus.br/portal/'
  }
};

// Mapeamento de Tribunais Regionais Federais (Segmento 4)
const FEDERAL_MAP: Record<string, TribunalInfo> = {
  '03': {
    code: '4.03',
    name: 'Tribunal Regional Federal da 3ª Região (SP/MS)',
    shortName: 'TRF3',
    system: 'pje',
    pushUrl: 'https://pje1g.trf3.jus.br/pje/Push/login.seam',
    consultUrl: 'https://web.trf3.jus.br/consultas/'
  },
  '01': {
    code: '4.01',
    name: 'Tribunal Regional Federal da 1ª Região',
    shortName: 'TRF1',
    system: 'pje',
    pushUrl: 'https://pje1g.trf1.jus.br/pje/Push/login.seam',
    consultUrl: 'https://portal.trf1.jus.br/portaltrf1/'
  },
  '02': {
    code: '4.02',
    name: 'Tribunal Regional Federal da 2ª Região (RJ/ES)',
    shortName: 'TRF2',
    system: 'eproc',
    pushUrl: 'https://eproc.trf2.jus.br/eproc/',
    consultUrl: 'https://www.trf2.jus.br/'
  },
  '04': {
    code: '4.04',
    name: 'Tribunal Regional Federal da 4ª Região',
    shortName: 'TRF4',
    system: 'eproc',
    pushUrl: 'https://eproc.trf4.jus.br/eproc2trf4/',
    consultUrl: 'https://www.trf4.jus.br/'
  }
};

// Mapeamento da Justiça do Trabalho (Segmento 5)
const TRABALHO_MAP: Record<string, TribunalInfo> = {
  '02': {
    code: '5.02',
    name: 'Tribunal Regional do Trabalho da 2ª Região (SP Capital/Litoral)',
    shortName: 'TRT2',
    system: 'pje',
    pushUrl: 'https://pje.trt2.jus.br/primeirograu/Push/login.seam',
    consultUrl: 'https://ww2.trt2.jus.br/consultas/'
  },
  '15': {
    code: '5.15',
    name: 'Tribunal Regional do Trabalho da 15ª Região (Campinas/Interior)',
    shortName: 'TRT15',
    system: 'pje',
    pushUrl: 'https://pje.trt15.jus.br/primeirograu/Push/login.seam',
    consultUrl: 'https://trt15.jus.br/consulta-processual'
  }
};

/**
 * Identifica o tribunal oficial com base no número padrão CNJ (NNNNNNN-DD.AAAA.J.TR.OOOO)
 */
export function identifyTribunalFromCNJ(caseNumber: string): TribunalInfo {
  // Limpa máscara
  const clean = (caseNumber || '').replace(/\D/g, '');
  
  if (clean.length === 20) {
    // Posições no CNJ de 20 dígitos:
    // 0-6: Número sequencial
    // 7-8: Dígito verificador
    // 9-12: Ano
    // 13: Segmento de Justiça (J)
    // 14-15: Tribunal / Região (TR)
    // 16-19: Unidade de Origem / Foro (OOOO)
    const justice = clean.charAt(13);
    const region = clean.substring(14, 16);

    if (justice === '8' && ESTADUAL_MAP[region]) {
      return ESTADUAL_MAP[region];
    }
    if (justice === '4' && FEDERAL_MAP[region]) {
      return FEDERAL_MAP[region];
    }
    if (justice === '5' && TRABALHO_MAP[region]) {
      return TRABALHO_MAP[region];
    }
    if (justice === '1') {
      return {
        code: '1.00',
        name: 'Supremo Tribunal Federal',
        shortName: 'STF',
        system: 'cnj_datajud',
        pushUrl: 'https://portal.stf.jus.br/processos/',
        consultUrl: 'https://portal.stf.jus.br/processos/'
      };
    }
    if (justice === '3') {
      return {
        code: '3.00',
        name: 'Superior Tribunal de Justiça',
        shortName: 'STJ',
        system: 'cnj_datajud',
        pushUrl: 'https://www.stj.jus.br/processo/push/',
        consultUrl: 'https://www.stj.jus.br/processo/consulta/'
      };
    }
  }

  // Fallback padrão se for São Paulo (sede do escritório) ou formato não reconhecido
  return {
    code: '8.26',
    name: 'Tribunal de Justiça de São Paulo',
    shortName: 'TJSP',
    system: 'esaj',
    pushUrl: 'https://esaj.tjsp.jus.br/push/abrirCadastrarProcesso.do',
    consultUrl: 'https://esaj.tjsp.jus.br/cpopg/open.do'
  };
}

/**
 * Toca um sinal sonoro elegante de alerta via Web Audio API (não necessita de arquivo mp3 externo)
 */
export function playChimeSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Tom 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    gain1.gain.setValueAtTime(0.08, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start();
    osc1.stop(ctx.currentTime + 0.35);

    // Tom 2 (harmonioso)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
    gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (err) {
    // Silencioso em caso de restrição do navegador
  }
}

/**
 * Dispara uma notificação nativa de push no navegador com ícone e som
 */
export function dispatchCasePushNotification(
  title: string,
  body: string,
  tag?: string
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  // Toca o chime de alerta
  playChimeSound();

  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/imagens/logo-oficial.png',
        badge: '/favicon.png',
        tag: tag || 'case-update',
        requireInteraction: false
      });
      return true;
    } catch (e) {
      console.warn('Erro ao disparar notificação push nativa:', e);
      return false;
    }
  }

  return false;
}

/**
 * Exemplos de andamentos oficiais para simulação e teste de push do tribunal
 */
export const OFFICIAL_PUSH_TEMPLATES = [
  {
    tipo: 'Intimação Eletrônica',
    descricao: 'Certidão de Intimação Eletrônica Expedida pelo Cartório Judicial. Prazo legal de 15 dias iniciado.'
  },
  {
    tipo: 'Despacho Proferido',
    descricao: 'Despacho: Vistos. Especifiquem as partes as provas que pretendem produzir no prazo sucessivo de 5 dias.'
  },
  {
    tipo: 'Publicação DJE',
    descricao: 'Disponibilizado no Diário da Justiça Eletrônico despacho/decisão com prazo para manifestação.'
  },
  {
    tipo: 'Audiência Designada',
    descricao: 'Audiência de Conciliação e Saneamento designada para data futura. Intimem-se as partes com antecedência.'
  },
  {
    tipo: 'Sentença Registrada',
    descricao: 'Sentença com Resolução de Mérito proferida e devidamente registrada pelo Magistrado.'
  }
];
