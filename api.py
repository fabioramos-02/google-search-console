"""Backend HTTP + servidor do frontend estático.

Expõe:
    GET  /sites                           -> lista propriedades do GSC
    GET  /paginas?site=<url>&dias=90      -> audita páginas de um site
    POST /filtrar-csv  (multipart file)   -> audita CSV enviado manualmente
    GET  /*                               -> frontend estático (se frontend/out existir)

Rodar:
    uvicorn api:app --reload --port 8000
    python api.py --teste
"""
import argparse
import io
import os
from datetime import date, timedelta
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import env as _env

_env.carregar()  # lê .env (GSC_CREDENCIAIS, etc.)

from buscar_gsc import buscar_paginas, conectar, listar_sites, marcar_suspeitas
from filtrar import filtrar_url_from_rows, _detectar_coluna

CREDENCIAIS = os.environ.get("GSC_CREDENCIAIS", "credenciais.json")

# Login simples. Padrão: setdig / Setdig@2026. Pode trocar via .env sem mexer no código.
APP_USUARIO = os.environ.get("APP_USUARIO", "setdig")
APP_SENHA = os.environ.get("APP_SENHA", "Setdig@2026")

# Em produção (HF Spaces, Render, Docker), o JSON vem como env var GSC_CREDENCIAIS_JSON
# ou como Secret File (Render monta em /etc/secrets/credenciais.json).
_json_env = os.environ.get("GSC_CREDENCIAIS_JSON")
if _json_env and not Path(CREDENCIAIS).exists():
    try:
        import json as _json
        _json.loads(_json_env)  # valida: se não for JSON, erro claro no boot
        Path(CREDENCIAIS).write_text(_json_env, encoding="utf-8")
        print(f"[boot] GSC_CREDENCIAIS_JSON gravado em {CREDENCIAIS}")
    except Exception as e:
        print(f"[boot] GSC_CREDENCIAIS_JSON inválido: {e}")

# Secret File do Render: se existir em /etc/secrets/credenciais.json, aponta pra lá.
_render_secret = Path("/etc/secrets/credenciais.json")
if _render_secret.exists() and not Path(CREDENCIAIS).exists():
    CREDENCIAIS = str(_render_secret)
    print(f"[boot] usando Secret File do Render: {CREDENCIAIS}")

app = FastAPI(title="Auditoria GSC - SETDIG", version="1.0")

_cors_extra = [o.strip() for o in os.environ.get("CORS_ORIGENS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"] + _cors_extra,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


class Credenciais(BaseModel):
    usuario: str
    senha: str


@app.post("/api/login")
@app.post("/login")
def post_login(dados: Credenciais):
    """Login simples: compara usuario/senha com as variáveis de ambiente."""
    if dados.usuario == APP_USUARIO and dados.senha == APP_SENHA:
        return {"ok": True}
    raise HTTPException(status_code=401, detail="Usuário ou senha incorretos.")


@app.exception_handler(Exception)
async def _todo_erro_vira_json(request, exc):
    """Qualquer exceção não tratada vira JSON (evita HTML 'Internal Server Error' no front)."""
    import traceback
    print("[erro]", "".join(traceback.format_exception(exc)))
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {exc}"})


def _servico():
    """Abre conexão com GSC; devolve 503 com mensagem clara se credencial faltar."""
    try:
        return conectar(CREDENCIAIS)
    except SystemExit as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.get("/api/sites")
@app.get("/sites")
def get_sites():
    return {"sites": listar_sites(_servico())}


@app.get("/api/paginas")
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


@app.post("/api/filtrar-csv")
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


# Monta frontend estático (gerado por `cd frontend && npm run build` com output:'export')
_FRONT = Path(__file__).parent / "frontend" / "out"
if _FRONT.is_dir():
    app.mount("/_next", StaticFiles(directory=_FRONT / "_next"), name="next-assets")

    @app.get("/{caminho:path}")
    def servir_frontend(caminho: str):
        """Serve arquivos do Next export; cai no index.html pra rotas SPA."""
        alvo = _FRONT / caminho
        if alvo.is_file():
            return FileResponse(alvo)
        html = _FRONT / f"{caminho}.html"
        if html.is_file():
            return FileResponse(html)
        return FileResponse(_FRONT / "index.html")


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

    # /login aceita credencial correta e rejeita a errada
    r = client.post("/login", json={"usuario": APP_USUARIO, "senha": APP_SENHA})
    assert r.status_code == 200 and r.json() == {"ok": True}
    r = client.post("/login", json={"usuario": "x", "senha": "y"})
    assert r.status_code == 401

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
        porta = int(os.environ.get("PORT", 8000))
        uvicorn.run("api:app", host="0.0.0.0", port=porta, reload=True)
