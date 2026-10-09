import { DsPageHeader } from "@plataforma-xvia/ds-react/server";
import { LoginCliente } from "./LoginCliente";

export default function LoginPage() {
  return (
    <main>
      <DsPageHeader heading="Entrar" description="Informe o usuário e a senha para acessar o painel." />
      <LoginCliente apiBase={process.env.API_BASE ?? "http://localhost:8000"} />
    </main>
  );
}
