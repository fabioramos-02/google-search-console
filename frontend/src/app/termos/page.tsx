import { DsPageHeader, DsBreadcrumb } from "@plataforma-xvia/ds-react/server";
import { TermosCliente } from "./TermosCliente";

const trilha = [{ label: "Início", href: "/" }, { label: "Gerir termos" }];

export default function TermosPage() {
  return (
    <main>
      <DsPageHeader
        heading="Gerir termos"
        description="Lista de termos monitorados: padrão (fixos no código), regras automáticas de URL e customizados editáveis."
      >
        <DsBreadcrumb slot="breadcrumb" items={JSON.stringify(trilha)} />
      </DsPageHeader>
      <TermosCliente apiBase={process.env.API_BASE ?? "http://localhost:8000"} />
    </main>
  );
}
