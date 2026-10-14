import React from 'react';
import { 
  Clock, 
  AlertCircle,
  Briefcase,
  Users2,
  CheckSquare,
  Flag
} from 'lucide-react';
import { 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Case, Client, CalendarEvent } from '../../types';

interface DashboardProps {
  cases: Case[];
  clients: Client[];
  events: CalendarEvent[];
  setTab: (tab: string) => void;
}

export default function DashboardPage({ cases, clients, events, setTab }: DashboardProps) {
  // Stats - Filter only non-deleted active cases (status 'Em andamento')
  const activeCasesList = cases.filter(c => !c.deleted && c.status === 'Em andamento');
  const activeCasesCount = activeCasesList.length;
  const totalClientsCount = clients.filter(c => !c.deleted).length;
  const pendingDeadlines = events.filter(e => !e.deleted && e.type === 'prazo' && e.status !== 'Cancelado' && e.status !== 'Concluído');

  // Cases by Area chart data - Exclusively active processes
  const areasCount = activeCasesList.reduce((acc: any, curr) => {
    acc[curr.area] = (acc[curr.area] || 0) + 1;
    return acc;
  }, {});

  const areaPieData = [
    { name: 'Inventários e Partilhas', value: (areasCount['Inventários e Partilhas'] || 0) + (areasCount['Inventários'] || 0), color: '#3b82f6' },
    { name: 'Direito Imobiliário', value: areasCount['Direito Imobiliário'] || 0, color: '#06b6d4' },
    { name: 'Direito de Família', value: (areasCount['Direito de Família'] || 0) + (areasCount['Família'] || 0), color: '#f59e0b' },
    { name: 'Direito Civil e Contratos', value: (areasCount['Direito Civil e Contratos'] || 0) + (areasCount['Direito Civil'] || 0), color: '#10b981' },
    { name: 'Registro de Marcas', value: areasCount['Registro de Marcas'] || 0, color: '#a855f7' },
    { name: 'Outros', value: (areasCount['Outros'] || 0), color: '#8b5cf6' }
  ].filter(i => i.value > 0);

  const specialtyData = [
    { name: 'Inventários e Partilhas', total: activeCasesList.filter(c => c.area === 'Inventários e Partilhas' || c.area === 'Inventários').length },
    { name: 'Direito Imobiliário', total: activeCasesList.filter(c => c.area === 'Direito Imobiliário').length },
    { name: 'Direito de Família', total: activeCasesList.filter(c => c.area === 'Direito de Família' || c.area === 'Família').length },
    { name: 'Direito Civil e Contratos', total: activeCasesList.filter(c => c.area === 'Direito Civil e Contratos' || c.area === 'Direito Civil').length },
    { name: 'Registro de Marcas', total: activeCasesList.filter(c => c.area === 'Registro de Marcas').length },
    { name: 'Outros', total: activeCasesList.filter(c => c.area === 'Outros').length }
  ];

  return (
    <div className="space-y-8 text-neutral-100">
      
      {/* Top Banner Message */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-neutral-900 to-neutral-850 p-6 rounded-2xl border border-neutral-800 shadow-md">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">Olá, Dr. André Felipe</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Aqui está a consolidação dos prazos do escritório, andamentos de processos e compromissos hoje.
          </p>
        </div>
        <button
          onClick={() => setTab('agenda')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold font-display shadow-md shadow-emerald-500/10 transition-colors"
        >
          Visualizar Agenda Hoje
        </button>
      </div>

      {/* Grid Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Active Cases */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono">Processos Ativos</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-display">{activeCasesCount}</div>
            <p className="text-[11px] text-emerald-500 font-semibold mt-1 flex items-center space-x-1">
              <span>Acompanhamento real</span>
            </p>
          </div>
        </div>

        {/* Card 2: Clients */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono">Clientes Atendidos</span>
            <div className="w-9 h-9 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
              <Users2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-display">{totalClientsCount}</div>
            <p className="text-[11px] text-neutral-400 mt-1">Pessoas em sua carteira</p>
          </div>
        </div>

        {/* Card 3: Deadlines counter */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono">Prazos de Controle</span>
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold font-display">{pendingDeadlines.length}</div>
            <p className="text-[11px] text-red-400 mt-1 font-semibold flex items-center space-x-1">
              <span>Atenção aos prazos judiciais</span>
            </p>
          </div>
        </div>

      </div>

      {/* Graphics Splitting Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Cases Distribution Bar Chart */}
        <div className="lg:col-span-8 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono">Volume de Processos por Especialidade</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={specialtyData}>
                <XAxis dataKey="name" stroke="#737373" fontSize={11} tickLine={false} />
                <YAxis stroke="#737373" fontSize={11} allowDecimals={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} formatter={(v) => [`${v} Processos`, 'Quantidade']} />
                <Bar dataKey="total" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Areas Distribution Pie */}
        <div className="lg:col-span-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4">
          <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono">Especialidades do Portfolio</h3>
          
          <div className="h-44 w-full flex justify-center items-center relative">
            {areaPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={areaPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {areaPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-neutral-500">Nenhum processo cadastrado.</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-neutral-800 font-mono">
            {areaPieData.map((entry) => (
              <div key={entry.name} className="flex items-center space-x-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-neutral-400 capitalize">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Deadlines list / Notifications split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Deadlines Section */}
        <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-emerald-500" />
            <span>Prazos Processuais e Alertas</span>
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {pendingDeadlines.length > 0 ? (
              pendingDeadlines.map((dead) => (
                <div 
                  key={dead.id} 
                  className={`p-4 rounded-xl border flex justify-between items-start transition-all ${
                    dead.impreterivel
                      ? 'bg-yellow-950/25 border-yellow-500/50 shadow-sm shadow-yellow-500/10'
                      : 'bg-neutral-950 border-neutral-800/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <h5 className={`font-bold text-xs ${dead.impreterivel ? 'text-yellow-200' : 'text-neutral-200'}`}>
                        {dead.title}
                      </h5>
                      {dead.impreterivel && (
                        <span className="inline-flex items-center space-x-1 bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider">
                          <Flag className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                          <span>Impreterível</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-505 text-neutral-500">{dead.description}</p>
                    {dead.clientName && (
                      <p className="text-[10px] text-emerald-500 font-medium">Cliente: {dead.clientName}</p>
                    )}
                  </div>
                  <div className={`text-right text-xs px-2 py-1 rounded border font-mono ${
                    dead.impreterivel
                      ? 'bg-yellow-950/50 text-yellow-300 border-yellow-500/40'
                      : 'bg-red-950/40 text-red-400 border-red-900/30'
                  }`}>
                    <strong>{dead.date}</strong>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-neutral-505 text-xs text-neutral-500 py-4 text-center">Nenhum prazo judicial pendente.</div>
            )}
          </div>
        </div>

        {/* Agenda Events */}
        <div className="lg:col-span-6 bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-emerald-500" />
            <span>Compromissos para Hoje</span>
          </h3>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {events.filter(e => e.type !== 'prazo' && e.status === 'Confirmado').length > 0 ? (
              events
                .filter(e => e.type !== 'prazo' && e.status === 'Confirmado')
                .map((evt) => (
                  <div 
                    key={evt.id} 
                    className={`p-4 rounded-xl border flex justify-between items-center transition-all ${
                      evt.impreterivel
                        ? 'bg-yellow-950/25 border-yellow-500/50 shadow-sm shadow-yellow-500/10'
                        : 'bg-neutral-950 border-neutral-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <h5 className={`font-bold text-xs ${evt.impreterivel ? 'text-yellow-200' : 'text-neutral-200'}`}>
                          {evt.title}
                        </h5>
                        {evt.impreterivel && (
                          <span className="inline-flex items-center space-x-1 bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider">
                            <Flag className="w-2.5 h-2.5 fill-yellow-400 text-yellow-400" />
                            <span>Impreterível</span>
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] uppercase font-mono font-bold bg-neutral-900 px-2 py-0.5 rounded text-neutral-400 border border-neutral-800">
                        {evt.type}
                      </span>
                    </div>
                    <div className={`text-right text-xs px-3 py-1.5 rounded-lg border font-mono ${
                      evt.impreterivel
                        ? 'bg-yellow-950/50 text-yellow-300 border-yellow-500/40'
                        : 'bg-neutral-900 text-emerald-400 border-neutral-800'
                    }`}>
                      <strong>{evt.time}</strong>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-neutral-505 text-xs text-neutral-500 py-4 text-center">Nenhum compromisso agendado para hoje.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
