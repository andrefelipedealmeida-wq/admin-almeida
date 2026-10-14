import React from 'react';
import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <div className="bg-black text-neutral-100 min-h-[80vh] py-24 font-sans px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white font-display">Termos de Uso (Rascunho)</h1>
        <p className="text-amber-500 font-bold bg-amber-950/30 p-4 border border-amber-500/20 rounded">
          Aviso: Este é um documento base que exige revisão profissional antes de entrar em vigor.
        </p>
        <p className="text-neutral-300">
          Ao utilizar este portal, o usuário compreende que os conteúdos aqui disponibilizados possuem caráter estritamente informativo e não substituem a consulta jurídica individualizada.
        </p>
        <p className="text-neutral-300">
          (Os termos completos de uso do portal devem ser inseridos aqui após validação).
        </p>
        <div className="pt-8">
          <Link to="/" className="text-emerald-500 hover:text-emerald-400">← Voltar para o início</Link>
        </div>
      </div>
    </div>
  );
}
