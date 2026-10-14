import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Scale, 
  Users, 
  FileText, 
  CheckCircle, 
  Star, 
  ArrowRight, 
  Calendar, 
  Clock, 
  MapPin, 
  Phone,
  Bookmark,
  Activity,
  Award,
  MessageSquare,
  Home as HomeIcon,
  Briefcase
} from 'lucide-react';
import { collection, getDocs, addDoc, query, limit, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Article, Testimonial } from '../../types';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      {/* 1. Hero Section - Apresentação objetiva, região e contato. */}
      <section className="relative min-h-[70vh] sm:min-h-[85vh] flex items-center overflow-hidden py-16 lg:py-32 border-b border-neutral-900 bg-black">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter brightness-[0.4] contrast-[1.1]"
          style={{ 
            backgroundImage: `url('/imagens/index.png')`
          }} 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              className="space-y-6 lg:col-span-9"
            >
              <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-900/30 font-mono">
                <MapPin className="w-3.5 h-3.5" />
                <span>Região Metropolitana de Campinas/SP</span>
              </span>
              
              <h1 className="text-4xl sm:text-5xl lg:text-[64px] font-black text-white leading-[1.1] tracking-tight font-display">
                Atuação em Direito Imobiliário, Inventários e Direito de Família.
              </h1>
              
              <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-2xl font-light">
                Orientação jurídica com análise individual do caso e comunicação clara.
              </p>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <a
                  href="https://wa.me/5519999729181?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20atendimento%20da%20Almeida%20Advocacia."
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => (window as any).reportWhatsAppClick?.()}
                  className="group px-7 py-4 bg-[#19a800] hover:bg-[#138c00] text-white font-extrabold text-xs uppercase tracking-widest flex items-center justify-center space-x-2.5 transition-all duration-300 rounded"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Contato pelo WhatsApp</span>
                </a>
                <Link
                  to="/areas"
                  className="px-7 py-4 bg-transparent border border-neutral-700 hover:border-neutral-500 hover:bg-white/5 text-white font-extrabold text-xs uppercase tracking-widest text-center transition-colors duration-300 rounded"
                >
                  Conheça as áreas de atuação
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. Resumo das cinco áreas */}
      <section className="py-20 bg-neutral-950 border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white font-display mb-4">Áreas de Atuação</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Nossa atuação abrange as principais questões do direito privado, com foco na proteção patrimonial e familiar.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link to="/areas/direito-imobiliario" className="block group">
              <div className="bg-black border border-neutral-800 p-8 rounded-xl hover:border-emerald-500/50 transition-colors h-full">
                <HomeIcon className="w-8 h-8 text-emerald-500 mb-6" />
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">Direito Imobiliário</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">Regularização de imóveis, usucapião, contratos de compra e venda, e assessoria em leilões.</p>
              </div>
            </Link>
            <Link to="/areas/inventario" className="block group">
              <div className="bg-black border border-neutral-800 p-8 rounded-xl hover:border-emerald-500/50 transition-colors h-full">
                <FileText className="w-8 h-8 text-emerald-500 mb-6" />
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">Inventários e Partilhas</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">Condução de inventários judiciais e extrajudiciais, testamentos e planejamento sucessório.</p>
              </div>
            </Link>
            <Link to="/areas/familia-e-sucessoes" className="block group">
              <div className="bg-black border border-neutral-800 p-8 rounded-xl hover:border-emerald-500/50 transition-colors h-full">
                <Users className="w-8 h-8 text-emerald-500 mb-6" />
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">Direito de Família</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">Divórcio, pensão alimentícia, regulamentação de guarda e reconhecimento de união estável.</p>
              </div>
            </Link>
            <Link to="/areas/direito-civil-e-contratos" className="block group">
              <div className="bg-black border border-neutral-800 p-8 rounded-xl hover:border-emerald-500/50 transition-colors h-full">
                <Scale className="w-8 h-8 text-emerald-500 mb-6" />
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">Direito Civil e Contratos</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">Elaboração e revisão de contratos, responsabilidade civil e contencioso cível geral.</p>
              </div>
            </Link>
            <Link to="/areas/registro-de-marcas" className="block group">
              <div className="bg-black border border-neutral-800 p-8 rounded-xl hover:border-emerald-500/50 transition-colors h-full">
                <Award className="w-8 h-8 text-emerald-500 mb-6" />
                <h3 className="text-lg font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">Registro de Marcas</h3>
                <p className="text-sm text-neutral-400 leading-relaxed">Busca de viabilidade, depósito no INPI, acompanhamento processual e proteção do nome comercial.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Apresentação breve do advogado responsável */}
      <section className="py-20 bg-black border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="aspect-[4/5] rounded-xl overflow-hidden max-w-md mx-auto">
                <img 
                  src="/imagens/sobre.png" 
                  alt="Dr. André Almeida" 
                  className="w-full h-full object-cover grayscale opacity-90"
                  onError={(e) => e.currentTarget.style.display = 'none'}
                />
              </div>
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <h2 className="text-3xl font-bold text-white font-display">Dr. André Almeida</h2>
              <p className="text-emerald-500 font-mono text-sm uppercase tracking-widest">Advogado Titular <span className="text-emerald-500/50 mx-2">|</span> OAB/SP 525.375</p>
              <p className="text-neutral-300 leading-relaxed">
                Advogado formado pela Universidade São Francisco e pós-graduado em Direito Imobiliário pela Legale.
              </p>
              <p className="text-neutral-300 leading-relaxed">
                Sua atuação é voltada à orientação de pessoas, famílias e empresas em questões que envolvem imóveis, sucessões, contratos e patrimônio, com atenção aos documentos, aos riscos jurídicos e às particularidades de cada caso.
              </p>
              <ul className="space-y-3 pt-4 text-sm text-neutral-400">
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <span>Análise individual do caso e estudo técnico contínuo.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <span>Comunicação clara e acessível em cada etapa.</span>
                </li>
                <li className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-1 shrink-0" />
                  <span>Ética, independência e sigilo profissional absoluto.</span>
                </li>
              </ul>
              <div className="pt-4">
                <Link to="/sobre" className="inline-flex items-center space-x-2 text-emerald-500 hover:text-emerald-400 font-bold transition-colors text-sm uppercase tracking-wider font-display">
                  <span>Conhecer a trajetória</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Explicação de como funciona o primeiro atendimento */}
      <section className="py-20 bg-neutral-950 border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white font-display mb-4">Como funciona o atendimento</h2>
            <p className="text-neutral-400 max-w-2xl mx-auto">
              Nosso processo é estruturado para garantir que sua questão seja compreendida e analisada com responsabilidade desde o primeiro contato.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-emerald-950 border border-emerald-900/50 rounded-full flex items-center justify-center text-emerald-500 font-bold font-mono">1</div>
              <h3 className="font-bold text-white">Contato Inicial</h3>
              <p className="text-sm text-neutral-400">Você entra em contato via WhatsApp ou formulário relatando brevemente sua demanda.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-emerald-950 border border-emerald-900/50 rounded-full flex items-center justify-center text-emerald-500 font-bold font-mono">2</div>
              <h3 className="font-bold text-white">Triagem</h3>
              <p className="text-sm text-neutral-400">Realizamos uma verificação prévia de viabilidade e adequação à nossa área de atuação.</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-emerald-950 border border-emerald-900/50 rounded-full flex items-center justify-center text-emerald-500 font-bold font-mono">3</div>
              <h3 className="font-bold text-white">Agendamento</h3>
              <p className="text-sm text-neutral-400">Havendo viabilidade, propomos datas e horários para uma consulta jurídica (presencial ou online).</p>
            </div>
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto bg-emerald-950 border border-emerald-900/50 rounded-full flex items-center justify-center text-emerald-500 font-bold font-mono">4</div>
              <h3 className="font-bold text-white">Consulta</h3>
              <p className="text-sm text-neutral-400">Reunião dedicada ao seu caso para análise profunda, orientação e plano de ação.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Contato e horários */}
      <section className="py-20 bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <h2 className="text-3xl font-bold text-white font-display">Pronto para buscar orientação?</h2>
          <p className="text-neutral-400">
            Nossa equipe atende de Segunda a Sexta, das 08h às 18h, e Sábados das 09h às 12h.
            O atendimento presencial e online ocorre mediante agendamento prévio.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <a
              href="https://wa.me/5519999729181?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20o%20atendimento%20da%20Almeida%20Advocacia."
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => (window as any).reportWhatsAppClick?.()}
              className="group px-8 py-4 bg-[#19a800] hover:bg-[#138c00] text-white font-bold rounded-lg flex items-center justify-center space-x-3 transition-colors shadow-lg"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Chamar no WhatsApp</span>
            </a>
            <Link
              to="/contato"
              className="group px-8 py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-lg flex items-center justify-center space-x-3 transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span>Usar Formulário</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
