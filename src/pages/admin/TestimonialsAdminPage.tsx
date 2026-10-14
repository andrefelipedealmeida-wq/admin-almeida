import React, { useState, useEffect } from 'react';
import { 
  Star, 
  MessageSquareQuote, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Plus, 
  Search, 
  Filter, 
  Check, 
  X, 
  Clock, 
  Sparkles,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { Testimonial } from '../../types';
import { toast } from 'sonner';

export default function TestimonialsAdminPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal States
  const [isAdding, setIsAdding] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    role: 'Cliente - Direito Civil',
    text: '',
    rating: 5,
    approved: true
  });

  // Fetch all testimonials in real-time
  useEffect(() => {
    const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Testimonial));
      setTestimonials(items);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching testimonials:", error);
      toast.error("Erro ao carregar depoimentos do banco de dados.");
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Filtered testimonials
  const filteredTestimonials = testimonials.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.text.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filter === 'pending') return !item.approved;
    if (filter === 'approved') return item.approved;
    return true;
  });

  const pendingCount = testimonials.filter(t => !t.approved).length;
  const approvedCount = testimonials.filter(t => t.approved).length;

  // Toggle approval state
  const handleToggleApprove = async (testimonial: Testimonial) => {
    try {
      const newApprovedState = !testimonial.approved;
      await updateDoc(doc(db, 'testimonials', testimonial.id), {
        approved: newApprovedState
      });
      toast.success(newApprovedState 
        ? `Depoimento de "${testimonial.name}" aprovado e publicado no site!` 
        : `Depoimento de "${testimonial.name}" removido da exibição pública.`
      );
    } catch (err) {
      console.error("Error toggling approval:", err);
      toast.error("Erro ao atualizar status do depoimento.");
    }
  };

  // Open modal for editing
  const handleStartEdit = (t: Testimonial) => {
    setEditingTestimonial(t);
    setFormData({
      name: t.name,
      role: t.role,
      text: t.text,
      rating: t.rating || 5,
      approved: t.approved
    });
    setIsAdding(true);
  };

  // Save new or edited testimonial
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.text.trim()) {
      toast.error("Por favor, preencha o nome do cliente e o depoimento.");
      return;
    }

    try {
      if (editingTestimonial) {
        await updateDoc(doc(db, 'testimonials', editingTestimonial.id), {
          name: formData.name,
          role: formData.role,
          text: formData.text,
          rating: formData.rating,
          approved: formData.approved,
          userId: auth.currentUser?.uid || '',
          createdBy: auth.currentUser?.email || ''
        });
        toast.success("Depoimento atualizado com sucesso!");
      } else {
        await addDoc(collection(db, 'testimonials'), {
          name: formData.name,
          role: formData.role,
          text: formData.text,
          rating: formData.rating,
          approved: formData.approved,
          date: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString(),
          userId: auth.currentUser?.uid || '',
          createdBy: auth.currentUser?.email || ''
        });
        toast.success("Novo depoimento registrado com sucesso!");
      }

      // Reset
      setIsAdding(false);
      setEditingTestimonial(null);
      setFormData({
        name: '',
        role: 'Cliente - Direito Civil',
        text: '',
        rating: 5,
        approved: true
      });
    } catch (err) {
      console.error("Error saving testimonial:", err);
      toast.error("Ocorreu um erro ao salvar o depoimento.");
    }
  };

  // Delete testimonial
  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'testimonials', id));
      toast.success("Depoimento excluído com sucesso.");
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Error deleting testimonial:", err);
      toast.error("Erro ao excluir o depoimento.");
    }
  };

  return (
    <div className="space-y-6 text-neutral-100 font-cambria">
      
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-850 p-6 rounded-2xl border border-neutral-800 shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-900/40">
              Contas Master
            </span>
            {pendingCount > 0 && (
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/40 animate-pulse">
                {pendingCount} Pendente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-display text-white mt-1.5 flex items-center space-x-2">
            <MessageSquareQuote className="w-6 h-6 text-emerald-500" />
            <span>Gestão de Depoimentos & Avaliações</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Valide, publique, edite ou cadastre depoimentos e avaliações de clientes exibidos no site do escritório.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTestimonial(null);
            setFormData({
              name: '',
              role: 'Cliente - Direito Civil',
              text: '',
              rating: 5,
              approved: true
            });
            setIsAdding(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold font-display shadow-md shadow-emerald-500/10 flex items-center space-x-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Depoimento</span>
        </button>
      </div>

      {/* Counter Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <button
          onClick={() => setFilter('all')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === 'all' 
              ? 'bg-neutral-850 border-emerald-500/40 shadow-sm' 
              : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-mono">Total de Depoimentos</span>
            <MessageSquareQuote className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-display">{testimonials.length}</div>
          <p className="text-[11px] text-neutral-500 mt-0.5">Todos os registros cadastrados</p>
        </button>

        <button
          onClick={() => setFilter('pending')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === 'pending' 
              ? 'bg-amber-950/20 border-amber-500/40 shadow-sm' 
              : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">Aguardando Validação</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 mt-2 font-display">{pendingCount}</div>
          <p className="text-[11px] text-amber-400/80 mt-0.5">Submetidos por visitantes do site</p>
        </button>

        <button
          onClick={() => setFilter('approved')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            filter === 'approved' 
              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-sm' 
              : 'bg-neutral-900 border-neutral-800 hover:bg-neutral-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">Publicados no Site</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 mt-2 font-display">{approvedCount}</div>
          <p className="text-[11px] text-emerald-400/80 mt-0.5">Visíveis na página pública /depoimentos</p>
        </button>

      </div>

      {/* Search Bar & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-neutral-900 p-4 rounded-2xl border border-neutral-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, área ou relato..."
            className="w-full pl-10 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-neutral-500 hidden sm:inline" />
          <div className="flex bg-neutral-950 p-1 rounded-xl border border-neutral-800 w-full sm:w-auto justify-center">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center space-x-1 ${
                filter === 'pending' ? 'bg-amber-900/40 text-amber-300 border border-amber-500/30' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span>Pendentes</span>
              {pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              )}
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === 'approved' ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-500/30' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Publicados
            </button>
          </div>
        </div>
      </div>

      {/* Testimonials Grid / List */}
      {loading ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400 space-y-3 font-mono text-xs">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p>Sincronizando depoimentos de clientes com o banco de dados...</p>
        </div>
      ) : filteredTestimonials.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center text-neutral-400 space-y-3">
          <MessageSquareQuote className="w-10 h-10 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">Nenhum depoimento encontrado</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchTerm ? 'Sua busca não retornou nenhum registro.' : 'Ainda não há depoimentos nesta categoria de filtro.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTestimonials.map((t) => (
            <div 
              key={t.id}
              className={`bg-neutral-900 border rounded-2xl p-5 space-y-4 flex flex-col justify-between transition-all ${
                t.approved 
                  ? 'border-neutral-800 hover:border-emerald-500/30' 
                  : 'border-amber-500/30 bg-amber-950/10'
              }`}
            >
              <div className="space-y-3">
                {/* Header info */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white font-display flex items-center space-x-2">
                      <span>{t.name}</span>
                    </h3>
                    <p className="text-xs text-emerald-400 font-medium mt-0.5">{t.role}</p>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {t.approved ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] uppercase font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        <span>Publicado</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[10px] uppercase font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60 px-2 py-0.5 rounded-full animate-pulse">
                        <Clock className="w-3 h-3" />
                        <span>Pendente</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Star rating */}
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className={`w-3.5 h-3.5 ${star <= (t.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'}`} 
                    />
                  ))}
                  <span className="text-[10px] font-mono text-neutral-500 ml-1">
                    ({t.rating || 5}.0)
                  </span>
                </div>

                {/* Relato / Text */}
                <p className="text-xs text-neutral-300 italic leading-relaxed bg-neutral-950/50 p-3.5 rounded-xl border border-neutral-800/80">
                  "{t.text}"
                </p>
              </div>

              {/* Footer Actions */}
              <div className="pt-3 border-t border-neutral-800/60 flex items-center justify-between text-xs font-sans">
                <span className="text-[10px] font-mono text-neutral-500">
                  {t.date ? `Data: ${t.date}` : 'Registrado recentemente'}
                </span>

                <div className="flex items-center space-x-2">
                  {/* Approve / Reject Toggle */}
                  <button
                    onClick={() => handleToggleApprove(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer ${
                      t.approved 
                        ? 'bg-neutral-800 hover:bg-neutral-750 text-neutral-300' 
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                    }`}
                    title={t.approved ? "Ocultar do site público" : "Aprovar e publicar no site"}
                  >
                    {t.approved ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Ocultar</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Aprovar & Publicar</span>
                      </>
                    )}
                  </button>

                  {/* Edit button */}
                  <button
                    onClick={() => handleStartEdit(t)}
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Editar depoimento"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  {/* Delete button */}
                  <button
                    onClick={() => setDeleteConfirmId(t.id)}
                    className="p-1.5 bg-neutral-800 hover:bg-red-950/60 text-neutral-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                    title="Excluir depoimento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form for Add/Edit */}
      {isAdding && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-800">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                  <MessageSquareQuote className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-white font-display">
                  {editingTestimonial ? 'Editar Depoimento' : 'Novo Depoimento Manual'}
                </h2>
              </div>
              <button
                onClick={() => setIsAdding(false)}
                className="p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block text-neutral-400 font-mono font-bold uppercase text-[10px]">Nome do Cliente / Depoente *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Carlos Eduardo de Sousa"
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-400 font-mono font-bold uppercase text-[10px]">Qualificação / Área de Atuação</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Cliente - Direito Civil">Cliente - Direito Civil</option>
                  <option value="Cliente - Inventários e Partilha">Cliente - Inventários e Partilha</option>
                  <option value="Cliente - Direito de Família">Cliente - Direito de Família</option>
                  <option value="Empresa Parceira / Assessoria">Empresa Parceira / Assessoria</option>
                  <option value="Outros">Outros</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-400 font-mono font-bold uppercase text-[10px]">Avaliação em Estrelas (1 a 5)</label>
                <div className="flex items-center space-x-2 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFormData({ ...formData, rating: star })}
                      className="p-1 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={`w-5 h-5 ${star <= formData.rating ? 'fill-amber-400 text-amber-400' : 'text-neutral-700'}`} />
                    </button>
                  ))}
                  <span className="text-xs font-mono text-neutral-400 ml-2">{formData.rating} de 5 Estrelas</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-neutral-400 font-mono font-bold uppercase text-[10px]">Depoimento / Relato de Experiência *</label>
                <textarea
                  required
                  rows={4}
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="Escreva a avaliação do cliente sobre o atendimento..."
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="approved_check"
                  checked={formData.approved}
                  onChange={(e) => setFormData({ ...formData, approved: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="approved_check" className="text-neutral-300 font-medium cursor-pointer">
                  Publicar imediatamente no site público (`/depoimentos`)
                </label>
              </div>

              <div className="pt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="w-1/2 py-2.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors shadow-md shadow-emerald-500/10 cursor-pointer"
                >
                  {editingTestimonial ? 'Salvar Alterações' : 'Cadastrar Depoimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center">
            <div className="w-12 h-12 bg-red-950/60 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white font-display">Excluir Depoimento?</h3>
              <p className="text-xs text-neutral-400">
                Esta ação é irreversível e removerá este depoimento do banco de dados e da exibição do site.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="w-1/2 py-2 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="w-1/2 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
