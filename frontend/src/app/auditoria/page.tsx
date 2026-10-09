import { Suspense } from "react";
import { DsPageHeader, DsBreadcrumb } from "@plataforma-xvia/ds-react/server";
import { AuditoriaCliente } from "./AuditoriaCliente";

const trilha = [{ label: "Início", href: "/" }, { label: "Auditoria" }];

export default function AuditoriaPage() {
  return (
    <main>
      <DsPageHeader
        heading="Auditoria de URLs"
        description="Escolha o modo CSV (sem login) ou API (precisa login). Resultado em duas listas: suspeitas e limpas, cada uma com download CSV."
      >
        <DsBreadcrumb slot="breadcrumb" items={JSON.stringify(trilha)} />
      </DsPageHeader>
      <Suspense fallback={<p>Carregando…</p>}>
        <AuditoriaCliente apiBase={process.env.API_BASE ?? "http://localhost:8000"} />
      </Suspense>
    </main>
  );
}
