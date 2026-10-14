import React from 'react';
import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <div className="bg-black text-neutral-100 min-h-[80vh] py-24 font-sans px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white font-display">Política de Privacidade (Rascunho)</h1>
        <p className="text-amber-500 font-bold bg-amber-950/30 p-4 border border-amber-500/20 rounded">
          Aviso: Este é um documento base. As informações sobre coleta, retenção de dados e integrações (ex: Web3Forms, Firebase) devem ser revisadas e validadas juridicamente antes da publicação final.
        </p>
        <p className="text-neutral-300">
          A Almeida Advocacia preza pela privacidade de seus clientes e usuários. Coletamos apenas os dados essenciais para o retorno de contatos e agendamentos, como nome, e-mail e telefone.
        </p>
        <p className="text-neutral-300">
          (As práticas detalhadas de tratamento de dados e cookies devem ser inseridas aqui após validação).
        </p>
        <div className="pt-8">
          <Link to="/" className="text-emerald-500 hover:text-emerald-400">← Voltar para o início</Link>
        </div>
      </div>
    </div>
  );
}
