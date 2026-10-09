---
title: GSC Auditoria SETDIG
emoji: 🔍
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
---

# google-search-console

Caça páginas suspeitas (apostas, pirataria, pornografia, Telegram, IPTV) em sites
`*.ms.gov.br`. Projeto da **SETDIG — Secretaria-Executiva de Transformação Digital**.

## Para que serve

Sites `.gov.br` invadidos ganham páginas falsas que o Google indexa junto do nome do governo.
Em vez de procurar à mão, este painel:

1. Lê as páginas que o Google viu no seu site (via API do Search Console).
2. Marca as que têm palavras suspeitas (lista em [`filtrar.py`](filtrar.py)).
3. Deixa você baixar duas listas em CSV: as **suspeitas** pra investigar e as **limpas** pro sitemap.

Também aceita CSV do próprio Search Console se você não tiver credencial de API.

## Como rodar (local, 2 terminais)

```bash
# Terminal 1 — backend
python -m venv .venv
.\.venv\Scripts\activate            # Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
uvicorn api:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

Abra `http://localhost:3000`. Login padrão: **setdig / Setdig@2026** (troca em `.env` com
`APP_USUARIO=` e `APP_SENHA=`).

## Credencial do Google Search Console

A API do GSC **não aceita API key** — só service account.

1. **Google Cloud Console** → projeto → *APIs e serviços → Biblioteca* → habilitar
   **Google Search Console API**.
2. *Credenciais → Criar credenciais → Conta de serviço* → nome: `gsc-setdig`.
3. Clica na conta → **Chaves → Adicionar chave → JSON** → baixa o arquivo.
4. Põe o JSON na raiz do projeto. No `.env`, aponte o caminho:
   ```
   GSC_CREDENCIAIS=nome-do-arquivo-baixado.json
   ```
5. No **Search Console** (`search.google.com/search-console`), para **cada** propriedade:
   *Configurações → Usuários e permissões → Adicionar usuário* → cola o e-mail da service
   account (`...@...iam.gserviceaccount.com`) com permissão **Restrito**.
6. Testa:
   ```bash
   python buscar_gsc.py --listar
   ```
   deve listar as propriedades.

## Publicar grátis — Hugging Face Spaces

Hugging Face Spaces roda Docker de graça, 24/7, com Secrets pra credenciais.
Front e back ficam no mesmo container.

1. **Crie um Space** em https://huggingface.co/new-space → tipo **Docker**.
2. Clone o Space e empurre o código deste repo pra ele:
   ```bash
   git remote add hf https://huggingface.co/spaces/<seu-usuario>/<nome-do-space>
   git push hf main
   ```
3. **Configure os Secrets** no painel do Space (`Settings → Variables and secrets`):
   - `GSC_CREDENCIAIS_JSON` — cole o **conteúdo inteiro** do JSON da service account.
     O backend grava em disco no boot.
   - `APP_USUARIO` e `APP_SENHA` — opcional, pra trocar o login padrão.
4. Aguarde o build (~5 min). O Space liga sozinho em
   `https://<usuario>-<space>.hf.space`.

### Testar o Docker local antes de subir

```bash
docker build -t gsc .
docker run -p 7860:7860 \
  -e GSC_CREDENCIAIS_JSON="$(cat probable-quest-510415-v0-bd18f1a16d43.json)" \
  gsc
# abre http://localhost:7860
```

## Linha de comando (sem interface)

```bash
python filtrar.py planilha.csv                        # maliciosas.csv + boas.csv
python filtrar.py --teste
python buscar_gsc.py --listar                         # sites da credencial
python buscar_gsc.py sc-domain:x.ms.gov.br --dias 90  # paginas.json + sitemap.xml
python api.py --teste
```

## Como funciona o filtro

- **Normalização**: minúsculo, sem acento, separadores de URL viram espaço
  (`/Fortune-Tiger` ⇒ casa `fortune tiger`).
- **Borda de palavra `\b`**: `bet` casa `bet365` mas não `alphabet`.
- **Lista de termos**: topo de [`filtrar.py`](filtrar.py) — editável.
- ⚠️ **Revise sempre**: `sexo` (formulários), `crack` (saúde), `apostas` (notícias) podem
  aparecer legitimamente em páginas gov. Falsos positivos documentados em [`CLAUDE.md`](CLAUDE.md).

## Arquivos

| Arquivo | O que é |
|---|---|
| `api.py` | Backend FastAPI — endpoints + serve frontend estático |
| `filtrar.py` | Regex + lista de termos + CLI |
| `buscar_gsc.py` | Cliente GSC API + gerador de sitemap |
| `env.py` | Loader de `.env` (stdlib, sem dep) |
| `frontend/` | Next.js 15 + DS XVIA (vendor em `frontend/vendor/`) |
| `Dockerfile` | Build único: front estático + backend FastAPI |
| `CLAUDE.md` | Instruções pros devs/estagiários |

CSV, JSON e credenciais **não** entram no repositório (`.gitignore`).

## Equipe

- Fabio Ramos — [@fabioramos-02](https://github.com/fabioramos-02)
- Antonio — [@AntonioPecin](https://github.com/AntonioPecin)
