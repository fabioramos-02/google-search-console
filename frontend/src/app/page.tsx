import { DsPageHeader, DsCard, DsButton, DsBadge } from "@plataforma-xvia/ds-react/server";

export default function Home() {
  return (
    <main>
      <DsPageHeader
        heading="Caça-páginas suspeitas em sites .ms.gov.br"
        description="Encontra páginas falsas plantadas por invasores: apostas, pirataria, pornografia, Telegram, IPTV. Em minutos."
      />

      <section className="painel" style={{ marginTop: "2rem" }}>
        <h2 style={{ marginTop: 0 }}>Como funciona</h2>
        <ol style={{ lineHeight: 1.8, paddingLeft: "1.25rem" }}>
          <li>Lê a lista de páginas que o Google viu no seu site.</li>
          <li>Marca as que têm palavras de spam, apostas, pirataria, Telegram etc.</li>
          <li>Baixa duas listas em CSV: as suspeitas pra investigar e as limpas pro sitemap.</li>
        </ol>
        <p style={{ color: "var(--ds-color-text-muted)", marginBottom: 0 }}>
          <strong>Por que importa:</strong> sites <code>.gov.br</code> invadidos ganham páginas falsas que roubam
          credibilidade do governo. Esse painel acha elas rápido.
        </p>
      </section>

      <h2 style={{ marginTop: "2.5rem" }}>Escolha o modo</h2>
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
        <DsCard heading="CSV manual" headingLevel="3">
          <div slot="header-end">
            <DsBadge tone="success">Sem login</DsBadge>
          </div>
          <p>
            Já tem o CSV exportado do Search Console? Solta aqui que o filtro roda na hora. Nada de credencial, nada
            de login.
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--ds-color-text-muted)" }}>
            <li>Rápido de testar</li>
            <li>Não precisa de permissão</li>
            <li>Serve pra qualquer CSV com coluna de URL</li>
          </ul>
          <div slot="footer">
            <DsButton tone="primary" href="/auditoria?modo=csv">
              Enviar CSV
            </DsButton>
          </div>
        </DsCard>

        <DsCard heading="API do Google" headingLevel="3">
          <div slot="header-end">
            <DsBadge tone="info">Precisa login</DsBadge>
          </div>
          <p>
            Conecta direto no Search Console e analisa todas as páginas do site no período. Pede login do painel
            porque usa a credencial oficial da SETDIG.
          </p>
          <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--ds-color-text-muted)" }}>
            <li>Dados completos (cliques, impressões)</li>
            <li>Varre o site todo, não só o CSV</li>
            <li>Gera sitemap limpo pronto</li>
          </ul>
          <div slot="footer">
            <DsButton tone="secondary" href="/auditoria?modo=api">
              Começar auditoria via API
            </DsButton>
          </div>
        </DsCard>
      </div>
    </main>
  );
}
