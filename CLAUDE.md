# google-search-console

Detecção de páginas suspeitas (spam/SEO hack/apostas/pirataria/Telegram/IPTV) em sites
`*.ms.gov.br` — SETDIG (Secretaria-Executiva de Transformação Digital).

Sites gov invadidos ganham páginas falsas de pornografia, apostas, farmácia, pirataria, canais
Telegram de golpe e listas IPTV. A busca manual era:

```
site:seusite.ms.gov.br ("xvideos" OR "porn" OR "bet" OR "tigrinho" OR "viagra" OR "t.me" OR "iptv" OR ...)
```

Este projeto automatiza via API do Google Search Console + frontend Next.js com Design System XVIA.

## Arquitetura

```
frontend/ (Next 15 + DS XVIA)  ──HTTP──▶  api.py (FastAPI)  ──▶  buscar_gsc.py ─ GSC API
                                                           └──▶  filtrar.py (regex + termos)
```

- `filtrar.py` — lib de filtro + CLI
- `buscar_gsc.py` — cliente GSC API + gerador de sitemap
- `api.py` — backend FastAPI (`/sites`, `/paginas`, `/filtrar-csv`, `/login`) + serve `frontend/out`
- `frontend/` — Next.js com `@plataforma-xvia/*` (vendor em `frontend/vendor/*.tgz`)
- `env.py` — carrega `.env` com stdlib (sem python-dotenv)
- `Dockerfile` — build único (front estático + back FastAPI) pra Hugging Face Spaces

## Pro Antonio (estagiário)

**Rodar local:** 2 terminais (ver `README.md`).

**Modo CSV é livre** — pra testar upload. Modo API precisa de login (setdig / Setdig@2026).
Senha vem de `.env` (`APP_USUARIO`, `APP_SENHA`).

**Atualizar o Design System XVIA** (quando sair versão nova):
```bash
cd frontend
# precisa estar na rede MS/VPN com GITLAB_MS_NPM_TOKEN no ambiente
rm -rf node_modules && npm install @plataforma-xvia/ds-core@latest @plataforma-xvia/ds-react@latest @plataforma-xvia/ds-tokens@latest @plataforma-xvia/ds-icons@latest
# empacotar pra vendor (commitável, sem token)
cd vendor && rm -f plataforma-xvia-*.tgz
for pkg in ds-core ds-icons ds-react ds-tokens; do npm pack ../node_modules/@plataforma-xvia/$pkg; done
cd ..
# ajusta versões no package.json pros novos nomes .tgz, roda `npm install`, commit.
```

**Credencial GSC** nova: baixa JSON no Cloud Console, aponta via `.env` (`GSC_CREDENCIAIS=arquivo.json`)
ou cola o conteúdo em Secret do Hugging Face como `GSC_CREDENCIAIS_JSON`.

**Deploy:** push pro remote `hf` (Hugging Face). Space rebuilda sozinho.

**Fluxo do dado:** usuário escolhe site → front chama `GET /paginas` → `buscar_gsc.py` baixa
todas as páginas do GSC (25k por vez) → `filtrar.py` marca termos suspeitos → front recebe JSON
e pagina/baixa CSV client-side.

## Regras para o código

- **Simples, objetivo e didático** — mantido por estagiário.
- Backend Python 3.10+. Frontend TypeScript strict.
- Comentários e mensagens em pt-BR, com acento.
- Um script principal por finalidade.
- Toda lógica nova de regex/filtragem ganha assert em `testar()` (`python filtrar.py --teste`).
- Frontend: zero hex/`rgb()` em CSS próprio — só `var(--ds-*)` (ver skill `design-system-xvia`).
- Server/client no Next: `@plataforma-xvia/ds-react/server` em server component; `@plataforma-xvia/ds-react` só em `"use client"`.
- **Nunca** commitar `*.csv`, `*.json`, `credenciais.json`, `.env` — repositório é público.

## Instalação

Backend:
```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Frontend:
```bash
cd frontend
npm install
```

Pré-requisitos frontend: Node 20+, acesso ao registry GitLab MS (`GITLAB_MS_NPM_TOKEN` no ambiente,
`~/.npmrc` com `//gitlabs.ms.gov.br/:_authToken=${GITLAB_MS_NPM_TOKEN}`).

## Rodar

```bash
# terminal 1
uvicorn api:app --reload --port 8000

# terminal 2
cd frontend && npm run dev
```

Acessar `http://localhost:3000`.

## Credencial GSC (obrigatória)

**API key não funciona** no GSC — precisa service account JSON (`credenciais.json` na raiz).
Passo a passo detalhado no [`README.md`](README.md#credencial-do-google-search-console).

Em resumo:
1. Google Cloud Console → habilitar GSC API → criar service account → baixar chave JSON
2. Search Console → adicionar e-mail da service account em cada propriedade (permissão Restrito)
3. Validar: `python buscar_gsc.py --listar`

## Testes

```bash
python filtrar.py --teste       # regex, normalização, NaN, filtrar_url_from_rows
python buscar_gsc.py --teste    # marcar_suspeitas, gerar_sitemap
python api.py --teste           # endpoints via TestClient
cd frontend && npm run build    # type-check + build Next
```

## Lista de termos

Em [`filtrar.py`](filtrar.py) (`TERMOS`). Categorias cobertas:

- Conteúdo adulto
- Apostas (bet365, tigrinho, fortune tiger…)
- Farmácia (viagra, cialis…)
- Pirataria (crack, torrent, apk mod…)
- Golpes financeiros (renda garantida, crypto giveaway…)
- Mensageria de golpe (t.me, wa.me, discord.gg, canal vip)
- IPTV/streaming pirata (iptv, m3u, futemax…)

**Falsos positivos conhecidos** — exigem revisão humana:
- `sexo` — formulários ("sexo: feminino/masculino")
- `crack` — campanhas de saúde/segurança pública
- `apostas`, `bet` — notícias sobre regulamentação
- `whatsapp` sozinho não entra na lista (comum em páginas de contato oficial — só `wa.me` e `whatsapp grupo`)
- `telegram` casa `telegram` mas não `telegrama` (regex `\b`)

## Fase 3 — Análise de padrões das URLs (a fazer)

Objetivo: achar páginas suspeitas que a lista de termos não pega, olhando a forma da URL.
Entrada: `paginas.json` (do `buscar_gsc.py`) ou CSV. Script sugerido: `padroes.py`, stdlib.

Ideias:
- Prefixos de caminho (pasta nova com muitas URLs = sinal de invasão)
- Slugs aleatórios (`/a8f3k2x9q.html`)
- Idioma estranho (inglês/chinês/russo em site pt-BR)
- Extensões fora do padrão (`.php`, `.asp` em site que não usa)
- Parâmetros de query repetidos
- Termos novos candidatos (palavras frequentes em URLs já marcadas)

Saída: `padroes.csv` com `padrão, qtd, exemplos` para revisão humana.
