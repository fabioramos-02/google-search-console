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

Este script faz o mesmo filtro em cima de uma planilha, de forma repetível.

## Como usar

Requisito: Python 3.8+ (sem instalar nada).

```bash
# 1. testar
python filtrar.py --teste

# 2. rodar no exemplo
python filtrar.py exemplo.csv

# 3. rodar na planilha real (ex.: export do Search Console)
python filtrar.py minha-planilha.csv -o resultado.csv
```

**Como exportar do Search Console:** Desempenho → aba *Páginas* → *Exportar* → *Fazer download do CSV*
→ usar o arquivo `Páginas.csv` de dentro do .zip.

### Exemplo de saída

```
5 achado(s) -> resultado.csv
  fortune tiger: 1
  bet365: 1
  viagra: 1
  ativador: 1
  crack: 1
  porno: 1
```

`resultado.csv` traz `linha, coluna, url, termos, trecho` — abre direto no Excel.

## Como funciona

- Varre **todas as células** da planilha, então serve para qualquer CSV.
- Ignora maiúsculas e acentos e entende URLs: `/Fortune-Tiger` casa com `fortune tiger`.
- Só casa palavra inteira: `bet` não pega `alphabet`, `sex` não pega `sexta`.
- A lista de termos fica no topo de [`filtrar.py`](filtrar.py) (`TERMOS`) — editar ali.

> ⚠️ **Sempre revisar o resultado.** Termos como `sexo` (formulários), `crack` (campanhas de saúde)
> e `apostas` (notícias) aparecem em páginas legítimas.

## Arquivos

| Arquivo | O que é |
|---|---|
| `filtrar.py` | Script do filtro (fase 1) |
| `buscar_gsc.py` | Busca na API do Search Console + sitemap (fase 2) |
| `requirements.txt` | Bibliotecas do Google (só fase 2) |
| `exemplo.csv` | Planilha **fictícia** no formato do Search Console, para teste |
| `CLAUDE.md` | Regras do código e roteiro das próximas fases |

Planilhas reais, JSON e credenciais **não** entram no repositório (bloqueados no `.gitignore`).

## Próximas fases

1. ✅ **Filtrar planilha** — `filtrar.py`
2. 🔧 **API do Search Console** — `buscar_gsc.py`: busca páginas na API (JSON) e gera `sitemap.xml` (falta credencial para rodar de verdade)
3. ⏳ **Análise de padrões das URLs** — achar suspeitas que a lista de termos não pega
   (pastas novas, slugs aleatórios, idioma estranho, extensões fora do padrão)

Detalhes de cada fase em [`CLAUDE.md`](CLAUDE.md).

## Equipe

- Fabio Ramos — [@fabioramos-02](https://github.com/fabioramos-02)
- Antonio — [@AntonioPecin](https://github.com/AntonioPecin)
