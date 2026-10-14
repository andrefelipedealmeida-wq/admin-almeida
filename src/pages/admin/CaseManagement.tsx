import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FolderGit, 
  Users2, 
  Calendar, 
  DollarSign, 
  Scale, 
  FileText, 
  Calculator, 
  User, 
  LayoutDashboard,
  LogOut,
  Gavel,
  Lock,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ShieldAlert,
  Loader2,
  ArrowLeft,
  Users,
  Menu,
  X,
  MessageSquareQuote
} from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, where, doc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { toast } from 'sonner';

// Import sub-pages
import DashboardPage from './DashboardPage';
import CasesPage from './CasesPage';
import ClientsPage from './ClientsPage';
import AgendaPage from './AgendaPage';
import FinancePage from './FinancePage';
import InventoryPages from './InventoryPages';
import ArticlesAdminPage from './ArticlesAdminPage';
import TestimonialsAdminPage from './TestimonialsAdminPage';
import UsersPage from './UsersPage';
import ProfilePage from './ProfilePage';

import { Case, Client, CalendarEvent, Transaction, InventoryCase, Article } from '../../types';

export default function CaseManagement() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Login Form States (Set to empty for standard production security)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Active ERP Tab State
  const [tab, setTab] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('erp_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('erp_sidebar_collapsed', String(newState));
  };

  const [userRole, setUserRole] = useState<'master' | 'collaborator'>('collaborator');
  const [profileName, setProfileName] = useState('Dr. André Felipe de Almeida');

  // Data is populated only from Firestore after the signed-in user's permissions are known.
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventories, setInventories] = useState<InventoryCase[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        sessionStorage.setItem('almeida_active_session', 'true');
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // A user document with the same id as Firebase Auth's UID authorizes ERP access.
  useEffect(() => {
    if (!currentUser) {
      setUserRole('collaborator');
      setProfileName('');
      return;
    }
    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.uid), (snapshot) => {
      const profile = snapshot.data();
      if (!profile || profile.deleted) {
        toast.error('Sua conta não está autorizada para acessar o ERP.');
        void handleSignOut();
        return;
      }
      setUserRole(profile.role === 'master' ? 'master' : 'collaborator');
      setProfileName(profile.name || currentUser.displayName || currentUser.email || 'Colaborador');
    }, () => {
      toast.error('Não foi possível validar sua autorização de acesso.');
      void handleSignOut();
    });

    return unsubscribe;
  }, [currentUser]);

  // Inactivity auto logout after 30 minutes
  useEffect(() => {
    if (!currentUser) return;

    const updateActivity = () => {
      sessionStorage.setItem('almeida_last_activity', Date.now().toString());
    };

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    const interval = setInterval(() => {
      const storedActivity = sessionStorage.getItem('almeida_last_activity');
      const parsedActivity = storedActivity ? parseInt(storedActivity, 10) : Date.now();
      
      const thirtyMinutes = 30 * 60 * 1000;
      if (Date.now() - parsedActivity > thirtyMinutes) {
        toast.warning('Sessão encerrada por inatividade (meia hora).');
        handleSignOut();
      }
    }, 15000); // Check every 15 seconds

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
      clearInterval(interval);
    };
  }, [currentUser]);

  // Real-time Firestore binds (ONLY when authenticated to save quota and respect security)
  useEffect(() => {
    if (!currentUser) return;

    const userUID = currentUser.uid;

    // Multi-tenant privacy & access control filter:
    // - Every account (whether master or collaborator) sees ONLY records created by them, assigned to them, or explicitly linked to their account UID or email.
    // - Unassigned seed/legacy records (items with no userId, createdBy, or assignedTo) belong exclusively to the primary founding account.
    const isVisibleToUser = (item: any) => {
      if (userRole === 'master') return true;
      if (item.userId || item.createdBy || item.assignedTo) {
        return (
          item.userId === userUID ||
          item.assignedTo === userUID
        );
      }
      return false;
    };

    const scopedQuery = (collectionName: string, orderField: string, direction: 'asc' | 'desc') => (
      userRole === 'master'
        ? query(collection(db, collectionName), orderBy(orderField, direction))
        : query(collection(db, collectionName), where('userId', '==', userUID))
    );

    // Cases
    const unsubCases = onSnapshot(scopedQuery('cases', 'createdAt', 'desc'), 
      (snap) => {
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Case))
          .filter(item => !item.deleted && isVisibleToUser(item));
        setCases(list);
      },
      (err) => console.log('Information: Reading cases locally/remotely:', err)
    );

    // Clients
    const unsubClients = onSnapshot(scopedQuery('clients', 'createdAt', 'desc'), 
      (snap) => {
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Client))
          .filter(item => !item.deleted && isVisibleToUser(item));
        setClients(list);
      },
      (err) => console.log('Information: Reading clients locally/remotely:', err)
    );

    // Events
    const unsubEvents = onSnapshot(scopedQuery('events', 'date', 'asc'), 
      (snap) => {
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent))
          .filter(item => !item.deleted && isVisibleToUser(item));
        setEvents(list);
      },
      (err) => console.log('Information: Reading events locally/remotely:', err)
    );

    // Transactions
    const unsubTrans = onSnapshot(scopedQuery('transactions', 'date', 'desc'), 
      (snap) => {
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Transaction))
          .filter(item => !item.deleted && isVisibleToUser(item));
        setTransactions(list);
      },
      (err) => console.log('Information: Reading transactions locally/remotely:', err)
    );

    // Inventories
    const unsubInv = onSnapshot(scopedQuery('inventories', 'createdAt', 'desc'), 
      (snap) => {
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as InventoryCase))
          .filter(item => !item.deleted && isVisibleToUser(item));
        setInventories(list);
      },
      (err) => console.log('Information: Reading or updating inventories:', err)
    );

    // Articles
    const unsubArt = onSnapshot(query(collection(db, 'articles'), orderBy('createdAt', 'desc')), 
      (snap) => {
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Article))
          .filter(item => !item.deleted && isVisibleToUser(item));
        setArticles(list);
      },
      (err) => console.log('Information: Reading or updating articles:', err)
    );

    return () => {
      unsubCases();
      unsubClients();
      unsubEvents();
      unsubTrans();
      unsubInv();
      unsubArt();
    };
  }, [currentUser, userRole]);

  // Background checker for upcoming events of today (runs globally while session is active)
  useEffect(() => {
    if (!currentUser) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    const checkUpcomingEvents = () => {
      if (Notification.permission !== 'granted') return;

      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;

      // Get events of today which are not cancelled or completed
      const todayEvents = events.filter(e => e.date === todayStr && e.status !== 'Cancelado' && e.status !== 'Concluído');

      todayEvents.forEach(event => {
        if (!event.time) return;

        // Parse event time (format: HH:MM)
        const [eventHour, eventMinute] = event.time.split(':').map(Number);
        if (isNaN(eventHour) || isNaN(eventMinute)) return;

        const eventTimeToday = new Date(y, now.getMonth(), now.getDate(), eventHour, eventMinute, 0);
        const diffMs = eventTimeToday.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        // Notify if starting in the next 15 minutes, or up to 5 minutes late
        if (diffMinutes >= -5 && diffMinutes <= 15) {
          const storageKey = `notified_event_${event.id}_${event.time}`;
          const alreadyNotified = localStorage.getItem(storageKey);

          if (!alreadyNotified) {
            let iconType = '📅';
            if (event.type === 'audiência') iconType = '⚖️';
            if (event.type === 'prazo') iconType = '🚨';
            if (event.type === 'reunião') iconType = '🤝';
            if (event.type === 'financeiro') iconType = '💰';

            try {
              new Notification(`${iconType} Compromisso Próximo: ${event.title}`, {
                body: `Está agendado para às ${event.time} de hoje. Local/Descrição: ${event.description || 'Sem detalhes informados.'}`,
                icon: '/imagens/logo.png',
                tag: `event-${event.id}`,
                requireInteraction: true
              });
              localStorage.setItem(storageKey, 'true');
            } catch (err) {
              console.error('Failed to trigger notification:', err);
            }
          }
        }
      });
    };

    // Run check immediately and then every 15 seconds
    checkUpcomingEvents();
    const interval = setInterval(checkUpcomingEvents, 15000);
    return () => clearInterval(interval);
  }, [events, currentUser]);

  // Handle Password Reset Request via Firebase Auth
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor, informe seu e-mail corporativo para receber o link de redefinição.');
      return;
    }
    
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success('E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.');
      setShowForgotPassword(false);
    } catch (err: any) {
      console.error('Password reset error:', err);
      // Give a helpful error explanation
      if (err?.code === 'auth/user-not-found') {
        toast.error('Este e-mail não está cadastrado no sistema do Firebase Auth.');
      } else if (err?.code === 'auth/invalid-email') {
        toast.error('O formato de e-mail informado é inválido.');
      } else {
        toast.error(`Falha ao enviar e-mail: ${err?.message || 'Erro desconhecido.'}`);
      }
    } finally {
      setIsSendingReset(false);
    }
  };

  // Firebase Authentication is the single source of truth for credentials.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Informe suas credenciais.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      sessionStorage.setItem('almeida_active_session', 'true');
      sessionStorage.setItem('almeida_last_activity', Date.now().toString());
      toast.success('Autenticação realizada. Validando sua autorização de acesso...');
    } catch (err: any) {
      console.error('Login error:', err);
      sessionStorage.removeItem('almeida_active_session');
      sessionStorage.removeItem('almeida_last_activity');
      toast.error('Credenciais inválidas ou e-mail corporativo não registrado no sistema.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Login via Google Auth (Enabled by default in AI Studio Firebase projects)
  const handleGoogleLogin = async () => {
    try {
      setIsLoggingIn(true);
      // Set active session BEFORE sign in so that onAuthStateChanged doesn't immediately log the user out!
      sessionStorage.setItem('almeida_active_session', 'true');
      sessionStorage.setItem('almeida_last_activity', Date.now().toString());

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      toast.success('Acesso homologado via Google!');
    } catch (err: any) {
      console.error('Google login error:', err);
      sessionStorage.removeItem('almeida_active_session');
      sessionStorage.removeItem('almeida_last_activity');
      if (err?.code === 'auth/popup-blocked') {
        toast.error('O bloqueador de pop-ups impediu o login com o Google. Por favor, permita pop-ups para este site.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        toast.error('O login do Google não está ativado no seu Console do Firebase.');
      } else {
        toast.error(`Falha no login com Google: ${err?.message || 'Erro de conexão.'}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };



  const handleSignOut = async () => {
    try {
      sessionStorage.removeItem('almeida_active_session');
      sessionStorage.removeItem('almeida_last_activity');
      setCurrentUser(null);
      await signOut(auth);
      setTab('dashboard');
      toast.success('Sessão encerrada.');
    } catch (err) {
      console.info("Signout information (handled):", err);
    }
  };

  // Rendering Loader while determining Auth status
  if (authLoading) {
    return (
      <div className="bg-neutral-950 min-h-screen text-emerald-500 font-mono flex flex-col justify-center items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs">Estabilizando conexões criptografadas...</span>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // LOGIN SCREEN (The "Matte Black / Dark Slate Deep Dark Design" - Exclusively Corporate Email/Password)
  // ------------------------------------------------------------------------
  if (!currentUser) {
    return (
      <div className="bg-neutral-950 min-h-screen text-slate-200 flex items-center justify-center p-4 sm:p-6 font-cambria antialiased relative overflow-hidden">
        
        {/* Subtle green ambient light bubbles */}
        <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-emerald-950/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-emerald-900/10 blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 space-y-8">
          
          {/* Logo badge */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-900/20 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
              <Gavel className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-500 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                Acesso Restrito ERP
              </span>
              <h1 className="text-2xl font-bold font-display text-white">Almeida Advocacia</h1>
              <p className="text-xs text-neutral-400">
                {showForgotPassword 
                  ? 'Redefina sua credencial secreta por e-mail.' 
                  : 'Entre com as suas credenciais corporativas.'}
              </p>
            </div>
          </div>

          {showForgotPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase font-mono font-bold tracking-wider text-neutral-400">E-mail Cadastrado</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@advogadoalmeida.com.br"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-neutral-200"
                />
                <p className="text-[10px] text-neutral-500">
                  Um link oficial do Firebase Auth será enviado para redefinir sua senha com segurança.
                </p>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  type="submit"
                  disabled={isSendingReset}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold font-display text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  {isSendingReset ? 'Enviando e-mail...' : 'Enviar Link de Recuperação'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full py-2.5 border border-neutral-800 hover:bg-neutral-850 text-neutral-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Voltar para o Login
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase font-mono font-bold tracking-wider text-neutral-400">Usuário Corporativo (Email)</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@advogadoalmeida.com.br"
                    autoComplete="email"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-neutral-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs uppercase font-mono font-bold tracking-wider text-neutral-400">Senha Secreta ERP</label>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-[10px] text-neutral-500 hover:text-emerald-400 transition-colors font-sans"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-neutral-200"
                  />
                </div>

                <div className="flex flex-col space-y-3">
                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold font-display text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    {isLoggingIn ? 'Verificando autorização...' : 'Acessar com E-mail'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="flex flex-col space-y-3">
            <Link
              to="/"
              className="w-full py-3 border border-neutral-800 hover:bg-neutral-850 text-neutral-300 font-semibold font-display text-xs uppercase tracking-wider rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retornar ao Site Principal</span>
            </Link>
          </div>

          <p className="text-[10px] text-center text-neutral-500 leading-relaxed font-sans">
            Criptografado ponta-a-ponta por Almeida Advocacia Security Core. <br />
            Seu endereço IP de acesso está sob gravação de log.
          </p>

        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // ERP DASHBOARD LAYOUT (The premium matte dark ERP shell)
  // ------------------------------------------------------------------------
  return (
    <div className="bg-neutral-950 min-h-screen text-slate-200 font-segoe antialiased flex flex-col md:flex-row">
      
      {/* Sidebar navigation */}
      <aside className={`w-full ${sidebarCollapsed ? 'md:w-20 p-4' : 'md:w-64 p-6'} bg-neutral-900 border-b md:border-b-0 md:border-r border-neutral-800/80 flex flex-col justify-between space-y-4 md:space-y-8 flex-shrink-0 transition-all duration-300`}>
        
        <div className="space-y-4 md:space-y-8">
          {/* Logo brand */}
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div className="flex items-center space-x-3 pb-0.5 overflow-hidden">
              <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center font-bold flex-shrink-0">
                <Scale className="w-5 h-5" />
              </div>
              <div className={`${sidebarCollapsed ? 'md:hidden' : 'block'} transition-opacity duration-300`}>
                <h2 className="text-sm font-bold font-display text-white whitespace-nowrap">Almeida ERP</h2>
                <p className="text-[10px] text-neutral-450 text-neutral-400 font-mono uppercase tracking-wider whitespace-nowrap">Módulo Regulatório</p>
              </div>
            </div>
            
            <button
              onClick={toggleSidebar}
              className="flex p-1.5 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              <span className="hidden md:inline">
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </span>
              <span className="inline md:hidden">
                {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </span>
            </button>
          </div>

          {/* Nav List */}
          <nav className={`space-y-1.5 text-xs font-semibold ${sidebarCollapsed ? 'hidden md:block' : 'block'}`}>
            {[
              { id: 'dashboard', label: 'Monitor Geral', icon: LayoutDashboard },
              { id: 'cases', label: 'Diligências e Casos', icon: FolderGit },
              { id: 'clients', label: 'Clientes', icon: Users2 },
              { id: 'agenda', label: 'Agenda', icon: Calendar },
              { id: 'finance', label: 'Financeiro', icon: DollarSign },
              { id: 'inventory', label: 'Gestão de inventários', icon: Scale },
              { id: 'articles', label: 'Publicações Site', icon: FileText },
              ...(userRole === 'master' ? [
                { id: 'testimonials', label: 'Gestão Depoimentos', icon: MessageSquareQuote },
                { id: 'users', label: 'Gerenciar Contas', icon: Users }
              ] : []),
              { id: 'profile', label: 'Termos e Sessão', icon: User }
            ].map(item => {
              const IconComp = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    // On mobile screens, auto-collapse sidebar on link click
                    if (window.innerWidth < 768) {
                      setSidebarCollapsed(true);
                      localStorage.setItem('erp_sidebar_collapsed', 'true');
                    }
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${sidebarCollapsed ? 'md:justify-center md:px-1' : 'space-x-3 px-3.5'} py-2.5 rounded-xl transition-all ${
                    tab === item.id 
                      ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/25 shadow-md shadow-emerald-505/5' 
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-850'
                  }`}
                >
                  <IconComp className="w-4 h-4 flex-shrink-0" />
                  <span className={`${sidebarCollapsed ? 'md:hidden' : 'inline'} truncate`}>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2 border-t border-neutral-800/60 mt-2">
              <Link
                to="/"
                title={sidebarCollapsed ? "Retornar ao Site Principal" : undefined}
                className={`w-full flex items-center ${sidebarCollapsed ? 'md:justify-center md:px-1' : 'space-x-3 px-3.5'} py-2.5 rounded-xl transition-all text-neutral-400 hover:text-white hover:bg-neutral-850`}
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0 text-emerald-500" />
                <span className={`${sidebarCollapsed ? 'md:hidden' : 'inline'} truncate`}>Retornar ao Site Principal</span>
              </Link>
            </div>
          </nav>
        </div>

        {/* User profile bottom */}
        <div className={`pt-4 border-t border-neutral-800 ${sidebarCollapsed ? 'hidden md:flex' : 'flex'} ${sidebarCollapsed ? 'flex-col space-y-3 items-center' : 'items-center justify-between'} text-xs font-mono`}>
          <div className="flex items-center space-x-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold flex-shrink-0">
              {profileName.charAt(0)}
            </div>
            <div className={`${sidebarCollapsed ? 'md:hidden' : 'block'} truncate max-w-[100px]`}>
              <span className="text-white font-semibold font-sans block truncate text-[11px]">{profileName}</span>
              <span className="text-[9px] text-neutral-500 block uppercase font-mono">{userRole}</span>
            </div>
          </div>
          
          <button 
            onClick={handleSignOut}
            className="p-1.5 hover:bg-neutral-800 text-neutral-450 hover:text-red-400 rounded-lg transition-colors focus:outline-none cursor-pointer"
            title="Sair do ERP corporativo"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </aside>

      {/* Main workspace container */}
      <main className="flex-grow p-6 sm:p-10 max-w-7xl mx-auto w-full overflow-y-auto">
        <div className="space-y-6">
          {tab === 'dashboard' && <DashboardPage cases={cases} clients={clients} events={events} setTab={setTab} />}
          {tab === 'cases' && <CasesPage cases={cases} clients={clients} />}
          {tab === 'clients' && <ClientsPage clients={clients} cases={cases} />}
          {tab === 'agenda' && <AgendaPage events={events} clients={clients} cases={cases} sidebarCollapsed={sidebarCollapsed} toggleSidebar={toggleSidebar} />}
          {tab === 'finance' && <FinancePage transactions={transactions} cases={cases} />}
          {tab === 'inventory' && <InventoryPages inventories={inventories} clients={clients} />}
          {tab === 'articles' && <ArticlesAdminPage articles={articles} />}
          {tab === 'testimonials' && userRole === 'master' && <TestimonialsAdminPage />}
          {tab === 'users' && userRole === 'master' && <UsersPage />}
          {tab === 'profile' && <ProfilePage />}
        </div>
      </main>

    </div>
  );
}
