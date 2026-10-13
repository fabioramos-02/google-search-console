"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DsNumberInput,
  DsButton,
  DsAlert,
  DsFileDrop,
  DsBadge,
} from "@plataforma-xvia/ds-react";

import { TabelaPaginada } from "@/components/TabelaPaginada";
import { PainelResumo } from "@/components/PainelResumo";
import { PainelEstatisticas } from "@/components/PainelEstatisticas";
import { SelectBuscavel } from "@/components/SelectBuscavel";
import { baixarCsv, type Coluna } from "@/lib/csv";
import { estaLogado, sair } from "@/lib/auth";
import { aplicar, obter, remover, type Overrides, type StatusManual } from "@/lib/overrides";

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
type FiltroStatus = "todos" | "suspeita" | "limpa";

/** Linha enriquecida com status atual (automático ou override) + flag de reclassificação. */
type LinhaUnificada = Pagina & {
  statusAtual: "suspeita" | "limpa";
  statusAutomatico: "suspeita" | "limpa";
  reclassificado: boolean;
};

export function AuditoriaCliente({ apiBase }: { apiBase: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const modo: Modo = sp.get("modo") === "api" ? "api" : "csv";
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  // Evita hydration mismatch — os web components DS XVIA só montam no cliente.
  if (!montado) {
    return <p style={{ padding: "2rem" }}>Carregando…</p>;
  }

  return (
    <>
      <div className="auditoria-topbar" suppressHydrationWarning>
        <DsBadge tone={modo === "api" ? "info" : "success"}>
          {modo === "api" ? "Modo API (precisa login)" : "Modo CSV (sem login)"}
        </DsBadge>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }} suppressHydrationWarning>
          <DsButton tone="tertiary" size="sm" onClick={() => router.push("/termos")}>
            Gerir termos
          </DsButton>
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

      {resultado && <ResultadoUnificado resultado={resultado} />}
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
      <div className="painel painel-aviso" suppressHydrationWarning>
        <h2 style={{ marginTop: 0 }}>Esse modo precisa de login</h2>
        <p>
          A API do Google Search Console só funciona com uma credencial oficial. Entre com o usuário do painel pra
          continuar.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }} suppressHydrationWarning>
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
      <div className="form-linha" style={{ alignItems: "flex-end" }}>
        <SelectBuscavel
          label="Site"
          opcoes={sites}
          valor={site}
          onChange={setSite}
          disabled={!sites.length}
          placeholder="Digite para filtrar propriedades..."
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

/* ---------------- Resultado unificado ---------------- */

