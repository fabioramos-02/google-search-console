"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DsSelect,
  DsNumberInput,
  DsButton,
  DsAlert,
  DsFileDrop,
  DsBadge,
} from "@plataforma-xvia/ds-react";

import { TabelaPaginada } from "@/components/TabelaPaginada";
import { baixarCsv, type Coluna } from "@/lib/csv";
import { estaLogado, sair } from "@/lib/auth";

type Pagina = {
  url: string;
  cliques?: number;
  impressoes?: number;
  ctr?: number;
  posicao?: number;
  termos?: string[];
};

type Resultado = {
  site?: string;
  inicio?: string;
  fim?: string;
  total: number;
  maliciosas: Pagina[];
  limpas: Pagina[];
  coluna_usada?: string;
};

type Modo = "csv" | "api";

const colunasApi: Coluna<Pagina>[] = [
  { chave: "url", rotulo: "URL" },
  { chave: "termos", rotulo: "Termos encontrados", formatar: (p) => (p.termos ?? []).join(", ") },
  { chave: "cliques", rotulo: "Cliques", formatar: (p) => String(p.cliques ?? 0) },
  { chave: "impressoes", rotulo: "Impressões", formatar: (p) => String(p.impressoes ?? 0) },
];

const colunasCsv: Coluna<Pagina>[] = [{ chave: "url", rotulo: "URL" }];

