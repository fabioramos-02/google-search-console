/**
 * Reclassificações manuais de URL (suspeita <-> limpa).
 *
 * Guardado em sessionStorage sob a chave `gsc:override:{sessao}` onde
 * `sessao = site|inicio|fim` (ou `csv|<nome-coluna>|<timestamp>` para auditoria via upload).
 *
 * Formato: {"<url>": "suspeita" | "limpa"}.
 */

export type StatusManual = "suspeita" | "limpa";
export type Overrides = Record<string, StatusManual>;

function chave(sessao: string) {
  return `gsc:override:${sessao}`;
}

export function obter(sessao: string): Overrides {
  if (typeof window === "undefined") return {};
  try {
    const bruto = window.sessionStorage.getItem(chave(sessao));
    return bruto ? (JSON.parse(bruto) as Overrides) : {};
  } catch {
    return {};
  }
}

export function aplicar(sessao: string, url: string, destino: StatusManual): Overrides {
  const atual = obter(sessao);
  atual[url] = destino;
  window.sessionStorage.setItem(chave(sessao), JSON.stringify(atual));
  return atual;
}

export function remover(sessao: string, url: string): Overrides {
  const atual = obter(sessao);
  delete atual[url];
  window.sessionStorage.setItem(chave(sessao), JSON.stringify(atual));
  return atual;
}

export function limpar(sessao: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(chave(sessao));
}
