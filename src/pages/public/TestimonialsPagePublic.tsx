import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Check, Sparkles, UserCheck } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Testimonial } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

export default function TestimonialsPagePublic() {
  const navigate = useNavigate();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowNewTestimonials, setAllowNewTestimonials] = useState<boolean>(true);
  const [showTestimonials, setShowTestimonials] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTestimonial, setNewTestimonial] = useState({
    name: '',
    role: 'Cliente - Direito Civil',
    text: '',
    rating: 5
  });

  // Pull with real-time onSnapshot from Firestore!
  useEffect(() => {
    const q = query(collection(db, 'testimonials'), orderBy('createdAt', 'desc'));
    const unsubscribeTestimonials = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Testimonial));
      // Show only approved ones on the public side!
      setTestimonials(items.filter(item => item.approved));
      setLoading(false);
    }, (error) => {
      console.info("Information: Notifying testimonials state sync bypass:", error?.message || error);
      setLoading(false);
    });

    const docRef = doc(db, 'settings', 'siteConfig');
    const unsubscribeConfig = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.allowNewTestimonials === 'boolean') {
          setAllowNewTestimonials(data.allowNewTestimonials);
        }
        if (typeof data.showTestimonials === 'boolean') {
          setShowTestimonials(data.showTestimonials);
          
        }
      }
    });
  return () => {
      unsubscribeTestimonials();
      unsubscribeConfig();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestimonial.name || !newTestimonial.text) {
      toast.error('Preencha seu nome e conte-nos seu testemunho.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'testimonials'), {
        name: newTestimonial.name,
        role: newTestimonial.role,
        text: newTestimonial.text,
        rating: newTestimonial.rating,
        approved: false, // requires admin approving inside cases pages or profile
        date: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      });

      toast.success('Depoimento submetido com sucesso! Será publicado após validação administrativa.');
      setNewTestimonial({
        name: '',
        role: 'Cliente - Direito Civil',
        text: '',
        rating: 5
      });
    } catch (err) {
      console.info("Testimonial submit information (handled):", err);
      toast.error('Ocorreu um erro ao enviar seu depoimento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  
  

    
  if (!showTestimonials) {
    return (
      <div className="bg-black min-h-[60vh] flex items-center justify-center text-center px-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-4">Página indisponível</h1>
          <p className="text-neutral-400 mb-8">Esta seção está temporariamente desativada.</p>
          <Link to="/" className="text-emerald-500 hover:text-emerald-400 font-bold">Voltar para o início</Link>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-black text-neutral-100 min-h-screen py-16 sm:py-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/30 font-mono">
            Transparência & Opinião
          </span>
          <h1 className="text-4xl font-bold text-white font-display">Mural de Clientes Satisfeitos</h1>
          <p className="text-neutral-300">
            Acreditamos na verdade. Veja relatos espontâneos de clientes reais que obtiveram liberação de contratos, justiça salarial e segurança familiar.
          </p>
        </div>

        {/* Split Grid: Left is testimonials wall, Right is form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Testimonies list */}
          <div className="lg:col-span-7 space-y-6">
            <h3 className="text-lg font-bold text-white font-display mb-6 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              <span>Depoimentos Compartilhados ({testimonials.length})</span>
            </h3>

            {loading ? (
              <div className="text-center py-12 text-neutral-400">
                Carregando opiniões em tempo real...
              </div>
            ) : testimonials.length > 0 ? (
              <div className="space-y-6">
                <AnimatePresence>
                  {testimonials.map((test, index) => (
                    <motion.div
                      key={test.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-neutral-900 rounded-xl border border-neutral-850 p-6 shadow-xl flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <div className="flex space-x-0.5">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${
                                  i < test.rating 
                                    ? 'fill-emerald-500 text-emerald-500' 
                                    : 'text-neutral-800'
                                }`} 
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-neutral-450 font-mono">{test.date}</span>
                        </div>
                        <p className="text-neutral-300 text-sm italic leading-relaxed">
                          "{test.text}"
                        </p>
                      </div>
                      <div className="flex items-center space-x-3 pt-4 mt-4 border-t border-neutral-800">
                        <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-900/30 flex items-center justify-center font-bold text-xs uppercase">
                          {test.name.substring(0,2)}
                        </div>
                        <div>
                          <h4 className="text-white font-bold text-xs sm:text-sm font-display mb-0.5">{test.name}</h4>
                          <p className="text-[11px] text-neutral-400">{test.role}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-neutral-900 border border-neutral-850 p-12 rounded-xl text-center text-neutral-400">
                Ainda não há outros depoimentos publicados. Seja o primeiro a expor seu caso!
              </div>
            )}
          </div>

          {/* Form */}
          {allowNewTestimonials && (
            <div className="lg:col-span-5 bg-neutral-900 border border-neutral-850 p-6 sm:p-8 rounded-2xl shadow-xl sticky top-24">
              <h3 className="text-lg font-bold text-white font-display mb-2 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                <span>Avaliar Nosso Atendimento</span>
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                Sua avaliação espontânea é de suma importância para darmos continuidade a um atendimento sério, polido e humanizado.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Nome Completo (ou Abreviação) *</label>
                  <input 
                    type="text" 
                    value={newTestimonial.name}
                    onChange={(e) => setNewTestimonial({...newTestimonial, name: e.target.value})}
                    required
                    placeholder="Ex: Julio Cesar S."
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Tipo de Consulta Atendida</label>
                  <select
                    value={newTestimonial.role}
                    onChange={(e) => setNewTestimonial({...newTestimonial, role: e.target.value})}
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  >
                    <option value="Cliente - Direito Civil">Cliente - Direito Civil</option>
                    <option value="Cliente - Inventário e Partilha">Cliente - Inventário e Partilha</option>
                    <option value="Cliente - Direito de Família">Cliente - Direito de Família</option>
                    <option value="Cliente - Outros Assuntos">Cliente - Outros Assuntos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Nota de Avaliação *</label>
                  <div className="flex items-center space-x-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewTestimonial({...newTestimonial, rating: star})}
                        className="focus:outline-none transition-transform active:scale-110"
                      >
                        <Star 
                          className={`w-7 h-7 ${
                            star <= newTestimonial.rating 
                              ? 'fill-emerald-500 text-emerald-500' 
                              : 'text-neutral-800'
                          }`} 
                        />
                      </button>
                    ))}
                    <span className="text-xs text-neutral-450 font-mono font-bold ml-2">( {newTestimonial.rating} /  5)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-450 uppercase tracking-widest mb-1.5 font-mono">Seu Testemunho / Relato Real *</label>
                  <textarea 
                    rows={4}
                    value={newTestimonial.text}
                    onChange={(e) => setNewTestimonial({...newTestimonial, text: e.target.value})}
                    required
                    placeholder="Escreva como o escritório lhe ajudou em seu processo técnico de forma amigável..."
                    className="w-full px-4 py-2.5 rounded-lg border border-neutral-800 bg-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold font-display shadow-lg transition-colors text-sm uppercase tracking-wider block"
                >
                  {isSubmitting ? 'Enviando...' : 'Publicar no Mural'}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
