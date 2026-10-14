import React, { useState, useEffect } from 'react';
import { User, Shield, KeyRound, LogOut, Award, CheckCircle2, Bell, BellRing, BellOff } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [notificationPermission, setNotificationPermission] = useState<string>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const [showTestimonials, setShowTestimonials] = useState<boolean>(true);
  const [allowNewTestimonials, setAllowNewTestimonials] = useState<boolean>(true);
  const [showFaq, setShowFaq] = useState<boolean>(true);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'siteConfig');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.showTestimonials === 'boolean') {
          setShowTestimonials(data.showTestimonials);
        }
        if (typeof data.allowNewTestimonials === 'boolean') {
          setAllowNewTestimonials(data.allowNewTestimonials);
        }
        if (typeof data.showFaq === 'boolean') {
          setShowFaq(data.showFaq);
        }
      } else {
        setDoc(docRef, { showTestimonials: true, allowNewTestimonials: true, showFaq: true }, { merge: true });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleToggleTestimonials = async () => {
    try {
      const docRef = doc(db, 'settings', 'siteConfig');
      await setDoc(docRef, { showTestimonials: !showTestimonials }, { merge: true });
      toast.success(`Seção de depoimentos ${!showTestimonials ? 'ativada' : 'ocultada'} no site público.`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar configurações do site.');
    }
  };

  const handleToggleAllowNewTestimonials = async () => {
    try {
      const docRef = doc(db, 'settings', 'siteConfig');
      await setDoc(docRef, { allowNewTestimonials: !allowNewTestimonials }, { merge: true });
      toast.success(`Formulário de novos depoimentos ${!allowNewTestimonials ? 'ativado' : 'ocultado'} no site público.`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar configurações do site.');
    }
  };

  const handleToggleFaq = async () => {
    try {
      const docRef = doc(db, 'settings', 'siteConfig');
      await setDoc(docRef, { showFaq: !showFaq }, { merge: true });
      toast.success(`Seção de Perguntas Frequentes ${!showFaq ? 'ativada' : 'ocultada'} no site público.`);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar configurações do site.');
    }
  };

  const requestNotificationPermission = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Este navegador ou dispositivo não oferece suporte a notificações nativas de push.');
      return;
    }

    Notification.requestPermission().then((permission) => {
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notificações de agenda ativadas com sucesso!');
        new Notification('Notificações Ativas 🔔', {
          body: 'Você começará a receber alertas de compromissos diretamente no seu navegador/celular!',
          icon: '/imagens/logo.png'
        });
      } else if (permission === 'denied') {
        toast.error('Permissão negada. Ative as notificações manualmente nas configurações do site no seu navegador.');
      }
    });
  };

  const sendTestNotification = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Notificações nativas não são suportadas neste navegador.');
      return;
    }

    if (Notification.permission !== 'granted') {
      toast.info('Solicitando permissão primeiro...');
      requestNotificationPermission();
      return;
    }

    toast.info('Enviando notificação de teste em 1.5 segundos...');
    setTimeout(() => {
      try {
        new Notification('Agenda Almeida Advocacia 📅', {
          body: 'Teste de notificação push nativa executado com sucesso! Seus alarmes de compromissos estão funcionando.',
          icon: '/imagens/logo.png',
          requireInteraction: true
        });
      } catch (err) {
        console.error('Error sending native notification:', err);
      }
    }, 1500);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Desconectado com sucesso da central restrita.');
    } catch (err) {
      console.error(err);
      toast.error('Ocorreu um erro ao desconectar.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 text-neutral-100 font-sans">
      
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 shadow-sm">
        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full flex items-center justify-center">
          <User className="w-10 h-10" />
        </div>
        <div className="text-center sm:text-left space-y-1">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <h2 className="text-xl font-bold font-display text-white">Dr. André Felipe Almeida</h2>
            <span className="px-2.5 py-0.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold font-mono uppercase tracking-wider rounded">Sócio Administrador</span>
          </div>
          <p className="text-xs text-neutral-400">Advogado Sócio Registrado</p>
          <p className="text-xs text-neutral-400">andre@advogadoalmeida.com.br</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Security Profile */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-6 shadow-sm">
          <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center space-x-1.5 border-b border-neutral-850 pb-2">
            <Shield className="w-4.5 h-4.5 text-emerald-500" />
            <span>Regras de Acesso e Sigilo</span>
          </h3>

          <div className="space-y-4 text-xs font-semibold leading-relaxed">
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-555 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-200 block">Criptografia Real de Encontros</strong>
                <span className="text-neutral-405 text-neutral-400 font-normal">Todas as videochamadas e propostas públicas recebidas são fechadas usando conexões cifradas TLSv1.3 e armazenadas no Firestore.</span>
              </div>
            </div>

            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-555 text-emerald-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-neutral-200 block">Auditoria LGPD Integrada</strong>
                <span className="text-neutral-405 text-neutral-400 font-normal">As premissas e fichas cadastrais coletadas protegem-se contra vazamento respeitando a Lei Federal do Brasil nº 13.709.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-6 flex flex-col justify-between shadow-sm">
          
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center space-x-1.5 border-b border-neutral-850 pb-2">
              <KeyRound className="w-4.5 h-4.5 text-emerald-500" />
              <span>Sessão Legal Ativa</span>
            </h3>
            
            <p className="text-xs text-neutral-400 font-normal leading-relaxed">
              Você está conectado como administrador deste ERP jurídico. Certifique-se de fechar sua sessão se estiver acessando de computadores públicos ou de fóruns.
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-red-950/40 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/40 rounded-xl text-xs font-semibold uppercase tracking-wider font-display flex items-center justify-center space-x-2 transition-all shadow-md shadow-red-900/5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Encerrar Acesso com Segurança</span>
          </button>

        </div>

      </div>

      {/* Alertas de Agenda Nativos */}
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center space-x-2 border-b border-neutral-850 pb-2">
          <BellRing className="w-4.5 h-4.5 text-emerald-500 animate-pulse" />
          <span>Configuração de Alertas e Notificações (Celular e Computador)</span>
        </h3>

        <div className="text-xs space-y-4 font-sans text-neutral-100">
          <p className="text-neutral-450 leading-relaxed text-neutral-400">
            Receba lembretes nativos diretamente no seu celular ou computador 15 minutos antes de audiências, prazos fatais ou reuniões registradas na sua agenda corporativa do ERP.
          </p>

          {notificationPermission === 'granted' ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-900/40 rounded-xl flex items-start space-x-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-ping"></div>
              <div className="flex-1 text-[11px]">
                <strong className="text-emerald-400 block font-semibold mb-0.5">Alertas Nativos Ativos</strong>
                <span className="text-neutral-400 block leading-relaxed">
                  Seu navegador está autorizado! Mantenha esta aba aberta para receber avisos em tempo real com som.
                </span>
              </div>
            </div>
          ) : notificationPermission === 'denied' ? (
            <div className="p-3 bg-red-950/30 border border-red-900/30 rounded-xl flex items-start space-x-2.5">
              <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5"></div>
              <div className="flex-1 text-[11px]">
                <strong className="text-red-400 block font-semibold mb-0.5">Notificações Bloqueadas</strong>
                <span className="text-neutral-400 block leading-relaxed">
                  A permissão foi negada no navegador. Clique no ícone de cadeado/ajustes ao lado do endereço do site para reativar.
                </span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-neutral-950 border border-neutral-850 rounded-xl flex items-start space-x-2.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mt-1.5 animate-pulse"></div>
              <div className="flex-1 text-[11px]">
                <strong className="text-neutral-200 block font-semibold mb-0.5">Permissão Pendente</strong>
                <span className="text-neutral-400 block leading-relaxed">
                  Ative as permissões clicando no botão abaixo para receber avisos automatizados dos compromissos de hoje.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            {notificationPermission !== 'granted' ? (
              <button
                onClick={requestNotificationPermission}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold uppercase transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5 text-white" />
                <span>Ativar Notificações</span>
              </button>
            ) : (
              <button
                onClick={sendTestNotification}
                className="py-2.5 px-4 bg-neutral-950 border border-neutral-850 hover:bg-neutral-850 hover:border-neutral-700 text-neutral-300 rounded-xl text-[11px] font-bold uppercase transition-colors flex items-center justify-center space-x-1 cursor-pointer"
              >
                <span>Enviar Alerta de Teste 🔔</span>
              </button>
            )}
          </div>

          {/* Mobile Tip */}
          <div className="text-[10px] text-neutral-500 border-t border-neutral-850/50 pt-3 leading-relaxed font-sans">
            💡 <strong>Dica de Instalação (iPhone & Android):</strong> <br />
            Para receber como se fosse um app instalado, abra o link no seu navegador móvel (Safari ou Chrome), toque no menu de <strong>Compartilhar / Opções</strong>, e escolha <strong>"Adicionar à Tela de Início"</strong>. Depois, abra o ícone e ative as notificações!
          </div>
        </div>
      </div>

      {/* Configurações Globais do Site */}
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-neutral-300 uppercase tracking-widest font-mono flex items-center space-x-2 border-b border-neutral-850 pb-2">
          <span>Configurações do Site Público</span>
        </h3>

        <div className="text-xs space-y-4 font-sans text-neutral-100">
          <p className="text-neutral-450 leading-relaxed text-neutral-400">
            Gerencie os módulos e seções visíveis na página inicial do site público.
          </p>

          <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <strong className="text-neutral-200 block font-semibold mb-1">Seção de Depoimentos</strong>
              <span className="text-neutral-500 block leading-relaxed text-[11px]">
                Controla a exibição do carrossel de depoimentos na página inicial e nas páginas internas.
              </span>
            </div>
            <button
              onClick={handleToggleTestimonials}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer flex-shrink-0 ${showTestimonials ? 'bg-emerald-600' : 'bg-neutral-700'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showTestimonials ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <strong className="text-neutral-200 block font-semibold mb-1">Permitir Envio de Depoimentos</strong>
              <span className="text-neutral-500 block leading-relaxed text-[11px]">
                Exibe o formulário "Deixe seu relato" para que novos clientes enviem depoimentos no site público.
              </span>
            </div>
            <button
              onClick={handleToggleAllowNewTestimonials}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer flex-shrink-0 ${allowNewTestimonials ? 'bg-emerald-600' : 'bg-neutral-700'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allowNewTestimonials ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div className="p-4 bg-neutral-950 border border-neutral-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <strong className="text-neutral-200 block font-semibold mb-1">Seção de Perguntas Frequentes (FAQ)</strong>
              <span className="text-neutral-500 block leading-relaxed text-[11px]">
                Controla a exibição do link e da página de Perguntas Frequentes no site público.
              </span>
            </div>
            <button
              onClick={handleToggleFaq}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer flex-shrink-0 ${showFaq ? 'bg-emerald-600' : 'bg-neutral-700'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showFaq ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
