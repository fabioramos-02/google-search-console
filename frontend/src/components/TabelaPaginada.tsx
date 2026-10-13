"use client";

import { ReactNode, useMemo, useState } from "react";
import { DsTable, DsButton } from "@plataforma-xvia/ds-react";
import type { Coluna } from "@/lib/csv";

type Props<T> = {
  caption: string;
  linhas: T[];
  colunas: Coluna<T>[];
  /** Tamanho de página (padrão 50). */
  porPagina?: number;
  /** Função opcional para ordenar as linhas antes da paginação. */
  ordenar?: (a: T, b: T) => number;
  /**
   * Função opcional que renderiza a célula da coluna "Ação" por linha.
   * Quando presente, a tabela usa HTML nativo (DsTable não aceita conteúdo React por célula).
   */
  acoesLinha?: (linha: T) => ReactNode;
};

/**
 * Tabela client-side paginada. Faz um slice do array e renderiza:
 * - DsTable quando NÃO há `acoesLinha` (modo clássico, sem interação por linha).
 * - Tabela HTML estilizada quando HÁ `acoesLinha` (precisa de botões React por linha).
 */
export function TabelaPaginada<T extends { url: string }>({
  caption,
  linhas,
  colunas,
  porPagina = 50,
  ordenar,
  acoesLinha,
}: Props<T>) {
  const [pagina, setPagina] = useState(0);

  const linhasOrdenadas = useMemo(
    () => (ordenar ? [...linhas].sort(ordenar) : linhas),
    [linhas, ordenar],
  );

  const totalPaginas = Math.max(1, Math.ceil(linhasOrdenadas.length / porPagina));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const inicio = paginaAtual * porPagina;
  const fim = inicio + porPagina;
  const visiveis = linhasOrdenadas.slice(inicio, fim);

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

  if (!linhasOrdenadas.length) {
    return <p>Nenhuma linha para mostrar.</p>;
  }

  return (
    <div>
      <div className="tabela-scroll">
        {acoesLinha ? (
          <table className="tabela-react" role="table" aria-label={caption}>
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                {colunas.map((c) => (
                  <th key={String(c.chave)}>{c.rotulo}</th>
                ))}
                <th aria-label="Ação" />
              </tr>
            </thead>
            <tbody>
              {visiveis.map((linha, i) => (
                <tr key={`${inicio + i}-${linha.url}`}>
                  {colunas.map((c) => {
                    const bruto = c.formatar
                      ? c.formatar(linha)
                      : (linha as Record<string, unknown>)[String(c.chave)];
                    return <td key={String(c.chave)}>{String(bruto ?? "")}</td>;
                  })}
                  <td className="celula-acao">{acoesLinha(linha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <DsTable caption={caption} columns={colunasJson} rows={linhasJson} zebra />
        )}
      </div>
      <div className="paginacao-rodape">
        <span style={{ color: "var(--ds-color-text-muted)" }}>
          Mostrando {inicio + 1}–{Math.min(fim, linhasOrdenadas.length)} de {linhasOrdenadas.length}
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
