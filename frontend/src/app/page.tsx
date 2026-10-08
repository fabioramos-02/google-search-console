import { DsPageHeader, DsCard, DsButton } from "@plataforma-xvia/ds-react/server";

export default function Home() {
  return (
    <main>
      <DsPageHeader
        heading="Auditoria GSC"
        description="Detecta páginas suspeitas (spam, SEO hack, apostas, pirataria, Telegram, IPTV) em sites *.ms.gov.br usando a API do Google Search Console."
      />
      <div style={{ display: "grid", gap: "1rem", marginTop: "2rem" }}>
        <DsCard heading="Auditar site via API" headingLevel="2">
          <p>Escolha uma propriedade do Search Console e analise todas as páginas com impressão no período.</p>
          <div slot="footer">
            <DsButton tone="primary" href="/auditoria">Começar auditoria</DsButton>
          </div>
        </DsCard>
        <DsCard heading="Auditar CSV manual" headingLevel="2">
          <p>Alternativa quando a credencial GSC não está disponível: envie o CSV exportado do Search Console.</p>
          <div slot="footer">
            <DsButton tone="secondary" href="/auditoria?modo=csv">Enviar CSV</DsButton>
          </div>
        </DsCard>
      </div>
    </main>
  );
}
