"use client";

import { useMemo } from "react";
import { DsBadge } from "@plataforma-xvia/ds-react";

type LinhaBase = {
  url: string;
  termos?: string[];
  cliques?: number;
  impressoes?: number;
};

type Agregado = {
  termo: string;
  urls: number;
  cliques: number;
  impressoes: number;
};

export function PainelEstatisticas({
  linhas,
  limite = 10,
}: {
  linhas: LinhaBase[];
  limite?: number;
}) {
  const topo = useMemo(() => agregar(linhas).slice(0, limite), [linhas, limite]);

  if (!topo.length) {
    return (
      <div className="painel estatisticas-vazio">
        <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Termos mais encontrados</h2>
        <p style={{ margin: 0, color: "var(--ds-color-text-muted)" }}>
          Nenhum termo suspeito identificado nesta auditoria.
        </p>
      </div>
    );
  }

  return (
    <div className="painel">
      <header className="estatisticas-cabecalho">
        <h2 style={{ margin: 0, fontSize: "1rem" }}>Termos mais encontrados</h2>
        <span style={{ color: "var(--ds-color-text-muted)", fontSize: "0.85rem" }}>
          Top {topo.length} por volume de URLs
        </span>
      </header>
      <ul className="estatisticas-lista">
        {topo.map((a) => (
          <li key={a.termo}>
            <div className="estatisticas-item">
              <DsBadge tone="danger">{a.termo}</DsBadge>
              <span className="estatisticas-metricas">
                <strong>{a.urls}</strong> URL(s)
                {a.cliques > 0 && (
                  <>
                    {" · "}
                    {a.cliques.toLocaleString("pt-BR")} clique(s)
                  </>
                )}
                {a.impressoes > 0 && (
                  <>
                    {" · "}
                    {a.impressoes.toLocaleString("pt-BR")} impressõe(s)
                  </>
                )}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function agregar(linhas: LinhaBase[]): Agregado[] {
  const mapa = new Map<string, Agregado>();
  for (const linha of linhas) {
    for (const termo of linha.termos ?? []) {
      const atual = mapa.get(termo) ?? { termo, urls: 0, cliques: 0, impressoes: 0 };
      atual.urls += 1;
      atual.cliques += linha.cliques ?? 0;
      atual.impressoes += linha.impressoes ?? 0;
      mapa.set(termo, atual);
    }
  }
  return Array.from(mapa.values()).sort((a, b) => b.urls - a.urls || b.impressoes - a.impressoes);
}
