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

## Fase 2 — API do Search Console → JSON → sitemap (a fazer)

Objetivo: parar de exportar CSV na mão e puxar as páginas direto da API.

1. **Google Cloud**: criar projeto → habilitar *Google Search Console API* → criar *service account*
   → baixar chave JSON como `credenciais.json` (já está no `.gitignore`).
2. **Search Console**: em cada propriedade, *Configurações → Usuários e permissões* → adicionar o
   e-mail da service account (permissão *Restrito* basta).
3. `pip install google-api-python-client google-auth`.
4. Novo script `buscar_gsc.py`:
   - `searchanalytics().query(siteUrl=..., body={"startDate", "endDate", "dimensions": ["page"], "rowLimit": 25000})`
     — paginar com `startRow` se passar de 25 000.
   - Salvar resposta crua em `paginas.json`.
5. Reaproveitar `termos_encontrados()` do `filtrar.py` (`from filtrar import termos_encontrados`)
   para marcar as URLs suspeitas — **não** duplicar a lista de termos.
6. Gerar `sitemap.xml` com `xml.etree.ElementTree` (stdlib): só URLs limpas, formato
   `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>...</loc></url></urlset>`.
   Limite do protocolo: 50 000 URLs por arquivo.

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