function ResultadoUnificado({ resultado }: { resultado: Resultado }) {
  const modoApi = !!resultado.site;
  const chaveSessao = useMemo(
    () =>
      modoApi
        ? `${resultado.site}|${resultado.inicio}|${resultado.fim}`
        : `csv|${resultado.coluna_usada ?? "col"}|${resultado.total}`,
    [modoApi, resultado],
  );

  const [overrides, setOverrides] = useState<Overrides>({});
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroTermo, setFiltroTermo] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setOverrides(obter(chaveSessao));
    setFiltroStatus("todos");
    setFiltroTermo("todos");
    setBusca("");
  }, [chaveSessao]);

  // Unifica suspeitas + limpas e aplica overrides.
  const linhas = useMemo<LinhaUnificada[]>(() => {
    const autoSuspeita = resultado.maliciosas.map((p) => ({ ...p, statusAutomatico: "suspeita" as const }));
    const autoLimpa = resultado.limpas.map((p) => ({ ...p, statusAutomatico: "limpa" as const }));
    return [...autoSuspeita, ...autoLimpa].map((p) => {
      const manual = overrides[p.url];
      const statusAtual = manual ?? p.statusAutomatico;
      return {
        ...p,
        statusAtual,
        reclassificado: !!manual && manual !== p.statusAutomatico,
      };
    });
  }, [resultado, overrides]);

  // Termos disponíveis pro dropdown de filtro.
  const termosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const l of linhas) {
      for (const t of l.termos ?? []) set.add(t);
    }
    return Array.from(set).sort();
  }, [linhas]);

  // Aplica filtros + busca.
  // Regra: se o usuário escolheu um termo específico, o filtro de status é ignorado
  // (termo é mais específico — queremos ver todas as URLs com esse termo).
  const visiveis = useMemo(() => {
    const buscaNorm = busca.trim().toLowerCase();
    const filtrarPorStatus = filtroTermo === "todos";
    return linhas.filter((l) => {
      if (filtrarPorStatus && filtroStatus !== "todos" && l.statusAtual !== filtroStatus) return false;
      if (filtroTermo !== "todos" && !(l.termos ?? []).includes(filtroTermo)) return false;
      if (buscaNorm && !l.url.toLowerCase().includes(buscaNorm)) return false;
      return true;
    });
  }, [linhas, filtroStatus, filtroTermo, busca]);

  // Totais do resumo (consideram overrides).
  const totalSuspeitas = linhas.filter((l) => l.statusAtual === "suspeita").length;
  const totalLimpas = linhas.filter((l) => l.statusAtual === "limpa").length;
  const totalPendentes = linhas.filter((l) => l.reclassificado).length;
  const pct = (n: number) => (linhas.length ? ((n / linhas.length) * 100).toFixed(1) : "0,0");

  function reclassificar(url: string, destinoAutomatico: "suspeita" | "limpa") {
    // Se o destino alvo é igual ao automático, zera override (volta a seguir automático).
    const linha = linhas.find((l) => l.url === url);
    if (!linha) return;
    const novoDestino: StatusManual = linha.statusAtual === "suspeita" ? "limpa" : "suspeita";
    const _unused = destinoAutomatico;
    void _unused;
    if (novoDestino === linha.statusAutomatico) {
      setOverrides(remover(chaveSessao, url));
    } else {
      setOverrides(aplicar(chaveSessao, url, novoDestino));
    }
  }

  // Colunas da tabela única.
  const colunas: Coluna<LinhaUnificada>[] = useMemo(() => {
    const base: Coluna<LinhaUnificada>[] = [
      { chave: "url", rotulo: "URL" },
      {
        chave: "statusAtual",
        rotulo: "Status",
        formatar: (l) =>
          l.statusAtual === "suspeita"
            ? l.reclassificado
              ? "Suspeita (manual)"
              : "Suspeita"
            : l.reclassificado
            ? "Limpa (manual)"
            : "Limpa",
      },
      { chave: "termos", rotulo: "Termos", formatar: (l) => (l.termos ?? []).join(", ") || "—" },
    ];
    if (modoApi) {
      base.push({ chave: "cliques", rotulo: "Cliques", formatar: (l) => String(l.cliques ?? 0) });
      base.push({ chave: "impressoes", rotulo: "Impressões", formatar: (l) => String(l.impressoes ?? 0) });
    }
    return base;
  }, [modoApi]);

  // Ordenação por relevância: suspeita primeiro, depois impressões desc, depois cliques.
  const ordenar = (a: LinhaUnificada, b: LinhaUnificada) => {
    const sa = a.statusAtual === "suspeita" ? 0 : 1;
    const sb = b.statusAtual === "suspeita" ? 0 : 1;
    if (sa !== sb) return sa - sb;
    return (b.impressoes ?? 0) - (a.impressoes ?? 0) || (b.cliques ?? 0) - (a.cliques ?? 0);
  };

  const stamp = new Date().toISOString().slice(0, 10);

  function exportar() {
    const colunasExport: Coluna<LinhaUnificada>[] = [
      ...colunas,
      {
        chave: "reclassificado",
        rotulo: "Reclassificado",
        formatar: (l) => (l.reclassificado ? "sim" : "não"),
      },
    ];
    const nome = `auditoria-${filtroStatus}-${stamp}`;
    baixarCsv(nome, visiveis, colunasExport);
  }

  return (
    <>
      <PainelResumo
        metricas={[
          { rotulo: "URLs analisadas", valor: linhas.length, tom: "neutro" },
          {
            rotulo: "Suspeitas",
            valor: totalSuspeitas,
            detalhe: `${pct(totalSuspeitas)}% do total`,
            tom: "danger",
          },
          { rotulo: "Limpas", valor: totalLimpas, detalhe: `${pct(totalLimpas)}% do total`, tom: "success" },
          {
            rotulo: "Reclassificadas",
            valor: totalPendentes || "—",
            detalhe: totalPendentes ? "override manual na sessão" : "nenhuma",
            tom: "info",
          },
        ]}
      />

      <PainelEstatisticas linhas={linhas.filter((l) => l.statusAtual === "suspeita")} limite={10} />

      <section className="painel">
        <header className="secao-cabecalho">
          <h2 style={{ margin: 0, fontSize: "1rem" }}>URLs auditadas</h2>
          <DsButton tone="secondary" size="sm" onClick={exportar} disabled={!visiveis.length}>
            Exportar CSV ({visiveis.length})
          </DsButton>
        </header>

        <div className="barra-filtros">
          <div>
            <label className="select-buscavel-label" htmlFor="filtro-status">
              Status
            </label>
            <select
              id="filtro-status"
              className="select-buscavel-input"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
            >
              <option value="todos">Todos os status</option>
              <option value="suspeita">Suspeita</option>
              <option value="limpa">Limpa</option>
            </select>
          </div>
          <div>
            <label className="select-buscavel-label" htmlFor="filtro-termo">
              Termo
            </label>
            <select
              id="filtro-termo"
              className="select-buscavel-input"
              value={filtroTermo}
              onChange={(e) => {
                const v = e.target.value;
                setFiltroTermo(v);
                // Ao escolher um termo específico, mostra todos os status (termo é mais específico).
                if (v !== "todos") setFiltroStatus("todos");
              }}
              disabled={!termosDisponiveis.length}
            >
              <option value="todos">Todos os termos</option>
              {termosDisponiveis.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="select-buscavel-label" htmlFor="filtro-busca">
              Buscar URL
            </label>
            <input
              id="filtro-busca"
              type="search"
              className="select-buscavel-input"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="/wp-content, /servicos..."
            />
          </div>
        </div>

        {visiveis.length ? (
          <TabelaPaginada
            caption="URLs auditadas"
            linhas={visiveis}
            colunas={colunas}
            porPagina={25}
            ordenar={ordenar}
            acoesLinha={(l) => (
              <DsButton
                tone="secondary"
                size="sm"
                onClick={() => reclassificar(l.url, l.statusAutomatico)}
              >
                {l.statusAtual === "suspeita" ? "Marcar como limpa" : "Marcar como suspeita"}
              </DsButton>
            )}
          />
        ) : (
          <p>Nenhum resultado para o filtro atual.</p>
        )}
      </section>
    </>
  );
}
