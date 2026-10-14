import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Article } from '../../types';
import { Calendar, User, Clock, ArrowLeft, ArrowUpRight, Search, BookOpen, Compass, ChevronRight } from 'lucide-react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';

export default function ArticlesPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const slugify = (text) => text?.toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-').replace(/^-+/, '').replace(/-+$/, '') || '';

  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Article));
      setArticles(items);
      setLoading(false);
    }, (error) => {
      console.info("Information: Notifying articles state sync bypass:", error?.message || error);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (articles.length > 0) {
      if (slug) {
        const found = articles.find(a => slugify(a.title) === slug || a.id === slug);
        if (found) {
          setSelectedArticle(found);
        } else {
          // not found, maybe redirect to list
          navigate('/artigos', { replace: true });
        }
      } else {
        setSelectedArticle(null);
      }
    }
  }, [slug, articles, navigate]);


  // Smooth scroll to top when selecting an article
  useEffect(() => {
    if (selectedArticle) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectedArticle]);

  // Reading progress bar logic
  useEffect(() => {
    if (!selectedArticle) {
      setReadingProgress(0);
      return;
    }

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const progress = (scrollTop / docHeight) * 100;
        setReadingProgress(progress);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Trigger once on mount/change

    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedArticle]);

  const categories = ['Todos', 'Inventários e Partilhas', 'Direito Imobiliário', 'Direito de Família', 'Direito Civil e Contratos', 'Registro de Marcas'];

  const normalizeCategory = (cat: string) => {
    const c = cat ? cat.toLowerCase() : '';
    if (c.includes('inventário') || c.includes('inventario') || c.includes('partilha') || c.includes('sucessões') || c.includes('sucessoes')) return 'Inventários e Partilhas';
    if (c.includes('imobiliário') || c.includes('imobiliario') || c.includes('imóvel') || c.includes('imovel')) return 'Direito Imobiliário';
    if (c.includes('família') || c.includes('familia')) return 'Direito de Família';
    if (c.includes('marca') || c.includes('inpi') || c.includes('registro')) return 'Registro de Marcas';
    if (c.includes('civil') || c.includes('contrato') || c.includes('contratos')) return 'Direito Civil e Contratos';
    return cat || 'Inventários e Partilhas';
  };

  const getCategoryCount = (cat: string) => {
    if (cat === 'Todos') return articles.length;
    return articles.filter(art => normalizeCategory(art.category) === cat).length;
  };

  const filteredArticles = articles.filter(art => {
    const matchesSearch = (art.title || '').toLowerCase().includes(search.toLowerCase()) || 
                          (art.excerpt || art.snippet || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || normalizeCategory(art.category) === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticle = filteredArticles[0];
  const remainingArticles = filteredArticles.slice(1);

  // Custom components to render beautifully styled markdown headers and elements
  const markdownComponents = {
    h2: ({ ...props }) => (
      <h2 className="text-xl sm:text-2xl font-bold font-display text-white mt-8 mb-4 border-b border-neutral-800 pb-3 flex items-center gap-2" {...props} />
    ),
    h3: ({ ...props }) => (
      <h3 className="text-lg sm:text-xl font-bold font-display text-emerald-400 mt-6 mb-3" {...props} />
    ),
    p: ({ ...props }) => (
      <p className="leading-relaxed text-neutral-300 text-[15px] sm:text-[16.5px] mb-5 font-sans select-text max-w-prose" {...props} />
    ),
    blockquote: ({ ...props }) => (
      <blockquote className="border-l-4 border-emerald-500 pl-4 py-1 my-6 italic text-neutral-400 bg-neutral-900/60 rounded-r-lg font-mono text-[14px]" {...props} />
    ),
    ul: ({ ...props }) => (
      <ul className="list-disc pl-5 space-y-2 mb-5 text-neutral-300 font-sans text-[15px] sm:text-[16px]" {...props} />
    ),
    ol: ({ ...props }) => (
      <ol className="list-decimal pl-5 space-y-2 mb-5 text-neutral-300 font-sans text-[15px] sm:text-[16px]" {...props} />
    ),
    li: ({ ...props }) => (
      <li className="leading-relaxed text-neutral-300" {...props} />
    ),
    table: ({ ...props }) => (
      <div className="overflow-x-auto my-8">
        <table className="w-full text-left border-collapse" {...props} />
      </div>
    ),
    thead: ({ ...props }) => (
      <thead className="bg-neutral-900 border-b border-neutral-800" {...props} />
    ),
    tbody: ({ ...props }) => (
      <tbody className="divide-y divide-neutral-800" {...props} />
    ),
    tr: ({ ...props }) => (
      <tr className="hover:bg-neutral-900/40 transition-colors" {...props} />
    ),
    th: ({ ...props }) => (
      <th className="px-4 py-3 text-sm font-semibold text-emerald-400 font-display" {...props} />
    ),
    td: ({ ...props }) => (
      <td className="px-4 py-3 text-sm text-neutral-300 font-sans leading-relaxed" {...props} />
    ),
  };

  return (
    <div className="bg-black text-neutral-100 min-h-screen py-16 sm:py-24 font-sans select-none agenda-font-inter">
      
      {selectedArticle && (
        <Helmet>
          <title>{selectedArticle.title} | Almeida Advocacia</title>
          <meta name="description" content={`Leia o artigo ${selectedArticle.title} no portal da Almeida Advocacia.`} />
          <link rel="canonical" href={`https://almeidaadvocacia.com.br/artigos/${slugify(selectedArticle.title)}`} />
        </Helmet>
      )}

      {/* Sticky Reading Progress Bar */}
      {selectedArticle && (
        <div className="fixed top-0 left-0 w-full h-1 bg-neutral-950 z-50">
          <motion.div 
            className="h-full bg-emerald-500 shadow-[0_0_8px_#10b981]" 
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <AnimatePresence mode="wait">
          {!selectedArticle ? (
            <motion.div
              key="list-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* Header */}
              <div className="text-center max-w-3xl mx-auto space-y-4">
                <span className="inline-flex items-center space-x-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-widest bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-900/30 font-mono">
                  <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
                  <span>CONTEÚDO JURÍDICO</span>
                </span>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white font-display tracking-tight">
                  Artigos e informações jurídicas
                </h1>
                <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
                  Conteúdos elaborados pelo advogado responsável pelo escritório, com linguagem clara e fundamentação jurídica, sobre questões imobiliárias, sucessórias, familiares, contratuais e patrimoniais.
                </p>
              </div>

              {/* Filters / Search Row */}
              <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center bg-neutral-900/60 p-4 rounded-2xl border border-neutral-850 gap-4 backdrop-blur-md">
                {/* Search */}
                <div className="relative flex-1 max-w-md group">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5 group-focus-within:text-emerald-400 group-focus-within:scale-110 transition-all duration-300" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar por título ou assunto"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-neutral-800 bg-neutral-950 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs sm:text-sm transition-all duration-300"
                  />
                  {search && (
                    <button 
                      onClick={() => setSearch('')}
                      className="absolute right-3.5 top-3 text-xs text-neutral-500 hover:text-neutral-300 font-mono transition-colors"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Categories Scroll */}
                <div className="flex space-x-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none snap-x items-center">
                  {categories.map(cat => {
                    const isActive = selectedCategory === cat;
                    const count = getCategoryCount(cat);
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`relative px-4 py-2.5 rounded-xl text-xs font-semibold font-display tracking-wide whitespace-nowrap transition-all duration-300 snap-start flex items-center space-x-2 cursor-pointer ${
                          isActive 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20 border border-emerald-500/30' 
                            : 'bg-neutral-950 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-850'
                        }`}
                      >
                        <span>{cat}</span>
                        {count > 0 && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-bold transition-colors ${
                            isActive 
                              ? 'bg-emerald-500 text-white' 
                              : 'bg-neutral-900 text-neutral-500'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Articles Content */}
              {loading ? (
                <div className="text-center py-20 text-neutral-400 font-mono flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Sincronizando acervo informativo...</span>
                </div>
              ) : filteredArticles.length > 0 ? (
                <div className="space-y-12">
                  
                  {/* Featured Article Hero (Widescreen layout at the top) */}
                  {featuredArticle && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 font-bold">Destaque Editorial</h4>
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group relative bg-neutral-900/40 border border-neutral-850 hover:border-emerald-500/30 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-emerald-950/5 transition-all duration-300 cursor-pointer"
                        onClick={() => navigate(`/artigos/${slugify(featuredArticle.title)}`)}
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                          {/* Left Column: Image with Gradient Overlay */}
                          <div className="lg:col-span-7 h-64 lg:h-[420px] relative overflow-hidden">
                            {(featuredArticle.imageUrl || featuredArticle.image) ? (
                              <img 
                                src={featuredArticle.imageUrl || featuredArticle.image} 
                                alt={featuredArticle.title} 
                                className="w-full h-full object-cover filter brightness-[0.75] group-hover:scale-102 transition-transform duration-700"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-tr from-neutral-950 via-neutral-900 to-emerald-950/20" />
                            )}
                            
                            {/* Dark gradient fade for better visual blending */}
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/10 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-neutral-900" />
                            
                            <div className="absolute top-6 left-6 z-10">
                              <span className="bg-emerald-600/95 text-white text-[10px] uppercase font-mono font-bold tracking-widest px-3 py-1 rounded-full backdrop-blur-md shadow-md">
                                {normalizeCategory(featuredArticle.category)}
                              </span>
                            </div>
                          </div>

                          {/* Right Column: Meta Info */}
                          <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-6 bg-neutral-900/90 backdrop-blur-sm">
                            <div className="space-y-4">
                              <div className="flex items-center space-x-4 text-xs text-neutral-400 font-mono">
                                <span className="flex items-center space-x-1">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>{featuredArticle.date}</span>
                                </span>
                                <span className="flex items-center space-x-1 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-850/60">
                                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>{featuredArticle.readTime}</span>
                                </span>
                              </div>

                              <h2 className="text-xl sm:text-2.5xl font-bold text-white font-display leading-tight group-hover:text-emerald-400 transition-colors duration-300">
                                {featuredArticle.title}
                              </h2>

                              <p className="text-neutral-400 text-sm leading-relaxed line-clamp-4">
                                {featuredArticle.excerpt || featuredArticle.snippet}
                              </p>
                            </div>

                            <div className="pt-6 border-t border-neutral-850 flex justify-between items-center">
                              <div>
                                <span className="text-[9px] text-neutral-500 uppercase tracking-widest font-mono block">Escrito por</span>
                                <span className="text-xs font-bold text-neutral-200 font-display">{featuredArticle.author}</span>
                              </div>

                              <span className="inline-flex items-center text-xs font-bold text-emerald-450 group-hover:text-emerald-350 font-display space-x-1.5 transition-colors">
                                <span>Ler artigo</span>
                                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                  )}

                  {/* Asymmetric / Bento-Style Grid of remaining articles */}
                  {remainingArticles.length > 0 && (
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 font-bold">Mais Publicações</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {remainingArticles.map((art, index) => {
                          const isLarge = index % 4 === 2; // Bento design variation: larger cards spanning 2 columns
                          return (
                            <motion.div
                              key={art.id}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className={`group relative bg-neutral-900/50 rounded-2xl border border-neutral-850 hover:border-emerald-500/30 overflow-hidden shadow-md hover:shadow-xl hover:shadow-emerald-950/5 transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                                isLarge ? 'lg:col-span-2' : ''
                              }`}
                              onClick={() => navigate(`/artigos/${slugify(art.title)}`)}
                            >
                              <div className={`flex flex-col h-full ${isLarge ? 'lg:flex-row' : ''}`}>
                                {/* Card Image with gradient overlay */}
                                {(art.imageUrl || art.image) ? (
                                  <div className={`overflow-hidden relative shrink-0 ${isLarge ? 'lg:w-[45%] h-52 lg:h-auto min-h-[200px]' : 'h-48'}`}>
                                    <img 
                                      src={art.imageUrl || art.image} 
                                      alt={art.title} 
                                      className="w-full h-full object-cover filter brightness-[0.75] group-hover:scale-102 transition-transform duration-700"
                                      referrerPolicy="no-referrer"
                                    />
                                    {/* Subtle gradient overlay to boost category contrast */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/10 to-transparent" />
                                    <div className="absolute top-4 left-4 z-10">
                                      <span className="bg-neutral-950/85 text-emerald-450 border border-emerald-900/40 text-[9px] uppercase font-mono font-bold tracking-widest px-2.5 py-1 rounded-full backdrop-blur-md">
                                        {normalizeCategory(art.category)}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`bg-gradient-to-tr from-neutral-950 via-neutral-900 to-emerald-950/20 relative shrink-0 ${isLarge ? 'lg:w-[45%] h-52 lg:h-auto min-h-[200px]' : 'h-48'}`}>
                                    <div className="absolute top-4 left-4 z-10">
                                      <span className="bg-neutral-950/85 text-emerald-450 border border-emerald-900/40 text-[9px] uppercase font-mono font-bold tracking-widest px-2.5 py-1 rounded-full backdrop-blur-md">
                                        {normalizeCategory(art.category)}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {/* Card Content */}
                                <div className="p-6 flex flex-col justify-between flex-1 gap-6">
                                  <div className="space-y-3">
                                    <div className="flex items-center space-x-3 text-xs text-neutral-450 font-mono">
                                      <span className="flex items-center space-x-1">
                                        <Calendar className="w-3.5 h-3.5 text-emerald-500/80" />
                                        <span>{art.date}</span>
                                      </span>
                                      <span className="flex items-center space-x-1">
                                        <Clock className="w-3.5 h-3.5 text-emerald-500/80" />
                                        <span>{art.readTime}</span>
                                      </span>
                                    </div>

                                    <h3 className="text-base sm:text-lg font-bold text-white font-display line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors duration-300">
                                      {art.title}
                                    </h3>

                                    <p className="text-neutral-400 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                                      {art.excerpt || art.snippet}
                                    </p>
                                  </div>

                                  <div className="pt-4 border-t border-neutral-850 flex justify-between items-center mt-auto">
                                    <span className="text-xs font-semibold text-neutral-300 font-display">{art.author}</span>
                                    <span className="inline-flex items-center text-xs font-bold text-emerald-450 hover:text-emerald-350 font-display space-x-0.5">
                                      <span>Ler completo</span>
                                      <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-neutral-900/40 border border-neutral-850 p-16 rounded-2xl text-center text-neutral-400 font-sans max-w-md mx-auto space-y-2">
                  <BookOpen className="w-8 h-8 text-neutral-600 mx-auto" />
                  <p className="font-semibold text-neutral-300">Nenhum artigo encontrado</p>
                  <p className="text-xs">Não encontramos publicações nesta categoria com os termos pesquisados.</p>
                </div>
              )}
            </motion.div>
          ) : (
            // Modern, Immersive Reading View with Parallax Header
            <motion.div
              key="detail-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              {/* Immersive Widescreen Banner */}
              <div className="relative w-full h-[50vh] min-h-[380px] max-h-[580px] overflow-hidden rounded-3xl border border-neutral-850 shadow-2xl">
                {selectedArticle.imageUrl || selectedArticle.image ? (
                  <>
                    <img 
                      src={selectedArticle.imageUrl || selectedArticle.image} 
                      alt={selectedArticle.title} 
                      className="w-full h-full object-cover filter brightness-[0.55]"
                      referrerPolicy="no-referrer"
                    />
                    {/* Parallax Fade overlay to deep black background */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-900 to-emerald-950/30" />
                )}

                {/* Overlaid Banner Meta & Heading */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-12 space-y-4">
                  <button
                    onClick={() => {
                      setSelectedCategory(normalizeCategory(selectedArticle.category));
                      navigate('/artigos');
                    }}
                    className="inline-flex bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-450 text-xs font-mono font-bold tracking-widest uppercase px-3.5 py-1.5 rounded-full border border-emerald-500/25 transition-colors cursor-pointer"
                  >
                    {normalizeCategory(selectedArticle.category)}
                  </button>

                  <h1 className="text-2.5xl sm:text-4.5xl font-extrabold text-white leading-tight font-display tracking-tight max-w-4xl select-text">
                    {selectedArticle.title}
                  </h1>

                  <div className="flex flex-wrap items-center gap-6 text-xs text-neutral-300 font-mono pt-2">
                    <span className="flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>Escrito por: <strong className="text-white">{selectedArticle.author}</strong></span>
                    </span>
                    <span className="flex items-center space-x-1.5">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span>{selectedArticle.date}</span>
                    </span>
                    <span className="flex items-center space-x-1.5 bg-neutral-900/80 px-2.5 py-1 rounded border border-neutral-800">
                      <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>Leitura Estimada: {selectedArticle.readTime}</span>
                    </span>
                  </div>
                </div>

                {/* Floated Back Button */}
                <button
                  onClick={() => navigate('/artigos')}
                  className="absolute top-6 left-6 inline-flex items-center space-x-2 text-xs font-bold text-neutral-200 hover:text-white transition-all uppercase font-display bg-black/60 hover:bg-black/95 border border-neutral-800 px-4 py-2.5 rounded-full backdrop-blur-md cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para Artigos</span>
                </button>
              </div>

              {/* Main Content Area (65-70 character width optimization) */}
              <div className="max-w-4xl mx-auto px-1 sm:px-6">
                <div className="bg-neutral-900/30 border border-neutral-850 p-6 sm:p-12 rounded-3xl space-y-10 backdrop-blur-sm shadow-xl">
                  
                  {/* Article Markdown body */}
                  <div className="prose prose-invert prose-emerald max-w-none text-neutral-300 font-sans leading-relaxed text-[15px] sm:text-[16px]">
                    <div className="markdown-body select-text max-w-2xl mx-auto agenda-font-inter">
                      <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{selectedArticle.content}</Markdown>
                    </div>
                  </div>

                  {/* Consultation / Call to Action box */}
                  <div className="bg-black/50 rounded-2xl p-6 sm:p-10 border border-neutral-850 flex flex-col sm:flex-row justify-between items-center gap-6 max-w-2xl mx-auto shadow-inner">
                    <div className="space-y-1.5">
                      <h4 className="text-base font-bold text-white font-display">Ficou com alguma dúvida sobre o assunto acima?</h4>
                      <p className="text-xs text-neutral-450 leading-relaxed font-sans">Nossa equipe está à disposição no atendimento para lhe prestar o suporte jurídico necessário de forma ágil.</p>
                    </div>
                    <Link
                      to={`/contato?subject=Dúvida sobre artigo: ${selectedArticle.title}`}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider font-display flex-shrink-0 transition-all hover:scale-102 shadow-lg shadow-emerald-950/20"
                    >
                      Consultar Autor
                    </Link>
                  </div>

                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
