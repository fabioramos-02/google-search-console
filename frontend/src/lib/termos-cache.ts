/**
 * Cache de /termos no localStorage. Stale-while-revalidate:
 * - UI lê do cache instantâneo
 * - Em paralelo, dispara GET /termos pra refrescar
 * - Após POST (salvar), sobrescreve o cache
 */

export type DadosTermos = {
  padrao: string[];
  custom: string[];
  regras_url: { pattern: string; termo: string }[];
};

const CHAVE = "gsc:termos:v1";
const TTL_MS = 5 * 60 * 1000; // 5min — depois disso ignora o cache no primeiro load

type Entrada = { ts: number; dados: DadosTermos };

export function lerCache(): DadosTermos | null {
  if (typeof window === "undefined") return null;
  try {
    const bruto = window.localStorage.getItem(CHAVE);
    if (!bruto) return null;
    const e = JSON.parse(bruto) as Entrada;
    if (Date.now() - e.ts > TTL_MS) return null;
    return e.dados;
  } catch {
    return null;
  }
}

export function gravarCache(dados: DadosTermos): void {
  if (typeof window === "undefined") return;
  try {
    const e: Entrada = { ts: Date.now(), dados };
    window.localStorage.setItem(CHAVE, JSON.stringify(e));
  } catch {
    // sem drama se localStorage cheio
  }
}

export function limparCache(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CHAVE);
}
