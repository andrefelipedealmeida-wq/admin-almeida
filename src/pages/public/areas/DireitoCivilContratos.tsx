import React from 'react';
import AreaTemplate from '../../../components/AreaTemplate';
import { Briefcase } from 'lucide-react';

export default function DireitoCivilContratos() {
  return (
    <AreaTemplate
      seoTitle="Direito Civil e Contratos | Almeida Advocacia"
      seoDescription="Assessoria preventiva e contenciosa. Elaboração e revisão de contratos, cobranças, execução de títulos e responsabilidade civil."
      canonical="/areas/direito-civil-e-contratos"
      title="Direito Civil e Contratos"
      subtitle="Prevenção de litígios e gestão estratégica de obrigações e contratos privados."
      description={
        <div className="space-y-4">
          <p>
            A assessoria em Direito Civil visa trazer clareza e previsibilidade às relações negociais. Atuamos de maneira preventiva na estruturação de acordos e, quando inevitável, em litígios (processos judiciais) para defesa dos interesses do cliente.
          </p>
          <p>
            O escritório elabora, analisa e revisa minutas contratuais de variados graus de complexidade, mitigando vulnerabilidades legais que possam resultar em disputas futuras ou perdas financeiras.
          </p>
          <p>
            Também representamos clientes em ações de cobrança judicial e extrajudicial, execuções de títulos de crédito, e pleitos indenizatórios decorrentes de responsabilidade contratual e extracontratual.
          </p>
        </div>
      }
      highlights={[
        'Elaboração e revisão técnica de contratos',
        'Notificações e negociações extrajudiciais',
        'Inadimplemento e rescisões contratuais',
        'Cobranças e execução de títulos (cheques, promissórias, duplicatas)',
        'Ações indenizatórias por perdas e danos',
        'Defesa em litígios de responsabilidade civil'
      ]}
      image="/imagens/contratos.png"
      icon={Briefcase}
    />
  );
}
