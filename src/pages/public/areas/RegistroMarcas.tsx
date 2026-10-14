import React from 'react';
import AreaTemplate from '../../../components/AreaTemplate';
import { ShieldAlert } from 'lucide-react';

export default function RegistroMarcas() {
  return (
    <AreaTemplate
      seoTitle="Registro de Marcas | Almeida Advocacia"
      seoDescription="Proteção de propriedade intelectual. Pesquisa de viabilidade, depósito no INPI, acompanhamento processual e defesa de marca."
      canonical="/areas/registro-de-marcas"
      title="Registro de Marcas"
      subtitle="Proteção jurídica e exclusividade no uso de ativos de propriedade industrial."
      description={
        <div className="space-y-4">
          <p>
            O registro da marca no INPI (Instituto Nacional da Propriedade Industrial) é o único meio legal de garantir o direito de uso exclusivo de um nome ou logotipo comercial em todo o território nacional.
          </p>
          <p>
            Oferecemos suporte integral, desde a pesquisa prévia de anterioridade e viabilidade até a emissão do certificado de concessão, acompanhando todas as publicações e prazos da autarquia federal.
          </p>
          <p>
            Nossa atuação inclui também a proteção ativa do patrimônio marcário do cliente, mediante oposições a registros de terceiros, notificações extrajudiciais contra uso indevido e estruturação de contratos de licenciamento.
          </p>
        </div>
      }
      highlights={[
        'Pesquisa preliminar de viabilidade',
        'Depósito e acompanhamento de processo no INPI',
        'Defesa contra exigências e oposições',
        'Notificações contra concorrência desleal e uso indevido',
        'Contratos de cessão e licenciamento de marca',
        'Prorrogação de registros e monitoramento'
      ]}
      image="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80"
      icon={ShieldAlert}
    />
  );
}
