import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Calculator, 
  HelpCircle, 
  TrendingUp, 
  FileText, 
  DollarSign, 
  Scale, 
  AlertCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { toast } from 'sonner';

export default function CalculatorPagePublic() {
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({
    propertyValue: 500000,
    caseType: 'inventario-extrajudicial', // inventario-extrajudicial, inventario-judicial, acao-civel
    heirCount: 2,
    stateRate: 4 // ITCMD standard 4%
  });

  const [results, setResults] = useState<any>(null);

  const calculateCosts = () => {
    const { propertyValue, caseType, heirCount, stateRate } = inputs;
    
    if (propertyValue <= 0) {
      toast.error('Por favor, informe o valor estimado dos bens ou causa.');
      return;
    }

    // ITCMD tax (applies mainly to inventário)
    const itcmdTax = caseType.includes('inventario') ? propertyValue * (stateRate / 100) : 0;

    // Cartório / Judicial distribution fees (est. ~1.5% to 2.5%)
    const courtOrCartorioFee = caseType === 'inventario-extrajudicial' 
      ? Math.min(Math.max(propertyValue * 0.012, 1200), 18000)
      : Math.min(Math.max(propertyValue * 0.02, 1500), 45000);

    // Certidões & Documentação (~ R$ 1.500 baseline)
    const certDocsFee = 1500 + (heirCount * 250);

    // Honorários Sugeridos Tabela OAB (est. ~ 6% a 10% para inventários)
    const estimatedHonorarios = Math.max(propertyValue * 0.06, 5000);

    const totalEstimatedCost = itcmdTax + courtOrCartorioFee + certDocsFee + estimatedHonorarios;

    const chartData = [
      { name: 'Imposto ITCMD', valor: Math.round(itcmdTax) },
      { name: 'Custas/Cartório', valor: Math.round(courtOrCartorioFee) },
      { name: 'Certidões e Docs', valor: Math.round(certDocsFee) },
      { name: 'Honorários Est.', valor: Math.round(estimatedHonorarios) }
    ].filter(item => item.valor > 0);

    setResults({
      itcmdTax,
      courtOrCartorioFee,
      certDocsFee,
      estimatedHonorarios,
      totalEstimatedCost,
      perHeir: caseType.includes('inventario') && heirCount > 0 ? totalEstimatedCost / heirCount : totalEstimatedCost,
      chartData
    });

    toast.success('Simulação de custas cíveis efetuada com sucesso!');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const COLORS = ['#10b981', '#059669', '#047857', '#065f46'];

  return (
    <div className="bg-black text-neutral-100 min-h-screen py-16 sm:py-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Page Top Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/30 font-mono">
            Ferramenta Inteligente Gratuita
          </span>
          <h1 className="text-4xl font-bold text-white font-display">Simulador de Custas & Inventário</h1>
          <p className="text-neutral-300">
            Obtenha uma simulação aproximada das custas cartorárias, imposto ITCMD e certidões necessárias para inventários e causa cíveis.
          </p>
        </div>

        {/* Input Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Inputs Section */}
          <div className="lg:col-span-5 bg-neutral-900 border border-neutral-850 p-6 sm:p-8 rounded-2xl shadow-2xl space-y-6">
            <h3 className="text-lg font-bold text-white font-display flex items-center space-x-2 border-b border-neutral-850 pb-4">
              <Calculator className="w-5 h-5 text-emerald-500" />
              <span>Inserir Dados da Causa</span>
            </h3>

            <div className="space-y-4">
              {/* Value Input */}
              <div>
                <label className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Valor Total dos Bens ou da Causa *</label>
                <div className="relative mt-1 rounded-md shadow-sm">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-neutral-500 text-sm">R$</span>
                  </div>
                  <input
                    type="number"
                    value={inputs.propertyValue}
                    onChange={(e) => setInputs({...inputs, propertyValue: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 pl-9 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="500000"
                  />
                </div>
              </div>

              {/* Case type */}
              <div>
                <label className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Modalidade do Procedimento *</label>
                <select
                  value={inputs.caseType}
                  onChange={(e) => setInputs({...inputs, caseType: e.target.value})}
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="inventario-extrajudicial">Inventário Extrajudicial (Cartório)</option>
                  <option value="inventario-judicial">Inventário Judicial</option>
                  <option value="acao-civel">Ação Cível Contratual / Reparação</option>
                </select>
              </div>

              {/* Heir count if applicable */}
              {inputs.caseType.includes('inventario') && (
                <div>
                  <label className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Número de Herdeiros</label>
                  <input
                    type="number"
                    value={inputs.heirCount}
                    onChange={(e) => setInputs({...inputs, heirCount: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="2"
                    min="1"
                  />
                </div>
              )}

              {/* ITCMD rate */}
              {inputs.caseType.includes('inventario') && (
                <div>
                  <label className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Alíquota ITCMD Estimada do Estado (%)</label>
                  <input
                    type="number"
                    value={inputs.stateRate}
                    onChange={(e) => setInputs({...inputs, stateRate: Number(e.target.value)})}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    placeholder="4"
                    min="1"
                    max="8"
                  />
                  <span className="text-[10px] text-neutral-500 mt-1 block">Em SP a alíquota padrão é de 4% sobre a base de cálculo.</span>
                </div>
              )}
            </div>

            <button
              onClick={calculateCosts}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold font-display shadow-lg transition-transform hover:-translate-y-0.5 text-sm uppercase tracking-wider block"
            >
              Simular Custas Estimadas
            </button>
          </div>

          {/* Results section */}
          <div className="lg:col-span-7">
            {results ? (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Total amount header */}
                <div className="bg-neutral-900 border border-neutral-850 p-6 sm:p-8 rounded-2xl shadow-sm text-center">
                  <span className="text-xs uppercase tracking-wider font-mono font-bold text-neutral-400">Total Estimado de Custas & Impostos</span>
                  <div className="text-3xl sm:text-4.5xl font-extrabold text-emerald-400 mt-2 font-display">
                    {formatCurrency(results.totalEstimatedCost)}
                  </div>
                  {inputs.caseType.includes('inventario') && inputs.heirCount > 1 && (
                    <p className="text-xs text-neutral-300 mt-2 font-mono">
                      Aproximadamente <strong className="text-emerald-400">{formatCurrency(results.perHeir)}</strong> por herdeiro ({inputs.heirCount} herdeiros)
                    </p>
                  )}
                  <p className="text-xs text-neutral-500 mt-3 max-w-md mx-auto">
                    * Este cálculo é meramente estimativo e pedagógico. Os valores exatos dependem de certidões atualizadas e tabelas oficiais de emolumentos estaduais.
                  </p>
                </div>

                {/* Splitting Graphics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Detailed metrics card */}
                  <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-2xl shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono">Detalhamento Estimado</h4>
                    
                    <div className="space-y-3 text-sm">
                      {results.itcmdTax > 0 && (
                        <div className="flex justify-between border-b border-neutral-800 pb-2">
                          <span className="text-neutral-300">Imposto ITCMD ({inputs.stateRate}%):</span>
                          <span className="font-semibold text-white">{formatCurrency(results.itcmdTax)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-b border-neutral-800 pb-2">
                        <span className="text-neutral-300">Emolumentos de Cartório / Custas:</span>
                        <span className="font-semibold text-white">{formatCurrency(results.courtOrCartorioFee)}</span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-800 pb-2">
                        <span className="text-neutral-300">Certidões & Documentação:</span>
                        <span className="font-semibold text-white">{formatCurrency(results.certDocsFee)}</span>
                      </div>
                      <div className="flex justify-between border-b border-neutral-800 pb-2">
                        <span className="text-neutral-300">Honorários Advocatícios Est.:</span>
                        <span className="font-semibold text-emerald-400">{formatCurrency(results.estimatedHonorarios)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Graph card */}
                  <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
                    <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono mb-4">Gráfico de Distribuição de Custas</h4>
                    
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={results.chartData}>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#888888' }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: '#111111', borderColor: '#222222' }} />
                          <Bar dataKey="valor" fill="#10b981" radius={[4, 4, 0, 0]}>
                            {results.chartData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Lawyer Lead generation CTA */}
                <div className="bg-neutral-900 border border-neutral-850 p-6 rounded-2xl shadow-sm text-center space-y-4">
                  <h4 className="text-md font-bold text-white font-display">Deseja Agilizar seu Inventário ou Ação Cível?</h4>
                  <p className="text-xs text-neutral-400 max-w-lg mx-auto">
                    Nossa equipe realiza a análise prévia de documentos, certidões e imóveis para garantir a menor alíquota tributária e a condução mais célere.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => navigate('/contato?subject=Análise de Inventário e Custas')}
                      className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs uppercase tracking-wide rounded-lg font-display transition-colors"
                    >
                      Falar com Advogado Especialista
                    </button>
                  </div>
                </div>

              </motion.div>
            ) : (
              <div className="bg-neutral-900/40 border border-neutral-850 border-dashed p-16 rounded-2xl text-center text-neutral-400 font-medium h-full flex flex-col justify-center items-center space-y-4">
                <FileText className="w-12 h-12 text-neutral-600 animate-pulse" />
                <p className="text-sm font-sans max-w-xs">
                  Preencha os valores do formulário à esquerda e clique em <strong>"Simular Custas Estimadas"</strong> para obter a projeção de investimentos e impostos.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
