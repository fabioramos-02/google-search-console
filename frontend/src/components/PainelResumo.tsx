"use client";

/**
 * 4 cards de métricas no topo da auditoria: analisadas, suspeitas, limpas, pendentes.
 * Visual simples — grid responsivo, uma métrica por card.
 */

type Metrica = {
  rotulo: string;
  valor: number | string;
  detalhe?: string;
  tom?: "neutro" | "danger" | "success" | "info";
};

export function PainelResumo({ metricas }: { metricas: Metrica[] }) {
  return (
    <div className="painel-resumo">
      {metricas.map((m) => (
        <div key={m.rotulo} className={`resumo-card resumo-tom-${m.tom ?? "neutro"}`}>
          <span className="resumo-rotulo">{m.rotulo}</span>
          <span className="resumo-valor">{formatar(m.valor)}</span>
          {m.detalhe && <span className="resumo-detalhe">{m.detalhe}</span>}
        </div>
      ))}
    </div>
  );
}

function formatar(valor: number | string) {
  if (typeof valor === "number") return valor.toLocaleString("pt-BR");
  return valor;
}
