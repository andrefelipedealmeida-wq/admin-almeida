import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Scale, Shield, Phone, Mail, Award, Clock, ChevronDown, Lock, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PublicLayout() {
  const [isOpen, setIsOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const primaryNav = [
    { name: 'INÍCIO', path: '/' },
    { name: 'SOBRE', path: '/sobre' },
    { name: 'ÁREAS', path: '/areas' },
    { name: 'CONTATO', path: '/contato' },
    { name: 'ARTIGOS', path: '/artigos' },
  ];

  return (
    <div className="bg-black text-neutral-100 min-h-screen flex flex-col font-sans">
      {/* Top Banner Contact bar */}
      <div className="bg-neutral-950 text-neutral-300 text-xs py-2 px-4 border-b border-neutral-800 hidden sm:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <span className="flex items-center space-x-1">
              <Phone className="w-3.5 h-3.5 text-emerald-500" />
              <span>(19) 99972-9181</span>
            </span>
            <span className="flex items-center space-x-1">
              <Mail className="w-3.5 h-3.5 text-emerald-500" />
              <span>andre@advogadoalmeida.com.br</span>
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Seg - Sex, 08h às 18h | Sáb, 09h às 12h</span>
            </span>
          </div>
        </div>
      </div>

      {/* Primary Header */}
      <header className="bg-black/90 backdrop-blur-md sticky top-0 z-50 border-b border-neutral-900 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3.5 group">
              <div className="relative flex-shrink-0">
                <img 
                  src="/imagens/logo.png" 
                  alt="Almeida Advocacia Logo" 
                  className="w-12 h-12 object-contain transition-transform duration-300 group-hover:scale-105" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex flex-col select-none leading-none">
                <span className="text-lg font-black text-white tracking-[0.25em] font-cambria">
                  ALMEIDA
                </span>
                <span className="text-xs font-bold text-emerald-500 tracking-[0.28em] font-cambria mt-1.5">
                  ADVOCACIA
                </span>
              </div>
            </Link>

            {/* Desktop Nav precisely mimicking screenshot menu */}
            <nav className="hidden lg:flex items-center space-x-7 select-none">
              {primaryNav.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`text-xs font-bold tracking-widest transition-colors ${
                      isActive
                        ? 'text-emerald-500'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}

              {/* ÁREA DO CLIENTE link */}
              <Link
                to="/admin"
                className="flex items-center space-x-1.5 text-xs font-bold tracking-widest text-neutral-300 hover:text-white transition-colors uppercase"
              >
                <Lock className="w-3.5 h-3.5 text-neutral-450" />
                <span>ÁREA DO CLIENTE</span>
              </Link>

              {/* CONSULTA ONLINE button */}
              <Link
                to="/contato"
                className="px-5 py-3 bg-[#19a800] hover:bg-[#138c00] text-white font-extrabold tracking-widest text-xs uppercase transition-all duration-300"
              >
                CONSULTA ONLINE
              </Link>
            </nav>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-lg text-neutral-300 hover:text-white focus:outline-none"
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden border-t border-neutral-900 bg-black overflow-hidden"
            >
              <div className="px-4 pt-4 pb-6 space-y-2">
                {primaryNav.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`block px-4 py-3 rounded-lg text-xs font-bold tracking-wide transition-colors ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'text-neutral-300 hover:text-white'
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
                <div className="pt-4 border-t border-neutral-900 flex flex-col space-y-3">
                  <Link
                    to="/admin"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center py-3 border border-neutral-800 text-neutral-300 text-xs font-bold tracking-widest hover:bg-neutral-900"
                  >
                    ÁREA DO CLIENTE
                  </Link>
                  <Link
                    to="/contato"
                    onClick={() => setIsOpen(false)}
                    className="w-full text-center py-3 bg-[#19a800] text-white text-xs font-bold tracking-widest hover:bg-[#138c00] shadow-md"
                  >
                    CONSULTA ONLINE
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content Render */}
      <main className="flex-grow">
        <Outlet />
      </main>

      {/* Elegant Public Footer */}
      <footer className="bg-black text-neutral-400 border-t border-neutral-900 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            {/* Column 1: Info and Brand */}
            <div className="md:col-span-1 space-y-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-500/20 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-xl font-bold text-white tracking-tight font-cambria">
                  Almeida <span className="text-emerald-500 font-light">Advocacia</span>
                </span>
              </div>
              <p className="text-sm leading-relaxed text-neutral-400">
                Atuação jurídica em Direito Imobiliário, Inventários, Família, Sucessões e questões civis e patrimoniais.
              </p>
              <p className="text-xs text-neutral-500 font-medium">
                Atendimento na Região Metropolitana de Campinas/SP
              </p>
              <div className="flex pt-2">
                <a 
                  href="https://instagram.com/oadvogadoalmeida" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 border border-neutral-800 text-neutral-300 hover:text-emerald-500 hover:border-emerald-500 transition-colors rounded-lg flex items-center justify-center"
                  aria-label="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-white font-medium text-sm tracking-wider uppercase mb-5 font-display border-l-2 border-emerald-500 pl-3">
                Navegação
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/" className="hover:text-emerald-400 transition-colors">
                    Início
                  </Link>
                </li>
                <li>
                  <Link to="/sobre" className="hover:text-emerald-400 transition-colors">
                    Sobre o escritório
                  </Link>
                </li>
                <li>
                  <Link to="/areas" className="hover:text-emerald-400 transition-colors">
                    Áreas de atuação
                  </Link>
                </li>
                <li>
                  <Link to="/artigos" className="hover:text-emerald-400 transition-colors">
                    Conteúdos jurídicos
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="hover:text-emerald-400 transition-colors">
                    Área do cliente
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Areas */}
            <div>
              <h4 className="text-white font-medium text-sm tracking-wider uppercase mb-5 font-display border-l-2 border-emerald-500 pl-3">
                Especialidades
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <Link to="/areas/inventario" className="hover:text-emerald-400 transition-colors">
                    Inventário
                  </Link>
                </li>
                <li>
                  <Link to="/areas/direito-imobiliario" className="hover:text-emerald-400 transition-colors">
                    Imobiliário
                  </Link>
                </li>
                <li>
                  <Link to="/areas/familia-e-sucessoes" className="hover:text-emerald-400 transition-colors">
                    Família e Sucessões
                  </Link>
                </li>
                <li>
                  <Link to="/areas/registro-de-marcas" className="hover:text-emerald-400 transition-colors">
                    Registro de Marcas
                  </Link>
                </li>
                <li>
                  <Link to="/areas/direito-civil-e-contratos" className="hover:text-emerald-400 transition-colors">
                    Direito Civil
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Atendimento Info */}
            <div className="space-y-4">
              <h4 className="text-white font-medium text-sm tracking-wider uppercase mb-5 font-display border-l-2 border-emerald-500 pl-3">
                Atendimento
              </h4>
              <p className="text-sm leading-relaxed text-neutral-450">
                Segunda a Sexta-feira: 08h às 18h<br />
                Sábado: 09h às 12h<br />
                Atendimentos presenciais e on-line mediante agendamento
              </p>
            </div>
          </div>

          <div className="border-t border-neutral-900 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-neutral-500">
            <p>&copy; 2026 Almeida Advocacia (OAB/SP 525.375). Todos os direitos reservados. <Link to="/termos" className="hover:text-emerald-400">Termos de Uso</Link> | <Link to="/privacidade" className="hover:text-emerald-400">Política de Privacidade</Link>.</p>
            <p className="mt-4 md:mt-0">
              Desenvolvido com excelência técnica e com proteção de dados criptografados.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Action Widget matching user screenshot */}
      <a
        href="https://wa.me/5519999729181?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20uma%20confer%C3%AAncia%20jur%C3%ADdica%20especializada%20com%20o%20Dr.%20Almeida."
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => (window as any).reportWhatsAppClick?.()}
        className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20BA56] text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center hover:shadow-[#25D366]/30 group"
        aria-label="Fale Conosco pelo WhatsApp"
      >
        <svg className="w-7 h-7 text-white fill-none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path 
            fill="currentColor" 
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-8.884 9.888-8.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.703 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" 
          />
        </svg>
        {/* Hover Tooltip display text */}
        <span className="absolute right-16 bg-neutral-950 border border-neutral-900 text-white font-extrabold text-[10px] tracking-widest px-3.5 py-2 rounded-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 shadow-xl whitespace-nowrap">
          Falar com Dr. Almeida
        </span>
      </a>
    </div>
  );
}
