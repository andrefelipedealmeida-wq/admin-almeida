import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleHardReset = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
    }
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-neutral-950 rounded-2xl shadow-2xl p-8 border border-neutral-850 space-y-6">
            <div className="flex items-center justify-center space-x-3">
              <img src="/imagens/logo.png" alt="Almeida Advocacia" className="w-10 h-10 object-contain" />
              <div className="flex flex-col text-left">
                <span className="text-base font-black text-white tracking-[0.25em] font-cambria">ALMEIDA</span>
                <span className="text-[10px] font-bold text-emerald-500 tracking-[0.28em] -mt-1 font-cambria">ADVOCACIA</span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Recuperação do Sistema</h2>
              <p className="text-neutral-400 text-xs leading-relaxed">
                Ocorreu uma atualização recente nos arquivos do portal ou uma oscilação na conexão. Clique abaixo para recarregar o sistema com os dados atualizados.
              </p>
            </div>

            {this.state.error?.message && (
              <pre className="text-left text-[11px] bg-red-950/40 border border-red-900/40 text-red-400 p-3.5 rounded-lg overflow-x-auto max-h-32 font-mono">
                {this.state.error.message}
              </pre>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleHardReset}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs tracking-widest uppercase rounded-xl transition-all shadow-lg shadow-emerald-950/50 cursor-pointer"
              >
                Limpar Cache e Recarregar Portal
              </button>
              <button
                onClick={() => window.location.href = "/"}
                className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-850 text-neutral-300 font-bold text-xs tracking-wider rounded-xl transition-all border border-neutral-800 cursor-pointer"
              >
                Ir para o Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

