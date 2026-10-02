# google-search-console

Detecção de páginas suspeitas (spam/SEO hack) em sites `*.ms.gov.br` — SETDIG
(Secretaria-Executiva de Transformação Digital).

Sites gov invadidos costumam ganhar páginas falsas de pornografia, apostas, farmácia,
pirataria e golpes. Hoje a busca é manual no Google com:

```
site:seusite.ms.gov.br ("xvideos" OR "porn" OR "bet" OR "tigrinho" OR "viagra" OR "torrent" OR ...)
```

Este projeto automatiza esse filtro.

## Regras para o código

- **Simples, objetivo e didático.** Quem mantém é estagiário: código precisa ser lido de cima a baixo.
- Python 3, **só biblioteca padrão** enquanto der. Dependência nova só com motivo (ex.: API do Google na fase 2).
- Comentários e mensagens em pt-BR, com acento.
- Um script por fase. Nada de classe, framework ou pasta `src/` sem necessidade real.
- Toda lógica nova ganha um assert em `testar()` (`python filtrar.py --teste`).
- **Nunca** commitar dados (`*.csv`, `*.json`) nem credenciais — repositório é público. O `.gitignore` já bloqueia.

## Fase 1 — filtrar planilha (feito)

`filtrar.py` lê qualquer CSV, varre **todas as células** e lista as que contêm algum termo.

```bash
python filtrar.py --teste                    # testes rápidos
python filtrar.py planilha.csv               # gera resultado.csv
python filtrar.py planilha.csv -o saida.csv
```

Saída `resultado.csv`: `linha, coluna, url, termos, trecho` + resumo por termo no terminal.

Funciona com o export do Search Console (Desempenho → Páginas → Exportar → CSV) ou qualquer outra planilha.

### Como funciona

1. `normalizar()` — minúsculo, remove acento (`pornô` → `porno`) e troca separadores de URL
   (`- _ / . + = ? & # %20`) por espaço. Assim `/fortune-tiger` casa com `fortune tiger`.
2. `PADRAO` — uma regex só com todos os termos, cercados por `\b` (borda de palavra).
   Evita falso positivo: `bet` não casa `alphabet`, `sex` não casa `sexta`.
3. Para mudar o filtro, edite só a lista `TERMOS` no topo do arquivo.

### Falsos positivos conhecidos

Alguns termos aparecem legitimamente em site gov — **resultado sempre passa por revisão humana**:
- `sexo` — campo de formulário ("sexo: feminino/masculino").
- `crack` — campanhas de saúde/segurança (PCMS, SEJUSP, SES).
- `apostas`, `bet` — notícias sobre regulação de apostas.

## Fase 2 — API do Search Console → JSON → sitemap (código pronto, falta credencial)

`buscar_gsc.py` puxa as páginas direto da API, marca as suspeitas com o mesmo `termos_encontrados()`
do `filtrar.py` e gera o sitemap só com as limpas.

### Configurar (uma vez)

1. **Google Cloud** (console.cloud.google.com): criar projeto → *APIs e serviços* → habilitar
   *Google Search Console API* → *Credenciais* → criar *service account* → aba *Chaves* → *Adicionar chave → JSON*.
   Salvar como `credenciais.json` na pasta do projeto (já está no `.gitignore` — **nunca commitar**).
2. **Search Console**: em cada propriedade, *Configurações → Usuários e permissões → Adicionar usuário*
   → e-mail da service account (`...@....iam.gserviceaccount.com`), permissão *Restrito*.
3. Instalar:
   ```bash
   python -m venv .venv
   .venv\Scriptsctivate
   pip install -r requirements.txt
   ```

### Rodar

```bash
python buscar_gsc.py --teste                          # testes offline
python buscar_gsc.py --listar                         # sites que a credencial enxerga (copiar o nome exato)
python buscar_gsc.py sc-domain:exemplo.ms.gov.br      # últimos 90 dias
python buscar_gsc.py https://www.exemplo.ms.gov.br/ --dias 30
```

Saídas (não vão pro git): `paginas.json` (todas as páginas + cliques, impressões, CTR, posição e `termos`)
e `sitemap.xml` (só as limpas). As suspeitas aparecem no terminal.

### Pontos de atenção

- Nome do site precisa ser **exato**: propriedade de domínio = `sc-domain:x.ms.gov.br`;
  de prefixo = `https://www.x.ms.gov.br/` (com barra no fim). Use `--listar`.
- API só devolve páginas **com impressão** no período — página nunca exibida no Google não aparece.
  Sitemap sai incompleto nesse caso; serve como base, não como verdade.
- Dados têm atraso de ~2–3 dias e histórico máximo de 16 meses.
- Erro 403 = service account não foi adicionada naquela propriedade.
- Sitemap com mais de 50 000 URLs dá erro de propósito: aí dividir em vários + sitemap index.

Doc: https://developers.google.com/webmaster-tools/v1/searchanalytics/query

## Fase 3 — análise de padrões das URLs (a fazer, depois da fase 2)

Objetivo: achar páginas suspeitas **que a lista de termos não pega**, olhando a forma da URL.
Entrada: `paginas.json` (fase 2) ou o CSV da fase 1. Script sugerido: `padroes.py`, stdlib.

Ideias de análise (começar pelas mais simples):
- **Prefixos de caminho**: contar URLs por primeiro segmento (`/noticias/`, `/wp-content/`, `/?p=`).
  Pasta nova com muitas URLs de uma vez = sinal forte de invasão.
- **Slugs aleatórios**: segmentos longos com mistura de letras/números sem sentido
  (`/a8f3k2x9q.html`) — medir tamanho e proporção de dígitos.
- **Idioma estranho**: slug em inglês, chinês, japonês ou russo em site pt-BR.
- **Extensões fora do padrão**: `.php`, `.asp`, `.html` em site que não usa.
- **Parâmetros de query** repetidos (`?id=`, `?s=`, `?casino=`).
- **Termos novos**: palavras que mais aparecem nas URLs já marcadas como suspeitas →
  candidatas para entrar em `TERMOS`.

Saída sugerida: `padroes.csv` com `padrão, qtd, exemplos` para revisão humana.
Ferramentas: `urllib.parse.urlparse`, `collections.Counter`, `re`. Sem ML até as regras simples se esgotarem.
