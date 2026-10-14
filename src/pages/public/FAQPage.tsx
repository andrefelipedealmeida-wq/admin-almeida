import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { HelpCircle, ChevronDown, Scale, PhoneCall, MailCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showFaq, setShowFaq] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const docRef = doc(db, 'settings', 'siteConfig');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.showFaq === 'boolean') {
          setShowFaq(data.showFaq);
          
        }
      }
    });
  return () => unsubscribe();
  }, [navigate]);

  const faqs = [
    {
      q: 'Qual é o prazo para propor uma Ação de Indenização por Danos Materiais ou Morais?',
      a: 'Pelo Código Civil brasileiro (art. 206, § 3º, V), a pretensão de reparação civil prescreve em 3 (três) anos contados da data da ocorrência do dano ou do conhecimento do fato lesivo.'
    },
    {
      q: 'Quanto tempo demora um Inventário Extrajudicial em Cartório?',
      a: 'O inventário extrajudicial, realizado por escritura pública em tabelionato de notas, é extremamente ágil se comparado ao judicial. Se todos os herdeiros forem maiores de idade, concordes e os impostos (ITCMD) estiverem quitados, a escritura pública de partilha pode ser concluída e assinada em um período estimado de 30 a 60 dias.'
    },
    {
      q: 'Como é calculado o valor da pensão alimentícia?',
      a: 'O valor do benefício é determinado pelo binômio Necessidade x Possibilidade (art. 1.694, § 1º, do Código Civil). Avalia-se a necessidade do alimentando (despesas com moradia, escola, vestuário, plano de saúde, alimentação) versus a possibilidade financeira de quem pagará. Não existe o mito de 30% fixos; o juiz equaciona as receitas de ambos os genitores.'
    },
    {
      q: 'Quais documentos iniciais preciso para um caso de Divórcio?',
      a: 'Os documentos básicos para ingressar com ação de divórcio são: Certidão de Casamento atualizada, RG e CPF de ambos, Comprovante de Residência, Certidão de Nascimento dos filhos menores (se houver), lista e certidão de propriedade dos bens adquiridos na constância da união e comprovantes de rendimento.'
    },
    {
      q: 'O escritório cobra consulta inicial presencial ou por vídeo?',
      a: 'Para conferir maior viabilidade e conveniência, realizamos uma consulta de triagem e viabilidade técnica preliminar sem custo de forma remota via formulários e WhatsApp. Consultas aprofundadas com parecer escrito ou planejamento sucessório minucioso seguem a tabela recomendada de honorários profissionais.'
    }
  ];

  return (
    <div className="bg-black text-neutral-100 min-h-screen py-16 sm:py-24 font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/30 font-mono">
            Dúvidas Frequentes
          </span>
          <h1 className="text-4xl font-bold text-white font-display">Perguntas Comuns de nossos Clientes</h1>
          <p className="text-neutral-300">
            Abaixo respondemos de forma direta e sem rodeios as dúvidas jurídicas mais frequentes recebidas em nossa secretaria.
          </p>
        </div>

        {/* Collapsible Accordion Grid */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            
  

    
  if (!showFaq) {
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
              <div 
                key={index} 
                className="bg-neutral-900 border border-neutral-850 rounded-xl overflow-hidden shadow-sm hover:border-emerald-600 transition-all"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex justify-between items-center text-left focus:outline-none focus:bg-neutral-950/50"
                >
                  <span className="font-bold text-white text-sm sm:text-base font-display flex items-center space-x-3 pr-4">
                    <span className="text-emerald-500 italic">Q.</span>
                    <span>{faq.q}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-500' : ''} flex-shrink-0`} />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden border-t border-neutral-850 bg-black/40"
                    >
                      <div className="px-6 py-5 text-xs sm:text-sm text-neutral-350 leading-relaxed font-sans border-l-4 border-emerald-700">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Need more block */}
        <div className="mt-16 bg-neutral-900 border border-neutral-850 p-8 rounded-2xl shadow-xl text-center space-y-6">
          <HelpCircle className="w-12 h-12 text-emerald-500 mx-auto" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white font-display">Ainda sobrou alguma dúvida ou quer agendar?</h3>
            <p className="text-neutral-400 text-xs sm:text-sm max-w-lg mx-auto">
              Como cada caso cível ou de família possui suas particularidades, o ideal é agendar uma conversa dedicada por telefone com nossa secretaria para darmos um direcionamento correto.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/contato"
              className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold font-display shadow-md transition-colors text-sm rounded-lg"
            >
              Falar com Assistente Jurídico
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
