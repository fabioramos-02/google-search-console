import { DsPageHeader, DsCard, DsButton, DsBadge } from "@plataforma-xvia/ds-react/server";

export default function Home() {
  return (
    <main>
      <DsPageHeader
        heading="Caça-páginas suspeitas em .ms.gov.br"
        description="Acha páginas falsas plantadas por invasores (apostas, pirataria, Telegram, IPTV). Em minutos."
      />

      <div
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          marginTop: "1.25rem",
        }}
      >
        <DsCard heading="CSV manual" headingLevel="3">
          <div slot="header-end">
            <DsBadge tone="success">Sem login</DsBadge>
          </div>
          <p style={{ margin: 0 }}>Solta o CSV do Search Console e o filtro roda na hora.</p>
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
          <p style={{ margin: 0 }}>Varre o site inteiro no Search Console e gera sitemap limpo pronto.</p>
          <div slot="footer">
            <DsButton tone="secondary" href="/auditoria?modo=api">
              Começar via API
            </DsButton>
          </div>
        </DsCard>
      </div>
    </main>
  );
}
