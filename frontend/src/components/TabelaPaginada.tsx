"use client";

import { useMemo, useState } from "react";
import { DsTable, DsButton } from "@plataforma-xvia/ds-react";
import type { Coluna } from "@/lib/csv";

type Props<T> = {
  caption: string;
  linhas: T[];
  colunas: Coluna<T>[];
  /** Tamanho de página (padrão 50). */
  porPagina?: number;
};

/**
 * Tabela client-side paginada. Faz um slice do array e renderiza o DsTable.
 * Sem truque: 50 em 50, botões Anterior/Próxima e indicador "X de Y".
 */
export function TabelaPaginada<T extends { url: string }>({
  caption,
  linhas,
  colunas,
  porPagina = 50,
}: Props<T>) {
  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(linhas.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaAtual * porPagina;
  const fim = inicio + porPagina;
  const visiveis = linhas.slice(inicio, fim);

  const colunasJson = useMemo(
    () => JSON.stringify(colunas.map((c) => ({ key: String(c.chave), label: c.rotulo }))),
    [colunas],
  );

  const linhasJson = useMemo(
    () =>
      JSON.stringify(
        visiveis.map((linha, i) => ({
          id: String(inicio + i),
          cells: Object.fromEntries(
            colunas.map((c) => {
              const valor = c.formatar ? c.formatar(linha) : (linha as Record<string, unknown>)[String(c.chave)];
              return [String(c.chave), valor ?? ""];
            }),
          ),
        })),
      ),
    [visiveis, colunas, inicio],
  );

  if (!linhas.length) {
    return <p>Nenhuma linha para mostrar.</p>;
  }

  return (
    <div>
      <div className="tabela-scroll">
        <DsTable caption={caption} columns={colunasJson} rows={linhasJson} zebra />
      </div>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          alignItems: "center",
          justifyContent: "flex-end",
          marginTop: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <span style={{ color: "var(--ds-color-text-muted)" }}>
          Mostrando {inicio + 1}–{Math.min(fim, linhas.length)} de {linhas.length}
        </span>
        <DsButton
          tone="secondary"
          size="sm"
          onClick={() => setPagina((p) => Math.max(0, p - 1))}
          disabled={paginaAtual === 0}
        >
          Anterior
        </DsButton>
        <span>
          Página {paginaAtual + 1} de {totalPaginas}
        </span>
        <DsButton
          tone="secondary"
          size="sm"
          onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))}
          disabled={paginaAtual >= totalPaginas - 1}
        >
          Próxima
        </DsButton>
      </div>
    </div>
  );
}
