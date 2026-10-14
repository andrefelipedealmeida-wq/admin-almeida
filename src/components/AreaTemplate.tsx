import React from 'react';
import { motion } from 'motion/react';
import { ArrowRight, ChevronRight, Scale, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import SEO from './SEO';

interface AreaTemplateProps {
  seoTitle: string;
  seoDescription: string;
  canonical: string;
  title: string;
  subtitle: string;
  description: React.ReactNode;
  highlights: string[];
  image: string;
  icon: React.ElementType;
}

export default function AreaTemplate({
  seoTitle,
  seoDescription,
  canonical,
  title,
  subtitle,
  description,
  highlights,
  image,
  icon: Icon
}: AreaTemplateProps) {
  return (
    <>
      <SEO 
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
      />
      
      <div className="bg-black text-neutral-100 min-h-screen pt-24 pb-16 sm:pt-32 sm:pb-24 font-sans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <Link to="/areas" className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest font-mono">
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  <span>Áreas de Atuação</span>
                </Link>
                <h1 className="text-4xl sm:text-5xl font-bold text-white font-display leading-tight">
                  {title}
                </h1>
                <p className="text-xl text-neutral-300 leading-relaxed border-l-2 border-emerald-600 pl-4">
                  {subtitle}
                </p>
              </div>

              <div className="prose prose-invert prose-emerald max-w-none text-neutral-300 text-base leading-relaxed">
                {description}
              </div>

              <div className="space-y-4 pt-6 border-t border-neutral-850">
                <h2 className="text-lg font-bold text-white font-display">Destaques da Atuação</h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {highlights.map((highlight, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-neutral-300">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-8">
                <a
                  href={`https://wa.me/5519999729181?text=${encodeURIComponent(`Olá, gostaria de informações sobre atendimento em ${title}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => (window as any).reportWhatsAppClick?.()}
                  className="inline-flex items-center justify-center space-x-2 px-8 py-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-all hover:-translate-y-1 w-full sm:w-auto"
                >
                  <span>Agendar atendimento</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right Image/Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-900/20 to-transparent rounded-2xl transform translate-x-4 translate-y-4 border border-emerald-900/30"></div>
              <div className="relative h-[400px] sm:h-[600px] rounded-2xl overflow-hidden border border-neutral-800 bg-neutral-900">
                <img 
                  src={image} 
                  alt={title}
                  className="w-full h-full object-cover filter brightness-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-8 flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center">
                    <Icon className="w-8 h-8 text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
