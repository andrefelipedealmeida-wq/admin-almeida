# Vinculação de Push dos Tribunais e Alertas Processuais

Plano detalhado para integrar o serviço oficial de Push dos Tribunais (PJe, e-SAJ, Projudi e CNJ) aos processos judiciais da Almeida Advocacia, acompanhado de disparos de notificações push nativas no navegador e celular quando houver novo andamento, cadastro de prazo ou alteração de status do caso.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas pelo usuário:**
> - **Escopo de aplicação:** Processos judiciais e andamentos dos casos (`CasesPage.tsx`).
> - **Tipo de push:** Vinculação com serviços de Push oficial dos Tribunais (e-SAJ, PJe, Projudi, TRF, STF/STJ) com identificadores de inscrição e links diretos para cada tribunal.
> - **Gatilhos de disparo:** O alerta push é disparado imediatamente ao cadastrar andamento, prazo ou alterar o status do processo.
> - **Tecnologia de notificação:** Web Push Notifications nativas (`Notification` API com suporte a PWA e mobile) integradas ao perfil do advogado e ao módulo de casos.

---

### 1. Overview & Core Concept

- **O que faz:** Permite ao advogado vincular qualquer ação/processo judicial ao serviço oficial de Push do Tribunal responsável (TJSP, TRF3, PJe, etc.), mantendo salvo o e-mail ou código de subscrição no tribunal, o status da inscrição e um atalho de acesso direto aos autos e ao painel de push do tribunal. Além disso, quando um novo andamento processual, prazo ou alteração de status ocorre no processo, o sistema dispara uma notificação push nativa para o dispositivo do advogado.
- **Público-alvo:** Advogado André Felipe e equipe jurídica da Almeida Advocacia.
- **Valor agregado:** Elimina o risco de perda de prazos de intimações judiciais, centraliza o controle de quais processos estão sendo monitorados ativamente pelos tribunais e notifica em tempo real a equipe sempre que um despacho, prazo ou andamento for registrado.

---

### 2. User Experience & Visual Design

#### A. Painel de Detalhes do Processo (`CasesPage.tsx`)
- **Seção "Push Oficial do Tribunal":**
  - **Card de status do Push:** Indicador discreto e elegante com o tribunal identificado (ex: TJSP - Foro Central / PJe TRF3).
  - **Estado do vínculo:** Badge de estado funcional (`Vinculado ao Push`, `Não vinculado`, `Aguardando confirmação`).
  - **Ações diretas:**
    - Botão *"Acessar Push do Tribunal"*: Abre a tela de push oficial do tribunal específico para cadastramento da OAB ou do número CNJ.
    - Botão *"Configurar Vínculo"*: Modal rápido para inserir ou confirmar o e-mail cadastrado no push, data do último andamento e frequência de checagem.
    - Botão *"Simular / Receber Andamento Push"*: Botão de conveniência para testar o recebimento de publicação ou certidão de intimação na timeline do processo.

#### B. Disparo de Notificações Push Nativas
- Ao adicionar um **novo andamento** (`timeline`):
  - Disparo de notificação push no computador/celular com ícone do escritório, título da ação, tribunal e o resumo do andamento.
- Ao cadastrar uma **nova tarefa/prazo** (`tasks`):
  - Push imediato informando o compromisso adicionado com data e incumbência.
- Ao alterar a **situação/status** do caso:
  - Push de notificação informando a mudança (ex: *Processo 1023456-78.2026 alterado para Concluído*).

#### C. Lista Geral de Processos
- Adição de indicador na tabela e nos cards de processo sinalizando se o caso possui o Push do tribunal ativo, com filtro rápido para ver quais processos estão com push ativado ou pendente.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisão 1: Arquitetura Híbrida (Vínculo de Push dos Tribunais + Notificação Push Local)**
  - *Abordagem escolhida:* Como os tribunais brasileiros (PJe, e-SAJ) não possuem API aberta de webhook universal para todos os sistemas sem certificados digitais token A3 em desktop, implementaremos o **hub de gerenciamento de Push dos Tribunais** (com mapeamento inteligente de URLs oficiais por tribunal, baseado no número CNJ e OAB) combinado com a **API de Web Push nativo** para notificações imediatas da equipe.
  - *Benefício:* Funciona 100% na web sem dependência de drivers locais de certificado, permitindo gerenciar o push de qualquer tribunal do Brasil e receber alertas no celular e desktop.
- **Decisão 2: Modelo de Dados no Firestore**
  - *Abordagem escolhida:* Estender a interface `Case` em `src/types.ts` com o nó `courtPush`:
    ```typescript
    export interface CourtPushConfig {
      enabled: boolean;
      tribunal?: string;
      subscribedEmail?: string;
      subscriptionDate?: string;
      lastCheckDate?: string;
      status: 'ativo' | 'pendente' | 'desativado';
      serviceType: 'esaj' | 'pje' | 'projudi' | 'eproc' | 'cnj_datajud' | 'outro';
      notes?: string;
    }
    ```
  - *Benefício:* Preserva integridade dos dados existentes sem quebras de compatibilidade retroativa.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Módulo de Casos                      │
│                  (CasesPage.tsx)                       │
└──────────────────────────┬─────────────────────────────┘
                           │
             ┌─────────────┴─────────────┐
             ▼                           ▼
   ┌───────────────────┐       ┌───────────────────┐
   │  Push do Tribunal │       │  Web Push Alertas │
   │   (Vínculo PJe,   │       │   (Notification   │
   │  e-SAJ, Projudi)  │       │    API / PWA)     │
   └─────────┬─────────┘       └─────────┬─────────┘
             │                           │
             │                           │ Disparos imediatos:
             │ Mapeamento de             │ • Novo Andamento
             │ URLs Oficiais por         │ • Nova Tarefa/Prazo
             │ CNJ / Tribunal            │ • Alteração de Status
             │                           │
             ▼                           ▼
   ┌───────────────────────────────────────────────┐
   │             Firestore `cases` Doc             │
   │   - courtPush: { enabled, status, tribunal }  │
   │   - timeline: [ { id, date, message } ]       │
   │   - tasks: [ { id, text, completed } ]        │
   │   - status: 'Em andamento' | 'Suspenso' | ... │
   └───────────────────────────────────────────────┘
```

#### Passos de Implementação:
1. **Tipagem (`src/types.ts`):** Adicionar `CourtPushConfig` à interface `Case`.
2. **Utilitário de Tribunais (`src/utils/courtPushHelper.ts`):** Helper com mapeamento automático de tribunais do Brasil (TJSP, TRF3, TJMG, TJRJ, TRT2, etc.) pelo código CNJ do processo, gerando links oficiais de consulta e Push.
3. **Módulo de Casos (`src/pages/admin/CasesPage.tsx`):**
   - Inclusão do painel de controle de Push do Tribunal no detalhe do caso.
   - Integração da chamada de notificação push (`Notification`) nos métodos `handleAddTimelineMsg`, `handleAddTask` e `handleStatusChange`.
   - Adição da coluna/tag visual na listagem de processos.
4. **Permissões e Teste:** Validação com a central de notificações já existente em `ProfilePage.tsx` e verificação de compilação.
