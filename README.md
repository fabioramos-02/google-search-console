# google-search-console

Encontra páginas suspeitas (spam / SEO hack / apostas / pirataria / Telegram / IPTV) em sites do
Governo de Mato Grosso do Sul (`*.ms.gov.br`).

Projeto da **SETDIG — Secretaria-Executiva de Transformação Digital**.

## Por quê

Quando um site gov é invadido, costumam aparecer páginas falsas de pornografia, apostas, remédios,
pirataria, canais de Telegram de golpe e listas IPTV — que o Google indexa junto com o nome do
governo. A checagem era feita à mão no Google:

```
site:seusite.ms.gov.br ("porn" OR "bet" OR "tigrinho" OR "t.me" OR "iptv" OR ...)
```

Este projeto automatiza o filtro e consome a **API do Search Console** direto — sem precisar
baixar CSV.

## Arquitetura

```
frontend/ (Next.js 15 + DS XVIA)  ──HTTP──▶  api.py (FastAPI)  ──▶  buscar_gsc.py ─ GSC API
                                                            └──▶  filtrar.py (regex + termos)
```

- **Frontend**: Next.js com `@plataforma-xvia/*` (Design System oficial do Portal MS).
- **Backend**: FastAPI expondo `/sites`, `/paginas`, `/filtrar-csv`.
- **Lib**: `filtrar.py` (regex + lista de termos) e `buscar_gsc.py` (GSC API + sitemap).

## Pré-requisitos

- **Python 3.10+**
- **Node 20+** com npm (ou pnpm)
- **Credencial Google** (service account JSON — ver abaixo)
- Para instalar `@plataforma-xvia/*`: acesso ao registry GitLab MS (rede gov/VPN) + token em
  `GITLAB_MS_NPM_TOKEN` + `~/.npmrc` com `//gitlabs.ms.gov.br/:_authToken=${GITLAB_MS_NPM_TOKEN}`.

## Instalação

### Backend Python

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Credencial do Google Search Console

A API do GSC **não aceita API key** — precisa de service account JSON.

1. **Google Cloud Console** (`console.cloud.google.com`):
   - Criar/selecionar projeto
   - *APIs e serviços → Biblioteca* → habilitar **Google Search Console API**
   - *Credenciais → Criar credenciais → Conta de serviço* (nome: `gsc-setdig`)
   - Clicar na conta criada → aba **Chaves** → *Adicionar chave → JSON* → baixa o arquivo
2. Salvar como `credenciais.json` na raiz do projeto (já está no `.gitignore` — **nunca commitar**).
3. Copiar o e-mail da service account (`gsc-setdig@<projeto>.iam.gserviceaccount.com`).
4. **Search Console** (`search.google.com/search-console`), para **cada propriedade**:
   - *Configurações → Usuários e permissões → Adicionar usuário*
   - Colar o e-mail → permissão **Restrito** → *Adicionar*
5. Validar:
   ```bash
   python buscar_gsc.py --listar
   ```
   deve imprimir as propriedades.

> O `.env` do projeto **não é usado** pela API do GSC. Se existir uma `SEARCH_CONSOLE=AIzaSy...`,
> pode remover — API key não autentica o GSC.

## Como rodar

Dois terminais:

```bash
# terminal 1 — backend
.\.venv\Scripts\activate
uvicorn api:app --reload --port 8000

# terminal 2 — frontend
cd frontend
npm run dev
```

Acessar `http://localhost:3000` → clicar em **Começar auditoria** → selecionar propriedade → *Auditar*.

Alternativa sem GSC: aba **Via CSV manual** faz upload do `Páginas.csv` exportado do Search Console.

## Linha de comando (sem interface)

```bash
python filtrar.py planilha.csv       # gera maliciosas.csv e boas.csv
python filtrar.py --teste            # testes rápidos
python buscar_gsc.py --listar        # lista sites da credencial
python buscar_gsc.py sc-domain:x.ms.gov.br --dias 90  # audita e gera sitemap.xml
python api.py --teste                # testes do backend
```

## Como funciona o filtro

- **Normalização**: minúsculo, sem acento, separadores de URL (`/`, `-`, `_`, `.`, `%20`) viram
  espaço — assim `/Fortune-Tiger` casa com `fortune tiger`.
- **Borda de palavra `\b`**: `bet` casa `bet365` mas não `alphabet`; `sex` não casa `sexta`.
- **NaN / tipos não-string**: tratados — não quebra em células vazias do pandas.
- **Categorias cobertas**: conteúdo adulto, apostas, farmácia, pirataria, golpes financeiros,
  mensageria (Telegram/WhatsApp/Discord — golpes), IPTV/streaming pirata.
- **Lista customizável**: topo de [`filtrar.py`](filtrar.py) (`TERMOS`).

> ⚠️ **Sempre revisar o resultado.** Termos como `sexo` (formulários), `crack` (campanhas de saúde)
> e `apostas` (notícias) podem aparecer legitimamente em páginas governamentais. Falsos positivos
> conhecidos estão documentados em [`CLAUDE.md`](CLAUDE.md).

## Arquivos

| Arquivo | O que é |
|---|---|
| `api.py` | Backend FastAPI (endpoints `/sites`, `/paginas`, `/filtrar-csv`) |
| `filtrar.py` | Lib de filtro (regex + termos) + CLI |
| `buscar_gsc.py` | Busca na API do GSC + geração de sitemap |
| `frontend/` | Next.js 15 + Design System XVIA |
| `requirements.txt` | Dependências Python |
| `interface.py` | **Deprecado** (Streamlit removido — ver `frontend/`) |
| `CLAUDE.md` | Regras do código e roteiro |

Planilhas reais, JSON e credenciais **não** entram no repositório (bloqueados no `.gitignore`).

## Equipe

- Fabio Ramos — [@fabioramos-02](https://github.com/fabioramos-02)
- Antonio — [@AntonioPecin](https://github.com/AntonioPecin)
