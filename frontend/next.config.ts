import type { NextConfig } from "next";

// output:'export' gera `out/` com HTML/JS/CSS estáticos. O FastAPI (api.py) serve
// essa pasta em produção — mesmo domínio, zero CORS.
const config: NextConfig = {
  output: "export",
  serverExternalPackages: ["@plataforma-xvia/ds-core"],
  images: { unoptimized: true },
  env: {
    // Em produção (Docker/HF) o front e o back ficam no mesmo host → URL relativa.
    // Em dev, aponta pro uvicorn em outra porta.
    API_BASE: process.env.API_BASE ?? "http://localhost:8000",
  },
};

export default config;
