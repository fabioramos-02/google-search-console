"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { DsButton, DsAlert, DsInput } from "@plataforma-xvia/ds-react";

import { entrar, estaLogado } from "@/lib/auth";

export function LoginCliente({ apiBase }: { apiBase: string }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Se já estiver logado, pula direto pra auditoria.
  useEffect(() => {
    if (estaLogado()) router.replace("/auditoria");
  }, [router]);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      const r = await fetch(`${apiBase}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.detail || "Falha no login.");
      }
      entrar();
      router.replace("/auditoria");
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="painel login-card">
      <DsInput
        label="Usuário"
        name="usuario"
        value={usuario}
        onDsChange={(e) => setUsuario(e.detail.value)}
        required
        autocomplete="username"
      />
      <DsInput
        label="Senha"
        name="senha"
        type="password"
        value={senha}
        onDsChange={(e) => setSenha(e.detail.value)}
        required
        autocomplete="current-password"
      />
      {erro && (
        <DsAlert tone="danger" heading="Não entrou">
          {erro}
        </DsAlert>
      )}
      <DsButton tone="primary" type="submit" loading={enviando} disabled={!usuario || !senha || enviando}>
        Entrar
      </DsButton>
    </form>
  );
}
