/**
 * Helpers de CSV no navegador (sem lib externa).
 *
 * baixarCsv(nome, linhas, colunas) monta um CSV e dispara download.
 * Qualquer valor com vírgula, aspas ou quebra de linha é escapado por RFC 4180.
 */

export type Coluna<T> = {
  chave: keyof T | string;
  rotulo: string;
  /** Converte o valor da linha pra string. Padrão: String(valor ?? ""). */
  formatar?: (linha: T) => string;
};

function escapar(valor: unknown): string {
  const texto = valor == null ? "" : String(valor);
  // Precisa escapar se tiver aspas, vírgula, ponto-vírgula ou quebra de linha.
  if (/[",;\n\r]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

export function montarCsv<T>(linhas: T[], colunas: Coluna<T>[]): string {
  const cabecalho = colunas.map((c) => escapar(c.rotulo)).join(",");
  const corpo = linhas
    .map((linha) =>
      colunas
        .map((c) => {
          const bruto = c.formatar ? c.formatar(linha) : (linha as Record<string, unknown>)[c.chave as string];
          return escapar(bruto);
        })
        .join(","),
    )
    .join("\n");
  // BOM pra Excel reconhecer UTF-8.
  return "﻿" + cabecalho + "\n" + corpo + "\n";
}

export function baixarCsv<T>(nome: string, linhas: T[], colunas: Coluna<T>[]): void {
  const texto = montarCsv(linhas, colunas);
  const blob = new Blob([texto], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome.endsWith(".csv") ? nome : `${nome}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
