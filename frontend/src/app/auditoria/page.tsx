import { DsPageHeader, DsBreadcrumb } from "@plataforma-xvia/ds-react/server";
import { AuditoriaCliente } from "./AuditoriaCliente";

const trilha = [{ label: "Início", href: "/" }, { label: "Auditoria" }];

export default function AuditoriaPage() {
  return (
    <main>
      <DsPageHeader
        heading="Auditoria de URLs"
        description="Selecione um site do GSC ou envie um CSV. URLs com termos suspeitos aparecem na tabela abaixo — revisão humana obrigatória."
      >
        <DsBreadcrumb slot="breadcrumb" items={JSON.stringify(trilha)} />
      </DsPageHeader>
      <AuditoriaCliente apiBase={process.env.API_BASE ?? "http://localhost:8000"} />
    </main>
  );
}
