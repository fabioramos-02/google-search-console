"use client";

import { useEffect, useState } from "react";
import {
  DsSelect,
  DsNumberInput,
  DsButton,
  DsTable,
  DsAlert,
  DsFileDrop,
  DsTabs,
  DsTab,
  DsBadge,
} from "@plataforma-xvia/ds-react";

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

const COLUNAS_API = JSON.stringify([
  { key: "url", label: "URL" },
  { key: "termos", label: "Termos encontrados" },
  { key: "cliques", label: "Cliques", align: "right" },
  { key: "impressoes", label: "Impressões", align: "right" },
]);

const COLUNAS_CSV = JSON.stringify([{ key: "url", label: "URL" }]);

export function AuditoriaCliente({ apiBase }: { apiBase: string }) {
  const [sites, setSites] = useState<string[]>([]);
  const [erroSites, setErroSites] = useState<string | null>(null);
  const [site, setSite] = useState("");
  const [dias, setDias] = useState("90");
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiBase}/sites`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setSites(d.sites))
      .catch((e) => setErroSites(String(e.message || e)));
  }, [apiBase]);

  async function auditarApi() {
    if (!site) return;
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await fetch(`${apiBase}/paginas?site=${encodeURIComponent(site)}&dias=${dias}`);
      if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
      setResultado(await r.json());
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  async function auditarCsv(file: File) {
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`${apiBase}/filtrar-csv`, { method: "POST", body: fd });
      if (!r.ok) throw new Error((await r.json()).detail || `HTTP ${r.status}`);
      setResultado(await r.json());
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  const linhasTabela = (pags: Pagina[], modoApi: boolean) =>
    JSON.stringify(
      pags.map((p, i) => ({
        id: String(i),
        cells: {
          url: p.url,
          ...(modoApi
            ? {
                termos: (p.termos ?? []).join(", "),
                cliques: p.cliques ?? 0,
                impressoes: p.impressoes ?? 0,
              }
            : {}),
        },
      })),
    );

  return (
    <>
      <DsTabs label="Modo de auditoria">
        <DsTab panel="api" selected>Via API do GSC</DsTab>
        <DsTab panel="csv">Via CSV manual</DsTab>
      </DsTabs>

      <div id="api" className="painel">
        {erroSites && (
          <DsAlert tone="warning" heading="Credencial do GSC indisponível">
            {erroSites}. Configure <code>credenciais.json</code> ou use a aba &quot;Via CSV manual&quot;.
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
          <DsButton
            tone="primary"
            onClick={auditarApi}
            disabled={!site || carregando}
            loading={carregando}
          >
            Auditar
          </DsButton>
        </div>
      </div>

      <div id="csv" className="painel">
        <DsFileDrop
          label="Envie o CSV exportado do Search Console"
          accept=".csv"
          onDsChange={(e) => {
            const f = e.detail.files?.[0];
            if (f) auditarCsv(f as unknown as File);
          }}
        />
      </div>

      {erro && (
        <DsAlert tone="danger" heading="Falha ao auditar">
          {erro}
        </DsAlert>
      )}

      {resultado && (
        <>
          <DsAlert tone="info" heading="Resultado">
            {resultado.total} página(s) analisada(s) —{" "}
            <strong>{resultado.maliciosas.length} suspeita(s)</strong>,{" "}
            {resultado.limpas.length} limpa(s). Revisão humana obrigatória: termos como
            &quot;sexo&quot;, &quot;bet&quot; e &quot;crack&quot; têm uso legítimo em sites gov.
          </DsAlert>

          {resultado.maliciosas.length > 0 && (
            <>
              <h2 style={{ marginTop: "1.5rem" }}>
                Suspeitas <DsBadge tone="danger">{String(resultado.maliciosas.length)}</DsBadge>
              </h2>
              <DsTable
                caption="URLs com termos suspeitos"
                columns={resultado.site ? COLUNAS_API : COLUNAS_CSV}
                rows={linhasTabela(resultado.maliciosas, !!resultado.site)}
                zebra
              />
            </>
          )}
        </>
      )}
    </>
  );
}
