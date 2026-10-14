import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gavel, ArrowLeft, Loader2 } from 'lucide-react';
import { onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, getDocs, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check role and redirect
        try {
          // Check if admin
          const masterEmails = ['andre@advogadoalmeida.com.br', 'andrefelipedealmeida@gmail.com'];
          if (masterEmails.includes(user.email || '')) {
            navigate('/admin');
            return;
          }
          
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            navigate('/admin');
            return;
          }

          // Check if client
          const q = query(collection(db, 'clients'));
          const snapshot = await getDocs(q);
          let isClient = false;
          snapshot.forEach((doc) => {
            if (doc.data().uid === user.uid) {
              isClient = true;
            }
          });
          
          if (isClient) {
            navigate('/cliente/dashboard');
          } else {
            // Default to admin just in case they were added through the failsafe
            navigate('/admin');
          }
        } catch (err) {
          console.error('Error routing authenticated user:', err);
          navigate('/admin');
        }
      } else {
        setIsCheckingAuth(false);
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Informe suas credenciais.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // State change observer will handle redirection
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error('Credenciais inválidas. Verifique seu e-mail e senha.');
      setIsLoggingIn(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Por favor, informe seu e-mail para receber o link de redefinição.');
      return;
    }
    
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success('E-mail de redefinição de senha enviado com sucesso! Verifique sua caixa de entrada.');
      setShowForgotPassword(false);
    } catch (err: any) {
      console.error('Password reset error:', err);
      toast.error(`Falha ao enviar e-mail: ${err?.message || 'Erro desconhecido.'}`);
    } finally {
      setIsSendingReset(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="bg-neutral-950 min-h-screen text-emerald-500 font-mono flex flex-col justify-center items-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs">Autenticando...</span>
      </div>
    );
  }

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
              Acesso ao Sistema
            </span>
            <h1 className="text-2xl font-bold font-display text-white">Almeida Advocacia</h1>
            <p className="text-xs text-neutral-400">
              {showForgotPassword 
                ? 'Redefina sua senha por e-mail.' 
                : 'Entre com suas credenciais para acessar o portal.'}
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
                placeholder="exemplo@email.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-neutral-200"
              />
            </div>

            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                disabled={isSendingReset}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-semibold font-display text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                {isSendingReset ? 'Enviando e-mail...' : 'Enviar Link'}
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
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase font-mono font-bold tracking-wider text-neutral-400">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@email.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs text-neutral-200"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs uppercase font-mono font-bold tracking-wider text-neutral-400">Senha</label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[10px] text-neutral-500 hover:text-emerald-400 transition-colors font-sans cursor-pointer"
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
                {isLoggingIn ? 'Entrando...' : 'Acessar'}
              </button>
            </div>
          </form>
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

      </div>
    </div>
  );
}
