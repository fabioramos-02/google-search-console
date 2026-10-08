"""Backend HTTP para o frontend Next.js.

Expõe:
    GET  /sites                           -> lista propriedades do GSC
    GET  /paginas?site=<url>&dias=90      -> audita páginas de um site
    POST /filtrar-csv  (multipart file)   -> audita CSV enviado manualmente

Rodar:
    uvicorn api:app --reload --port 8000
    python api.py --teste
"""
import argparse
import io
import os
from datetime import date, timedelta

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from buscar_gsc import buscar_paginas, conectar, listar_sites, marcar_suspeitas
from filtrar import filtrar_url_from_rows, _detectar_coluna

CREDENCIAIS = os.environ.get("GSC_CREDENCIAIS", "credenciais.json")

app = FastAPI(title="Auditoria GSC - SETDIG", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def _servico():
    """Abre conexão com GSC; devolve 503 com mensagem clara se credencial faltar."""
    try:
        return conectar(CREDENCIAIS)
    except SystemExit as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/sites")
def get_sites():
    return {"sites": listar_sites(_servico())}


@app.get("/paginas")
def get_paginas(site: str, dias: int = 90):
    fim = date.today()
    inicio = fim - timedelta(days=dias)
    paginas = marcar_suspeitas(buscar_paginas(_servico(), site, str(inicio), str(fim)))
    maliciosas = [p for p in paginas if p["termos"]]
    limpas = [p for p in paginas if not p["termos"]]
    return {
        "site": site,
        "inicio": str(inicio),
        "fim": str(fim),
        "total": len(paginas),
        "maliciosas": maliciosas,
        "limpas": limpas,
    }


@app.post("/filtrar-csv")
async def post_filtrar_csv(file: UploadFile = File(...)):
    import pandas as pd

    conteudo = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(conteudo), encoding="utf-8-sig")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV inválido: {e}")
    coluna = _detectar_coluna(df) or df.columns[0]
    linhas = df[coluna].dropna().astype(str).tolist()
    maliciosas, limpas = filtrar_url_from_rows(linhas)
    return {"coluna_usada": coluna, "total": len(linhas), "maliciosas": maliciosas, "limpas": limpas}


def testar():
    from fastapi.testclient import TestClient

    client = TestClient(app)

    # /filtrar-csv funciona offline (não precisa GSC)
    csv_bytes = b"Paginas principais\nhttps://x.ms.gov.br/ok\nhttps://x.ms.gov.br/bet365\n"
    r = client.post("/filtrar-csv", files={"file": ("teste.csv", csv_bytes, "text/csv")})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 2
    assert body["maliciosas"] == [{"url": "https://x.ms.gov.br/bet365"}]
    assert body["limpas"] == [{"url": "https://x.ms.gov.br/ok"}]

    # /sites sem credencial devolve 503 com mensagem útil
    r = client.get("/sites")
    if r.status_code == 503:
        assert "credenciais.json" in r.json()["detail"].lower() or "credencial" in r.json()["detail"].lower()
    # se tiver credencial de verdade, só valida que respondeu 200
    else:
        assert r.status_code == 200

    print("OK: todos os testes passaram")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backend HTTP de auditoria.")
    parser.add_argument("--teste", action="store_true", help="roda os testes e sai")
    args = parser.parse_args()
    if args.teste:
        testar()
    else:
        import uvicorn
        uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)
