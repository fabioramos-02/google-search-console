"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DsAlert, DsBadge, DsButton, DsInput } from "@plataforma-xvia/ds-react";

import { estaLogado } from "@/lib/auth";

type DadosTermos = {
  padrao: string[];
  custom: string[];
  regras_url: { pattern: string; termo: string }[];
};

export function TermosCliente({ apiBase }: { apiBase: string }) {
  const router = useRouter();
  const [dados, setDados] = useState<DadosTermos | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novoTermo, setNovoTermo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [sucesso, setSucesso] = useState<string | null>(null);

  useEffect(() => {
    if (!estaLogado()) {
      router.replace("/login");
      return;
    }
    fetch(`${apiBase}/termos`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
        return r.json();
      })
      .then(setDados)
      .catch((e) => setErro(String(e.message || e)));
  }, [apiBase, router]);

  if (erro) {
    return (
      <DsAlert tone="danger" heading="Erro ao carregar termos">
        {erro}
      </DsAlert>
    );
  }

  if (!dados) {
    return <p>Carregando…</p>;
  }

  function adicionar() {
    const t = novoTermo.trim();
    if (!t) return;
    if (dados!.padrao.includes(t)) {
      setErro(`"${t}" já existe na lista padrão.`);
      return;
    }
    if (dados!.custom.includes(t)) {
      setErro(`"${t}" já está nos customizados.`);
      return;
    }
    setDados({ ...dados!, custom: [...dados!.custom, t] });
    setNovoTermo("");
    setErro(null);
  }

  function remover(termo: string) {
    setDados({ ...dados!, custom: dados!.custom.filter((t) => t !== termo) });
  }

  async function salvar() {
    setSalvando(true);
    setErro(null);
    setSucesso(null);
    try {
      const r = await fetch(`${apiBase}/termos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom: dados!.custom }),
      });
      if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
      const body = await r.json();
      setDados({ ...dados!, custom: body.custom });
      setSucesso(`Salvo: ${body.custom.length} termo(s) customizado(s).`);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <section className="painel">
        <h2 style={{ marginTop: 0 }}>
          Termos padrão <DsBadge tone="info">imutáveis</DsBadge>
        </h2>
        <p style={{ color: "var(--ds-color-text-muted)", margin: "0 0 0.75rem" }}>
          Lista base definida no código ({dados.padrao.length} termos). Para alterar, mexa em{" "}
          <code>filtrar.py</code>.
        </p>
        <ListaInline itens={dados.padrao} />
      </section>

      <section className="painel">
        <h2 style={{ marginTop: 0 }}>
          Regras automáticas de URL <DsBadge tone="warning">fixas</DsBadge>
        </h2>
        <p style={{ color: "var(--ds-color-text-muted)", margin: "0 0 0.75rem" }}>
          Padrões específicos de URL (ex: SEO hack em WordPress) que sempre marcam a URL como suspeita.
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
          {dados.regras_url.map((r) => (
            <li key={r.pattern}>
              <code>{r.pattern}</code> → termo <strong>{r.termo}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="painel">
        <h2 style={{ marginTop: 0 }}>Termos customizados</h2>
        <p style={{ color: "var(--ds-color-text-muted)", margin: "0 0 0.75rem" }}>
          Adicione termos novos sem mexer no código. Salvar envia pro servidor e recarrega o filtro.
        </p>

        <div className="form-linha" style={{ alignItems: "flex-end" }}>
          <DsInput
            label="Novo termo"
            name="novo"
            value={novoTermo}
            onDsChange={(e) => setNovoTermo(e.detail.value)}
            placeholder="ex: nova-palavra-chave"
          />
          <DsButton tone="secondary" onClick={adicionar} disabled={!novoTermo.trim()}>
            Adicionar à lista
          </DsButton>
        </div>

        {dados.custom.length ? (
          <ul className="lista-custom">
            {dados.custom.map((t) => (
              <li key={t}>
                <span>{t}</span>
                <DsButton tone="tertiary" size="sm" onClick={() => remover(t)}>
                  Remover
                </DsButton>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum termo customizado ainda.</p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <DsButton tone="primary" onClick={salvar} loading={salvando}>
            Salvar alterações
          </DsButton>
        </div>

        {sucesso && (
          <DsAlert tone="success" heading="Pronto">
            {sucesso}
          </DsAlert>
        )}
      </section>
    </>
  );
}

function ListaInline({ itens }: { itens: string[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
      {itens.map((i) => (
        <span key={i} className="chip-termo">
          {i}
        </span>
      ))}
    </div>
  );
}
