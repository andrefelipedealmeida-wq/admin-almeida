import React, { useState } from 'react';
import { 
  DollarSign, 
  Search, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  FileText, 
  FolderMinus, 
  Columns,
  Calculator,
  X
} from 'lucide-react';
import { Transaction, Case } from '../../types';
import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface FinancePageProps {
  transactions: Transaction[];
  cases: Case[];
}

export default function FinancePage({ transactions, cases }: FinancePageProps) {
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string; message: string } | null>(null);
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'receita' | 'despesa'>('Todos');
  const [isAddingMsg, setIsAddingMsg] = useState(false);
  const [newTrans, setNewTrans] = useState({
    type: 'receita' as const,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Contrato Inicial',
    caseId: ''
  });

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTrans.amount || !newTrans.description || !newTrans.date) {
      toast.error('Preencha todos os campos obrigatórios (*).');
      return;
    }

    const selectedCase = cases.find(c => c.id === newTrans.caseId);

    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        type: newTrans.type,
        amount: Number(newTrans.amount),
        description: newTrans.description,
        date: newTrans.date,
        category: newTrans.category,
        caseId: newTrans.caseId || null,
        caseTitle: selectedCase ? selectedCase.title : null,
        userId: auth.currentUser?.uid || '',
        createdBy: auth.currentUser?.email || '',
        createdAt: new Date().toISOString()
      });

      // Mirror transaction in the Agenda/Events collection
      const amountNum = Number(newTrans.amount);
      const priority = amountNum > 5000 ? 'Alta' : 'Média';
      const formattedAmount = amountNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const eventTitle = `[Financeiro] ${newTrans.type === 'receita' ? 'Receita' : 'Despesa'}: ${newTrans.description}`;
      const eventDescription = `Lançamento Financeiro\nValor: ${formattedAmount}\nCategoria: ${newTrans.category}\nStatus de Lançamento: Efetuado`;

      await addDoc(collection(db, 'events'), {
        title: eventTitle,
        date: newTrans.date,
        time: '', // Blank time translates to "Sem Horário"
        description: eventDescription,
        type: 'financeiro',
        status: 'Confirmado',
        priority: priority,
        transactionId: docRef.id,
        userId: auth.currentUser?.uid || '',
        createdBy: auth.currentUser?.email || '',
        createdAt: new Date().toISOString()
      });

      toast.success('Transação lançada no Livro-Caixa e espelhada na Agenda com sucesso!');
      setIsAddingMsg(false);
      setNewTrans({
        type: 'receita',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        category: 'Contrato Inicial',
        caseId: ''
      });
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar transação.');
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setDeleteConfirm({
      id,
      title: 'Excluir Lançamento Contábil',
      message: 'Deseja realmente apagar este lançamento contábil? Esta ação é irreversível.'
    });
  };

  // Math
  const totalReceitas = transactions
    .filter(t => t.type === 'receita')
    .reduce((sum, curr) => sum + curr.amount, 0);

  const totalDespesas = transactions
    .filter(t => t.type === 'despesa')
    .reduce((sum, curr) => sum + curr.amount, 0);

  const saldoLiquido = totalReceitas - totalDespesas;

  const filteredTrans = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(search.toLowerCase()) || 
                          t.category.toLowerCase().includes(search.toLowerCase()) ||
                          (t.caseTitle && t.caseTitle.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'Todos' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const chartData = [
    { name: 'Entradas', valor: Math.round(totalReceitas), color: '#199300' },
    { name: 'Saídas/Custos', valor: Math.round(totalDespesas), color: '#ef4444' }
  ];

  return (
    <div className="space-y-6 text-neutral-100">
      
      <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl">
        <h2 className="text-sm font-semibold font-display text-neutral-200">Livro-Caixa e Fluxo Financeiro</h2>
        <button
          onClick={() => setIsAddingMsg(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Fazer Lançamento Financeiro</span>
        </button>
      </div>

      {/* Balanced Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Entradas */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-450 text-neutral-400">Total de Entradas</span>
            <div className="text-xl sm:text-2xl font-bold font-display text-emerald-400">{formatBRL(totalReceitas)}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Saídas */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-450 text-neutral-400">Total de Saídas</span>
            <div className="text-xl sm:text-2xl font-bold font-display text-red-400">{formatBRL(totalDespesas)}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        {/* Saldo Líquido */}
        <div className="bg-neutral-900 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between shadow-sm">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-neutral-450 text-neutral-400">Consolidação Líquida</span>
            <div className={`text-xl sm:text-2xl font-bold font-display ${saldoLiquido >= 0 ? 'text-emerald-450 text-emerald-400' : 'text-red-400'}`}>{formatBRL(saldoLiquido)}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Split Graph of rateio & list */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: table Ledger */}
        <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-sm">
          
          {/* Header query table */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pb-3 border-b border-neutral-800">
            <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-neutral-400">Rateio de Movimentações</h3>
            
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar receitas/despesas..."
                className="pl-3 pr-2 py-1 bg-neutral-950 border border-neutral-800 text-[11px] rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-neutral-200"
              />
              <select
                value={typeFilter}
                onChange={(e: any) => setTypeFilter(e.target.value)}
                className="bg-neutral-950 border border-neutral-800 px-2.5 py-1 text-[11px] rounded focus:outline-none text-neutral-200"
              >
                <option value="Todos">Todos</option>
                <option value="receita">Apenas Receitas</option>
                <option value="despesa">Apenas Despesas</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="text-[11px] font-mono font-bold text-neutral-400 tracking-wider bg-neutral-950 border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-2.5">Data Lançamento</th>
                  <th className="px-4 py-2.5">Descrição</th>
                  <th className="px-4 py-2.5">Categoria</th>
                  <th className="px-4 py-2.5 text-right">Valor Bruto</th>
                  <th className="px-4 py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {filteredTrans.length > 0 ? (
                  filteredTrans.map((tr) => (
                    <tr key={tr.id} className="hover:bg-neutral-950/40">
                      <td className="px-4 py-3 font-mono text-neutral-400">{tr.date}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-neutral-200 block">{tr.description}</span>
                        {tr.caseTitle && (
                          <span className="text-[10px] text-emerald-500 font-medium block">Processo: {tr.caseTitle}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-neutral-300 capitalize">{tr.category}</td>
                      <td className={`px-4 py-3 text-right font-semibold font-mono ${
                        tr.type === 'receita' ? 'text-emerald-450 text-emerald-400' : 'text-red-400'
                      }`}>
                        {tr.type === 'receita' ? '+' : '-'}{formatBRL(tr.amount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteTransaction(tr.id)}
                          className="p-1 hover:bg-red-950/20 text-red-500 hover:text-red-400 border border-neutral-800 hover:border-red-900/40 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-neutral-500">Nenhum lançamento contábil localizado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Recharts Pie splits */}
        <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-6 flex flex-col justify-between">
          <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-neutral-400">Proporção Entradas vs Custos</h3>
          
          <div className="h-56 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  color="#199300"
                  paddingAngle={5}
                  dataKey="valor"
                >
                  <Cell fill="#199300" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 pt-6 border-t border-neutral-800 text-xs font-mono">
            <div className="flex justify-between items-center text-neutral-400">
              <span className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Entradas / Honorários:</span>
              </span>
              <strong className="text-neutral-200">{formatBRL(totalReceitas)}</strong>
            </div>

            <div className="flex justify-between items-center text-neutral-400">
              <span className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span>Saídas / Operacional:</span>
              </span>
              <strong className="text-neutral-200">{formatBRL(totalDespesas)}</strong>
            </div>
          </div>
        </div>

      </div>

      {/* Lançamento Form Modal Overlay */}
      {isAddingMsg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 p-6 sm:p-8 rounded-2xl max-w-lg w-full space-y-6">
            <div className="flex justify-between items-center border-b border-neutral-800 pb-3">
              <h3 className="text-md font-bold text-neutral-100 font-display">Registrar Lançamento de Caixa</h3>
              <button 
                onClick={() => setIsAddingMsg(false)}
                className="p-1 hover:bg-neutral-850 rounded font-semibold text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs font-semibold">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Tipo de Fluxo *</label>
                  <select
                    value={newTrans.type}
                    onChange={(e: any) => setNewTrans({ ...newTrans, type: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                  >
                    <option value="receita">Receita (Entrada)</option>
                    <option value="despesa">Despesa (Saída)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Valor Bruto (BRL) *</label>
                  <input
                    type="number"
                    required
                    value={newTrans.amount}
                    onChange={(e) => setNewTrans({ ...newTrans, amount: e.target.value })}
                    placeholder="Ex: 4500"
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-emerald-450 text-neutral-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Descrição Comercial *</label>
                <input
                  type="text"
                  required
                  value={newTrans.description}
                  onChange={(e) => setNewTrans({ ...newTrans, description: e.target.value })}
                  placeholder="Ex: Honorários Sukes Reclamação"
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Data Lançamento *</label>
                  <input
                    type="date"
                    required
                    value={newTrans.date}
                    onChange={(e) => setNewTrans({ ...newTrans, date: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Categoria Contábil</label>
                  <select
                    value={newTrans.category}
                    onChange={(e) => setNewTrans({ ...newTrans, category: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-250 text-neutral-200 focus:outline-none"
                  >
                    <option value="Contrato Inicial">Contrato Inicial (Honorários)</option>
                    <option value="Mensalidade">Mensalidade (Assessoria)</option>
                    <option value="Custas de Processo">Custas de Processo (Taxas)</option>
                    <option value="Operacional Escritório">Operacional (Softwares, Aluguel)</option>
                    <option value="Impostos">Impostos (Receita)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase font-mono font-bold tracking-wider mb-1.5 text-neutral-400">Associar ao Processo (Opcional)</label>
                <select
                  value={newTrans.caseId}
                  onChange={(e) => setNewTrans({ ...newTrans, caseId: e.target.value })}
                  className="w-full px-3 py-2 border border-neutral-850 bg-neutral-950 rounded-lg text-neutral-200 focus:outline-none font-sans"
                >
                  <option value="">-- Não Associar --</option>
                  {cases.map(cs => (
                    <option key={cs.id} value={cs.id}>{cs.title} ({cs.caseNumber})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddingMsg(false)}
                  className="px-4 py-2 border border-neutral-800 text-neutral-450 hover:bg-neutral-850 text-neutral-400 rounded-lg text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-transform"
                >
                  Confirmar Lançamento
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
                    // Query for the mirrored calendar events with this transactionId and soft delete them
                    const qEvents = query(collection(db, 'events'), where('transactionId', '==', deleteConfirm.id));
                    const qSnap = await getDocs(qEvents);
                    const updatePromises = qSnap.docs.map(evtDoc => updateDoc(doc(db, 'events', evtDoc.id), {
                      deleted: true,
                      deletedAt: new Date().toISOString()
                    }));
                    await Promise.all(updatePromises);

                    // Soft delete the transaction itself
                    await updateDoc(doc(db, 'transactions', deleteConfirm.id), {
                      deleted: true,
                      deletedAt: new Date().toISOString()
                    });
                    toast.success('Lançamento contábil e compromisso da Agenda ocultados com sucesso (Soft Delete).');
                  } catch (err) {
                    console.error(err);
                    toast.error('Erro ao ocultar lançamento.');
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

    </div>
  );
}
