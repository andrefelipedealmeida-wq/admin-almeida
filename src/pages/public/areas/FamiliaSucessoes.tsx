import React from 'react';
import AreaTemplate from '../../../components/AreaTemplate';
import { Users } from 'lucide-react';

export default function FamiliaSucessoes() {
  return (
    <AreaTemplate
      seoTitle="Direito de Família e Sucessões | Almeida Advocacia"
      seoDescription="Atuação em divórcios, guarda, pensão alimentícia, reconhecimento de união estável e planejamento sucessório."
      canonical="/areas/familia-e-sucessoes"
      title="Família e Sucessões"
      subtitle="Atuação pautada pela discrição e pela busca de resoluções equilibradas para conflitos familiares."
      description={
        <div className="space-y-4">
          <p>
            O Direito de Família exige abordagens que preservem o bem-estar dos envolvidos, minimizando os desgastes emocionais. O escritório prioriza sempre que possível os métodos consensuais, sem abdicar da atuação judicial firme quando necessária.
          </p>
          <p>
            Nossa equipe oferece consultoria e representação legal em demandas que envolvem dissoluções conjugais, fixação e revisão de alimentos, regulamentação de guarda e planejamento do futuro patrimonial da família.
          </p>
          <p>
            Tratamos cada questão com o máximo sigilo e responsabilidade, buscando a segurança jurídica para o cliente e a proteção dos interesses de menores e incapazes envolvidos.
          </p>
        </div>
      }
      highlights={[
        'Divórcio consensual e litigioso',
        'Reconhecimento e dissolução de união estável',
        'Pensão alimentícia (fixação, revisão e execução)',
        'Guarda de filhos e regime de convivência',
        'Planejamento sucessório e patrimonial familiar',
        'Investigação e reconhecimento de paternidade'
      ]}
      image="https://images.unsplash.com/photo-1590402494682-cd3fb53b1f70?auto=format&fit=crop&q=80"
      icon={Users}
    />
  );
}
