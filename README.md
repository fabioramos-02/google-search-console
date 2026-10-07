# google-search-console

Encontra páginas suspeitas (spam / SEO hack) em sites do Governo de Mato Grosso do Sul (`*.ms.gov.br`).

Projeto da **SETDIG — Secretaria-Executiva de Transformação Digital**.

## Por quê

Quando um site gov é invadido, costumam aparecer páginas falsas de pornografia, apostas,
remédios, pirataria e golpes — que o Google indexa e mostra junto com o nome do governo.
A checagem era feita à mão no Google:

```
site:seusite.ms.gov.br ("porn" OR "bet" OR "tigrinho" OR "viagra" OR "torrent" OR ...)
```

Este projeto automatiza esse filtro, permitindo auditar listas de URLs via interface web interativa ou linha de comando.

## Instalação

Requisitos: Python 3.8+.

Instale as dependências no ambiente virtual do projeto:

```bash
.\.venv\Scripts\pip install -r requirements.txt
# ou manualmente:
.\.venv\Scripts\pip install streamlit pandas
```

## Como usar

**Como exportar do Search Console:**
Desempenho → aba *Páginas* → *Exportar* → *Fazer download do CSV* → usar o arquivo `Páginas.csv` de dentro do `.zip`.

---

### Modo 1: Interface Web (Streamlit)

Para abrir a interface gráfica no navegador:

```bash
python -m streamlit run interface.py
```

1. Clique em **"Browse files"** e envie a planilha `Páginas.csv`.
2. Clique no botão **"Filtrar URLs"**.
3. A aplicação exibirá duas tabelas interativas:
   - **Links suspeitos**: URLs contendo termos maliciosos encontrados.
   - **Links bons**: URLs auditadas e limpas.

---

### Modo 2: Linha de Comando (CLI)

Para executar o processamento diretamente pelo terminal:

```bash
python filtrar.py planilha.csv              # gera maliciosas.csv e boas.csv
python filtrar.py --teste                   # executa testes unitários rápidos
```

No final da execução, o terminal exibe o total de URLs limpas, achados maliciosos e o ranking com a contagem dos termos mais encontrados.

---

## Como funciona o filtro

- **Interface Web (`filtrar_url`)**: Utiliza o `pandas` para ler o CSV e auditar especificamente a coluna `Páginas principais` (padrão de exportação do Search Console), separando em links suspeitos e links válidos (`url_boas`).
- **Terminal (`filtrar`)**: Varre todas as células da planilha, funcionando para qualquer estrutura de CSV.
- **Normalização inteligente**: Remove acentos e converte separadores de URL (`/`, `-`, `_`, `.`, `%20`) em espaços (ex.: `/Fortune-Tiger` casa com `fortune tiger`).
- **Casamento exato de palavra (`\b`)**: Evita falsos positivos como `alphabet` (não casa com `bet`) ou `sexta` (não casa com `sex`).
- **Lista de termos customizável**: A lista de termos monitorados fica no topo de [`filtrar.py`](filtrar.py) (`TERMOS`).

> ⚠️ **Sempre revisar o resultado.** Termos como `sexo` (formulários), `crack` (campanhas de saúde) e `apostas` (notícias) podem aparecer legitimamente em páginas governamentais.

## Arquivos

| Arquivo | O que é |
|---|---|
| `interface.py` | Interface gráfica web com Streamlit |
| `filtrar.py` | Script do filtro com lógica pandas e CLI (fase 1) |
| `buscar_gsc.py` | Busca na API do Search Console + sitemap (fase 2) |
| `requirements.txt` | Dependências do projeto (Streamlit, Pandas, APIs Google) |
| `exemplo.csv` | Planilha **fictícia** no formato do Search Console para testes |
| `CLAUDE.md` | Regras do código e roteiro das próximas fases |

Planilhas reais, JSON e credenciais **não** entram no repositório (bloqueados no `.gitignore`).

## Próximas fases

1. ✅ **Filtrar planilha & Interface Web** — `filtrar.py` e `interface.py`
2. 🔧 **API do Search Console** — `buscar_gsc.py`: busca páginas na API (JSON) e gera `sitemap.xml` (falta credencial para rodar de verdade)
3. ⏳ **Análise de padrões das URLs** — achar suspeitas que a lista de termos não pega (pastas novas, slugs aleatórios, idioma estranho, extensões fora do padrão)

Detalhes de cada fase em [`CLAUDE.md`](CLAUDE.md).

## Equipe

- Fabio Ramos — [@fabioramos-02](https://github.com/fabioramos-02)
- Antonio — [@AntonioPecin](https://github.com/AntonioPecin)
