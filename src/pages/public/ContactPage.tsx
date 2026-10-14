import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Send, HelpCircle, Shield, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Check, MessageSquare } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'sonner';
import { motion } from 'motion/react';

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [lead, setLead] = useState({
    name: '',
    returnChannel: 'whatsapp', // 'whatsapp' | 'email'
    phone: '',
    email: '',
    subject: '',
    message: ''
  });

  // Calendar & Appointment State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>(''); // No default time
  
  const availableTimeSlots = [
    '08:30', '09:30', '10:30', '11:30',
    '14:00', '15:00', '16:00', '17:00'
  ];

  // Pre-populate subject from URL if available
  useEffect(() => {
    const subjectParam = searchParams.get('subject');
    if (subjectParam) {
      setLead(l => ({ ...l, subject: subjectParam }));
    }
  }, [searchParams]);

  // Calendar calculations
  const now = new Date();
  const todayStr = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"})).toISOString().split('T')[0];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const formatDateStr = (dayNum: number) => {
    const m = String(month + 1).padStart(2, '0');
    const d = String(dayNum).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const isSlotPast = (dateStr: string, timeStr: string) => {
    const slotDate = new Date(`${dateStr}T${timeStr}:00-03:00`); // Assuming BRT
    const nowSp = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    return slotDate < nowSp;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead.name || !lead.subject) {
      toast.error('Preencha os campos obrigatórios (*).');
      return;
    }
    
    if (lead.returnChannel === 'whatsapp' && !lead.phone) {
      toast.error('Preencha seu WhatsApp.');
      return;
    }
    if (lead.returnChannel === 'email' && !lead.email) {
      toast.error('Preencha seu E-mail.');
      return;
    }

    if (selectedDate && !selectedTime) {
      toast.error('Selecione um horário ou limpe a data selecionada.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Create contact lead record implicitly
      const docRef = await addDoc(collection(db, 'contacts'), {
        name: lead.name,
        email: lead.returnChannel === 'email' ? lead.email : '',
        phone: lead.returnChannel === 'whatsapp' ? lead.phone : '',
        subject: `[${lead.returnChannel.toUpperCase()}] ${lead.subject}`,
        message: lead.message + (selectedDate ? `\n\n[Preferência de Agendamento: ${selectedDate} às ${selectedTime}]` : ''),
        status: 'Pendente',
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });

      toast.success('Solicitação enviada com sucesso! Aguarde nosso contato.');
      setLead({ name: '', returnChannel: 'whatsapp', phone: '', email: '', subject: '', message: '' });
      setSelectedDate('');
      setSelectedTime('');
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao enviar sua solicitação. Tente pelo WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="bg-black min-h-screen pt-24 pb-16 font-sans text-neutral-100"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/30 font-mono">
            Atendimento Exclusivo
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display">
            Fale com o Escritório
          </h1>
          <p className="text-neutral-300 text-lg font-light leading-relaxed">
            Utilize os canais abaixo para dúvidas, análises de viabilidade ou agendamento de consultas jurídicas.
          </p>
          <p className="text-sm text-neutral-400 mt-2">
            As mensagens são respondidas durante nosso horário de funcionamento.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 xl:gap-16">
          
          {/* Left panel: Channels and Calendar */}
          <div className="lg:col-span-5 space-y-8">
            {/* Direct contact channels card */}
            <div className="bg-neutral-900 border border-neutral-850 p-6 sm:p-8 rounded-2xl shadow-sm">
              <h3 className="text-xl font-bold text-white mb-6 font-display">Canais de Atendimento</h3>
              <div className="space-y-6">
                
                <div className="flex flex-col space-y-2">
                  <a 
                    href="https://wa.me/5519999729181?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20atendimento%20da%20Almeida%20Advocacia."
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => (window as any).reportWhatsAppClick?.()}
                    className="flex items-center space-x-3 w-full px-5 py-4 bg-[#19a800] hover:bg-[#138c00] text-white font-bold rounded-xl transition-all shadow-md group"
                  >
                    <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>Iniciar conversa no WhatsApp</span>
                  </a>
                </div>

                <div className="flex items-start space-x-3.5 group">
                  <Phone className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-white font-display">Telefone</h4>
                    <a href="tel:+5519999729181" className="text-neutral-300 mt-0.5 hover:text-emerald-400 transition-colors block">
                      (19) 99972-9181
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5 group">
                  <Mail className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-white font-display">E-mail Institucional</h4>
                    <a href="mailto:contato@almeidaadvocacia.com.br" className="text-neutral-300 mt-0.5 hover:text-emerald-400 transition-colors block">
                      contato@almeidaadvocacia.com.br
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-3.5">
                  <MapPin className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-white font-display">Região de Atuação</h4>
                    <p className="text-neutral-300 mt-0.5 leading-relaxed">
                      Região Metropolitana de Campinas/SP
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3.5">
                  <Clock className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-white font-display">Horário de Funcionamento</h4>
                    <p className="text-neutral-300 mt-0.5 leading-relaxed text-sm">
                      Segunda a Sexta: 08h às 18h<br />
                      Sábados: 09h às 12h<br />
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Calendar Availability Tool */}
            <div className="bg-neutral-900 border border-neutral-850 p-6 sm:p-8 rounded-2xl shadow-sm">
              <div className="flex items-center space-x-3 mb-6">
                <CalendarIcon className="w-6 h-6 text-emerald-500" />
                <h3 className="text-xl font-bold text-white font-display">Preferência de Horário</h3>
              </div>
              <p className="text-sm text-neutral-400 mb-6">O horário solicitado depende de confirmação do escritório.</p>
              
              {/* Calendar controls */}
              <div className="flex items-center justify-between mb-4 border-b border-neutral-800 pb-4">
                <button 
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  <ChevronLeft className="w-4 h-4" /><span className="sr-only">Mês anterior</span>
                </button>
                <span className="text-sm font-bold text-white uppercase tracking-widest font-mono">
                  {monthNames[month]} {year}
                </span>
                <button 
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300"
                >
                  <ChevronRight className="w-4 h-4" /><span className="sr-only">Próximo mês</span>
                </button>
              </div>

              {/* Days header */}
              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['D','S','T','Q','Q','S','S'].map((d, i) => (
                  <div key={i} className="text-[10px] font-bold text-neutral-500">{d}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {[...Array(firstDayOfMonth)].map((_, i) => (
                  <div key={`empty-${i}`} className="h-8"></div>
                ))}
                
                {[...Array(daysInMonth)].map((_, i) => {
                  const dayNum = i + 1;
                  const dateStr = formatDateStr(dayNum);
                  const isPast = dateStr < todayStr;
                  const dayOfWeek = new Date(year, month, dayNum).getDay();
                  const isSunday = dayOfWeek === 0;
                  const isSelected = selectedDate === dateStr;

                  return (
                    <button
                      key={dayNum}
                      type="button"
                      disabled={isPast || isSunday}
                      onClick={() => {
                        setSelectedDate(dateStr);
                        setSelectedTime(''); // Clear time when date changes
                      }}
                      className={`h-8 text-xs rounded transition-all flex items-center justify-center ${
                        isSelected 
                          ? 'bg-emerald-600 text-white font-bold shadow-md ring-2 ring-emerald-400' 
                          : isPast || isSunday
                          ? 'text-neutral-700 bg-neutral-950/40 cursor-not-allowed'
                          : 'bg-black text-neutral-200 border border-neutral-800 hover:border-emerald-500 hover:text-emerald-400'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Time slot picker if a date is selected */}
              {selectedDate && (
                <div className="pt-4 mt-4 border-t border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-neutral-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> Horários para {selectedDate.split('-').reverse().join('/')}:
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {availableTimeSlots.map((slot) => {
                      const past = isSlotPast(selectedDate, slot);
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={past}
                          onClick={() => setSelectedTime(slot)}
                          className={`py-1.5 px-2 text-xs font-mono rounded-lg transition-all border ${
                            selectedTime === slot 
                              ? 'bg-emerald-600 text-white border-emerald-500 font-bold' 
                              : past 
                              ? 'bg-neutral-900 text-neutral-600 border-neutral-800 cursor-not-allowed'
                              : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-700'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate('');
                      setSelectedTime('');
                    }}
                    className="text-[11px] text-neutral-400 hover:text-neutral-200 underline font-mono block text-center w-full pt-1"
                  >
                    Limpar seleção de data
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Lead Form */}
          <div className="lg:col-span-7 bg-neutral-900 border border-neutral-850 p-6 sm:p-10 rounded-2xl shadow-xl h-fit">
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div>
                <label htmlFor="seu nome *" className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Seu Nome *</label>
                <input id="seu nome *"
                  type="text"
                  required
                  value={lead.name}
                  onChange={(e) => setLead({ ...lead, name: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="retorno por *" className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Retorno por *</label>
                <select id="retorno por *"
                    value={lead.returnChannel}
                    onChange={(e) => setLead({ ...lead, returnChannel: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm appearance-none"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">
                    {lead.returnChannel === 'whatsapp' ? 'Número do WhatsApp *' : 'Endereço de E-mail *'}
                  </label>
                  {lead.returnChannel === 'whatsapp' ? (
                    <input
                      type="tel"
                      required
                      value={lead.phone}
                      onChange={(e) => setLead({ ...lead, phone: e.target.value })}
                      placeholder="(19) 90000-0000"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  ) : (
                    <input
                      type="email"
                      required
                      value={lead.email}
                      onChange={(e) => setLead({ ...lead, email: e.target.value })}
                      placeholder="seu@email.com"
                      className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    />
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="assunto ou área *" className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Assunto ou Área *</label>
                <input id="assunto ou área *"
                  type="text"
                  required
                  value={lead.subject}
                  onChange={(e) => setLead({ ...lead, subject: e.target.value })}
                  placeholder="Ex: Inventário, Contratos, etc"
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              {/* Selected date banner in form if picked */}
              {selectedDate && selectedTime && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/60 rounded-xl flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2 text-emerald-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Data sugerida: <strong>{selectedDate.split('-').reverse().join('/')}</strong> às <strong>{selectedTime}</strong></span>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="mensagem breve (opcional)" className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Mensagem Breve (Opcional)</label>
                <textarea id="mensagem breve (opcional)"
                  rows={4}
                  value={lead.message}
                  onChange={(e) => setLead({ ...lead, message: e.target.value })}
                  placeholder="Não envie senhas, dados bancários ou documentos confidenciais neste formulário."
                  className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm mb-2"
                />
                <p className="text-xs text-neutral-400 font-semibold flex items-start gap-1">
                  <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Descreva apenas o assunto geral. Não envie senhas, dados bancários ou documentos confidenciais neste formulário.</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold font-display shadow-lg transition-colors text-sm uppercase tracking-wider block"
              >
                {isSubmitting ? 'Enviando...' : (selectedDate && selectedTime ? `Solicitar atendimento para ${selectedDate.split('-').reverse().join('/')} às ${selectedTime}` : 'Enviar Mensagem')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
