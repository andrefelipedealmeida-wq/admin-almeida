import React from 'react';
import { Shield, Target, BookOpen, Compass, Award, Heart } from 'lucide-react';
import { motion } from 'motion/react';

export default function About() {
  const values = [
    {
      title: 'Comunicação clara',
      description: 'As orientações são apresentadas em linguagem acessível, com informações relevantes sobre o andamento do caso e os próximos passos.',
      icon: Shield
    },
    {
      title: 'Formação e atualização',
      description: 'A atuação é fundamentada em formação jurídica específica, estudo contínuo da legislação e análise da jurisprudência aplicável a cada matéria.',
      icon: Award
    },
    {
      title: 'Escuta e responsabilidade',
      description: 'Cada atendimento começa pela compreensão cuidadosa dos fatos, dos documentos disponíveis e dos objetivos juridicamente possíveis.',
      icon: Heart
    }
  ];

  const lawyers = [
    {
      name: 'Dr. André Almeida - OAB/SP 525.375',
      role: 'Advogado com atuação em Direito Imobiliário, Inventários e questões civis e patrimoniais.',
      bio: `André Almeida é advogado formado pela Universidade São Francisco e pós-graduado em Direito Imobiliário pela Legale.

Sua formação anterior na área de Análise de Sistemas contribuiu para uma prática profissional orientada pela organização, pela pesquisa e pelo uso responsável de recursos tecnológicos. No escritório, essas ferramentas auxiliam a gestão de documentos, o acompanhamento de processos e a preparação das análises jurídicas, sempre sob supervisão profissional.

Sua atuação é voltada à orientação de pessoas, famílias e empresas em questões que envolvem imóveis, sucessões, contratos e patrimônio, com atenção aos documentos, aos riscos jurídicos e às particularidades de cada caso.`,
      image: "/imagens/sobre.png",
      bullets: [
        'Análise individual do caso',
        'Comunicação clara',
        'Estudo técnico e atualização',
        'Ética e Sigilo Profissional'
      ]
    }
  ];

  return (
    <div className="bg-black text-neutral-100 min-h-screen py-16 sm:py-24 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Header of page */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/30 font-mono">
            Nossa Trajetória
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display">
            Técnica, clareza e responsabilidade
          </h1>
          <p className="text-neutral-300 text-base sm:text-lg">
            O Almeida Advocacia foi estruturado para oferecer orientação jurídica tecnicamente fundamentada, com comunicação acessível e uso responsável de recursos digitais na organização dos atendimentos e processos.
          </p>
        </div>

        {/* Mission Vision Values Grid */}
        <div className="bg-neutral-900/40 rounded-2xl border border-neutral-850 p-8 sm:p-12 mb-24">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-500 border border-emerald-900/20">
                <Compass className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Nossa Missão</h3>
              <p className="text-neutral-300 text-sm leading-relaxed">
                Orientar e representar pessoas e empresas em questões imobiliárias, sucessórias, familiares e patrimoniais, com rigor técnico, clareza e responsabilidade profissional.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-500 border border-emerald-900/20">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Nossa Visão</h3>
              <p className="text-neutral-300 text-sm leading-relaxed">
                Consolidar uma atuação jurídica reconhecida pela consistência do trabalho, pela confiança nas relações profissionais e pela qualidade da comunicação com o cliente.
              </p>
            </div>

            <div className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-500 border border-emerald-900/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white font-display">Nossos Valores</h3>
              <p className="text-neutral-300 text-sm leading-relaxed">
                Ética, independência profissional, estudo contínuo, transparência na comunicação, sigilo e respeito às particularidades de cada caso.
              </p>
            </div>
          </div>
        </div>

        {/* Values and Founders Card list */}
        <div className="mb-24">
          <h2 className="text-2.5xl sm:text-3xl font-bold text-white text-center font-display mb-12">Como conduzimos cada atendimento</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, i) => {
              const Icon = v.icon;
              return (
                <div key={i} className="bg-neutral-900/40 p-6 rounded-xl border border-neutral-850">
                  <div className="w-10 h-10 rounded-xl bg-neutral-950 flex items-center justify-center text-emerald-500 border border-neutral-850 mb-5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-md font-bold text-white font-display mb-2">{v.title}</h3>
                  <p className="text-neutral-300 text-sm leading-relaxed">{v.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Partners list */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/30 font-mono">
              RESPONSÁVEL PELO ESCRITÓRIO
            </span>
            <h2 className="text-3xl font-bold text-white font-display">Advogado Titular</h2>
            <p className="text-neutral-300 text-sm">
              Advogado com atuação em Direito Imobiliário, Inventários e questões civis e patrimoniais.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {lawyers.map((law, index) => (
              <div key={index} className="bg-neutral-900/40 rounded-2xl border border-neutral-850 overflow-hidden shadow-sm flex flex-col md:flex-row">
                <div className="md:w-2/5 h-72 md:h-auto bg-black">
                  <img 
                    src={law.image} 
                    alt={law.name} 
                    className="w-full h-full object-cover filter brightness-[0.8] contrast-[1.05]"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="md:w-3/5 p-6 sm:p-8 flex flex-col justify-between space-y-6 bg-neutral-900/40">
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white font-display">{law.name}</h3>
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide font-mono">{law.role}</p>
                    <div className="text-neutral-300 text-sm leading-relaxed space-y-4 whitespace-pre-line font-light">
                      {law.bio}
                    </div>
                  </div>
                  
                  {/* Bullets from image */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-neutral-850">
                    {law.bullets.map((bullet, bIdx) => (
                      <div key={bIdx} className="flex items-center space-x-2 text-xs text-neutral-300">
                        <div className="w-5 h-5 rounded-full bg-emerald-950 flex items-center justify-center border border-emerald-900/30">
                          <span className="text-emerald-500 text-[10px]">✓</span>
                        </div>
                        <span className="font-medium">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
