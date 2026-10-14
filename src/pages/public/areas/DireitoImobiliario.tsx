import React from 'react';
import AreaTemplate from '../../../components/AreaTemplate';
import { Home } from 'lucide-react';

export default function DireitoImobiliario() {
  return (
    <AreaTemplate
      seoTitle="Direito Imobiliário | Almeida Advocacia"
      seoDescription="Assessoria jurídica especializada em Direito Imobiliário. Regularização de imóveis, usucapião, análise de contratos, auditoria prévia e questões patrimoniais."
      canonical="/areas/direito-imobiliario"
      title="Direito Imobiliário"
      subtitle="Segurança jurídica na proteção do patrimônio e na concretização de negócios imobiliários."
      description={
        <div className="space-y-4">
          <p>
            O Direito Imobiliário exige rigor técnico e cautela para garantir a segurança das transações e a efetiva proteção do patrimônio. O escritório atua de maneira estratégica, prevenindo riscos e resolvendo conflitos sobre bens imóveis.
          </p>
          <p>
            A prática envolve tanto a elaboração e análise de instrumentos contratuais complexos quanto a representação em demandas administrativas e judiciais. Nosso foco é oferecer soluções personalizadas para garantir a validade dos negócios e a titularidade dos bens.
          </p>
          <p>
            Nossa estrutura está preparada para escalar e atender questões como regularização de imóveis, usucapião, distratos, e disputas de posse e propriedade, adaptando a estratégia legal à realidade de cada cliente.
          </p>
        </div>
      }
      highlights={[
        'Análise de riscos (auditoria prévia) na compra e venda',
        'Regularização de imóveis e Usucapião',
        'Assessoria em contratos de locação',
        'Resolução de disputas sobre posse e propriedade',
        'Distratos e rescisões contratuais',
        'Questões condominiais'
      ]}
      image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80"
      icon={Home}
    />
  );
}
