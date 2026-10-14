import React from 'react';
import { ShieldCheck, CalendarRange, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function ThankYouPage() {
  return (
    <div className="bg-black text-neutral-100 min-h-screen flex items-center justify-center py-16 px-4 font-sans text-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-neutral-900 rounded-2xl shadow-xl p-8 border border-neutral-850 space-y-8"
      >
        {/* Checked logo badge */}
        <div className="w-16 h-16 bg-emerald-950 text-emerald-450 rounded-full flex items-center justify-center mx-auto border border-emerald-900/30 shadow-sm">
          <ShieldCheck className="w-8 h-8 text-emerald-500 animate-bounce" />
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Solicitação Recebida!</h1>
          <p className="text-sm text-neutral-400">
            Agradecemos por depositar sua primeira confiança em nossa banca. Seus dados e relatos foram salvos de forma segura e criptografados.
          </p>
        </div>

        {/* Timelines boxes */}
        <div className="bg-black/40 rounded-xl p-5 border border-neutral-850 text-left space-y-4">
          <div className="flex items-start space-x-3.5 text-xs text-neutral-300 leading-relaxed">
            <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white font-display block">Análise de Viabilidade Prática</strong>
              <span>Nossa equipe técnica avaliará seu relato jurídico em até <strong>4 horas úteis</strong> comerciais.</span>
            </div>
          </div>

          <div className="flex items-start space-x-3.5 text-xs text-neutral-300 leading-relaxed">
            <CalendarRange className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-white font-display block">Agendamento de Conferência</strong>
              <span>Entraremos em contato via WhatsApp ou e-mail institucional para confirmar a data e o horário final selecionados.</span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-800 flex flex-col space-y-3">
          <Link
            to="/"
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold font-display shadow-md rounded-lg text-sm transition-colors text-center block"
          >
            Voltar a Página Principal
          </Link>
          <Link 
            to="/artigos"
            className="inline-flex justify-center items-center text-xs font-bold text-emerald-450 hover:text-emerald-350 font-display space-x-1"
          >
            <span>Ler nossos artigos educacionais</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

      </motion.div>
    </div>
  );
}
