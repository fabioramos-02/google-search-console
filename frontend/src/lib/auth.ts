/**
 * Login client-side simples.
 *
 * O backend valida usuário/senha em POST /login contra variáveis de ambiente.
 * Se ok, salvamos uma flag no sessionStorage e as páginas protegidas aceitam entrar.
 *
 * Isso NÃO é segurança real — não há token, não há proteção de rotas no backend.
 * Serve como gate contra uso casual. Pra uso em produção séria, trocar por sessão
 * HTTP-only + proteção nos endpoints.
 */

const CHAVE = "gsc:logado";

export function estaLogado(): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(CHAVE) === "1";
}

export function entrar(): void {
  window.sessionStorage.setItem(CHAVE, "1");
}

export function sair(): void {
  window.sessionStorage.removeItem(CHAVE);
}
