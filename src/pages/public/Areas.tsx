import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Scale, 
  Heart, 
  ArrowRight,
  FileText, 
  Home, 
  Briefcase,
  Award
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Areas() {
  const areas = [
    {
      id: 'direito-imobiliario',
      title: 'Direito Imobiliário',
      icon: Home,
      shortDesc: 'Regularização de imóveis, usucapião, análise de contratos, due diligence e questões patrimoniais.',
      color: 'from-emerald-50 to-emerald-100/50',
    },
    {
      id: 'inventario',
      title: 'Inventários e Partilhas',
      icon: FileText,
      shortDesc: 'Orientação e acompanhamento de inventários, partilhas e demais providências relacionadas à sucessão.',
      color: 'from-emerald-50 to-emerald-100/50',
    },
    {
      id: 'familia-e-sucessoes',
      title: 'Direito de Família',
      icon: Users,
      shortDesc: 'Atuação sensível e técnica em divórcios, pensão alimentícia, guarda e uniões estáveis.',
      color: 'from-blue-50 to-blue-100/50',
    },
    {
      id: 'direito-civil-e-contratos',
      title: 'Direito Civil e Contratos',
      icon: Briefcase,
      shortDesc: 'Prevenção de litígios, elaboração de contratos, indenizações e atuação contenciosa em geral.',
      color: 'from-amber-50 to-amber-100/50',
    },
    {
      id: 'registro-de-marcas',
      title: 'Registro de Marcas',
      icon: Award,
      shortDesc: 'Proteção legal e registro de marcas perante o INPI, garantindo exclusividade de uso.',
      color: 'from-purple-50 to-purple-100/50',
    }
  ];

  return (
    <div className="bg-black text-neutral-100 min-h-screen pt-24 pb-16 sm:pt-32 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-900/30 font-mono">
            Nossas Especialidades
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold text-white font-display">
            Áreas de Atuação
          </h1>
          <p className="text-neutral-300 text-base sm:text-lg">
            Prestamos assessoria consultiva e contenciosa focada na resolução eficiente de demandas e proteção do patrimônio.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {areas.map((area, index) => {
            const Icon = area.icon;
            return (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-neutral-900 border border-neutral-850 p-8 rounded-2xl flex flex-col h-full hover:border-emerald-500/50 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-black border border-neutral-800 flex items-center justify-center mb-6 group-hover:border-emerald-500/50 transition-colors">
                  <Icon className="w-6 h-6 text-emerald-500" />
                </div>
                
                <h3 className="text-xl font-bold text-white font-display mb-4">
                  {area.title}
                </h3>
                
                <p className="text-neutral-400 text-sm leading-relaxed mb-8 flex-grow">
                  {area.shortDesc}
                </p>

                <Link
                  to={`/areas/${area.id}`}
                  className="inline-flex items-center space-x-2 text-emerald-500 font-bold text-sm hover:text-emerald-400 transition-colors uppercase tracking-wider font-display mt-auto"
                >
                  <span>Saber mais</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
