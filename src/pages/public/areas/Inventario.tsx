import React from 'react';
import AreaTemplate from '../../../components/AreaTemplate';
import { ScrollText } from 'lucide-react';

export default function Inventario() {
  return (
    <AreaTemplate
      seoTitle="Inventário e Partilha | Almeida Advocacia"
      seoDescription="Atuação em inventários judiciais e extrajudiciais, partilha de bens e regularização sucessória com discrição, ética e respeito aos herdeiros."
      canonical="/areas/inventario"
      title="Inventário"
      subtitle="Organização sucessória e partilha de bens conduzida com respeito, agilidade e rigor legal."
      description={
        <div className="space-y-4">
          <p>
            O momento da sucessão patrimonial exige não apenas conhecimento técnico apurado, mas também sensibilidade no trato com as relações familiares. Atuamos de forma a minimizar conflitos e conferir eficiência à partilha de bens.
          </p>
          <p>
            A condução do inventário, seja pela via judicial ou extrajudicial (em cartório), é realizada com o objetivo de assegurar que a vontade do falecido e os direitos dos herdeiros sejam plenamente respeitados e efetivados.
          </p>
          <p>
            Assessoramos na apuração de acervo patrimonial, negociação entre herdeiros, recolhimento de tributos (ITCMD) e regularização da transferência dos bens para os sucessores legítimos.
          </p>
        </div>
      }
      highlights={[
        'Inventário extrajudicial em cartório',
        'Inventário judicial litigioso ou consensual',
        'Cálculo e orientação sobre impostos sucessórios',
        'Partilha de bens móveis e imóveis',
        'Análise e validação de testamentos',
        'Representação de herdeiros'
      ]}
      image="https://images.unsplash.com/photo-1589391886645-d51941baf7fb?auto=format&fit=crop&q=80"
      icon={ScrollText}
    />
  );
}