export function AuditoriaCliente({ apiBase }: { apiBase: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const modo: Modo = sp.get("modo") === "api" ? "api" : "csv";
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  return (
    <>
      <div className="auditoria-topbar">
        <DsBadge tone={modo === "api" ? "info" : "success"}>
          {modo === "api" ? "Modo API (precisa login)" : "Modo CSV (sem login)"}
        </DsBadge>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <DsButton
            tone="secondary"
            size="sm"
            onClick={() => router.push(modo === "api" ? "/auditoria?modo=csv" : "/auditoria?modo=api")}
          >
            Trocar para {modo === "api" ? "CSV" : "API"}
          </DsButton>
        </div>
      </div>

      {modo === "api" ? (
        <PainelApi
          apiBase={apiBase}
          onResultado={setResultado}
          onErro={setErro}
          carregando={carregando}
          setCarregando={setCarregando}
        />
      ) : (
        <PainelCsv
          apiBase={apiBase}
          onResultado={setResultado}
          onErro={setErro}
          carregando={carregando}
          setCarregando={setCarregando}
        />
      )}

      {erro && (
        <DsAlert tone="danger" heading="Falha ao auditar">
          {erro}
        </DsAlert>
      )}

      {resultado && <Resultado resultado={resultado} />}
    </>
  );
}

/* ---------------- Modo API (precisa login) ---------------- */

type PainelProps = {
  apiBase: string;
  onResultado: (r: Resultado | null) => void;
  onErro: (e: string | null) => void;
  carregando: boolean;
  setCarregando: (v: boolean) => void;
};

function PainelApi({ apiBase, onResultado, onErro, carregando, setCarregando }: PainelProps) {
  const router = useRouter();
  const [logado, setLogado] = useState(false);
  const [sites, setSites] = useState<string[]>([]);
  const [erroSites, setErroSites] = useState<string | null>(null);
  const [site, setSite] = useState("");
  const [dias, setDias] = useState("90");

  useEffect(() => {
    setLogado(estaLogado());
  }, []);

  useEffect(() => {
    if (!logado) return;
    fetch(`${apiBase}/sites`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setSites(d.sites))
      .catch((e) => setErroSites(String(e.message || e)));
  }, [apiBase, logado]);

  async function auditar() {
    if (!site) return;
    setCarregando(true);
    onErro(null);
    onResultado(null);
    try {
      const r = await fetch(`${apiBase}/paginas?site=${encodeURIComponent(site)}&dias=${dias}`);
      if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
      onResultado(await r.json());
    } catch (e: unknown) {
      onErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  if (!logado) {
    return (
      <div className="painel painel-aviso">
        <h2 style={{ marginTop: 0 }}>Esse modo precisa de login</h2>
        <p>
          A API do Google Search Console só funciona com uma credencial oficial. Entre com o usuário do painel pra
          continuar.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <DsButton tone="primary" onClick={() => router.push("/login")}>
            Entrar
          </DsButton>
          <DsButton tone="secondary" onClick={() => router.push("/auditoria?modo=csv")}>
            Usar o modo CSV (sem login)
          </DsButton>
        </div>
      </div>
    );
  }

  return (
    <div className="painel">
      {erroSites && (
        <DsAlert tone="warning" heading="Credencial do GSC indisponível">
          {erroSites}
        </DsAlert>
      )}
      <div className="form-linha">
        <DsSelect
          label="Site"
          name="site"
          value={site}
          onDsSelectChange={(e) => setSite(e.detail.value)}
          options={JSON.stringify(sites.map((s) => ({ value: s, label: s })))}
          disabled={!sites.length}
          placeholder="Selecione uma propriedade"
        />
        <DsNumberInput
          label="Dias"
          name="dias"
          value={dias}
          min={1}
          max={480}
          onDsChange={(e) => setDias(e.detail.value)}
        />
        <DsButton tone="primary" onClick={auditar} disabled={!site || carregando} loading={carregando}>
          Auditar
        </DsButton>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <DsButton
          tone="tertiary"
          size="sm"
          onClick={() => {
            sair();
            setLogado(false);
            onResultado(null);
          }}
        >
          Sair
        </DsButton>
      </div>
    </div>
  );
}

/* ---------------- Modo CSV (sem login) ---------------- */

function PainelCsv({ apiBase, onResultado, onErro, carregando, setCarregando }: PainelProps) {
  async function auditar(file: File) {
    setCarregando(true);
    onErro(null);
    onResultado(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${apiBase}/filtrar-csv`, { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
      onResultado(await r.json());
    } catch (e: unknown) {
      onErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="painel">
      <p style={{ margin: 0, color: "var(--ds-color-text-muted)" }}>
        Exporte do Search Console (Desempenho → Páginas → ⤓ Exportar → CSV) e solte aqui. Nada da sua credencial
        sai da máquina.
      </p>
      <DsFileDrop
        label="Arraste o CSV aqui ou clique pra escolher"
        accept=".csv"
        onDsChange={(e) => {
          const f = e.detail.files?.[0];
          if (f) auditar(f as unknown as File);
        }}
      />
      {carregando && <p>Analisando…</p>}
    </div>
  );
}

/* ---------------- Resultado (duas seções com download) ---------------- */

function Resultado({ resultado }: { resultado: Resultado }) {
  const modoApi = !!resultado.site;
  const colunas = modoApi ? colunasApi : colunasCsv;
  const stamp = new Date().toISOString().slice(0, 10);

  return (
    <>
      <DsAlert tone="info" heading="Resultado">
        {resultado.total} página(s) analisada(s) — <strong>{resultado.maliciosas.length} suspeita(s)</strong>,{" "}
        {resultado.limpas.length} limpa(s). Revisão humana obrigatória: termos como &quot;sexo&quot;, &quot;bet&quot; e
        &quot;crack&quot; têm uso legítimo em páginas gov.
      </DsAlert>

      <section className="painel painel-suspeito" style={{ marginTop: "1.5rem" }}>
        <header className="secao-cabecalho">
          <h2 style={{ margin: 0 }}>
            Suspeitas <DsBadge tone="danger">{String(resultado.maliciosas.length)}</DsBadge>
          </h2>
          <DsButton
            tone="secondary"
            onClick={() =>
              baixarCsv(`suspeitas-${modoApi ? "api" : "csv"}-${stamp}`, resultado.maliciosas, colunas)
            }
            disabled={!resultado.maliciosas.length}
          >
            Baixar CSV das suspeitas
          </DsButton>
        </header>
        {resultado.maliciosas.length ? (
          <TabelaPaginada
            caption="URLs com termos suspeitos"
            linhas={resultado.maliciosas}
            colunas={colunas}
          />
        ) : (
          <p>Nenhuma URL suspeita encontrada.</p>
        )}
      </section>

      <section className="painel" style={{ marginTop: "1.5rem" }}>
        <header className="secao-cabecalho">
          <h2 style={{ margin: 0 }}>
            Limpas <DsBadge tone="success">{String(resultado.limpas.length)}</DsBadge>
          </h2>
          <DsButton
            tone="secondary"
            onClick={() => baixarCsv(`limpas-${modoApi ? "api" : "csv"}-${stamp}`, resultado.limpas, colunas)}
            disabled={!resultado.limpas.length}
          >
            Baixar CSV das limpas
          </DsButton>
        </header>
        {resultado.limpas.length ? (
          <TabelaPaginada caption="URLs sem termos suspeitos" linhas={resultado.limpas} colunas={colunas} />
        ) : (
          <p>Nenhuma URL limpa.</p>
        )}
      </section>
    </>
  );
}
