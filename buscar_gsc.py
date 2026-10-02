"""Fase 2: busca as páginas de um site na API do Search Console, marca as suspeitas e gera o sitemap.

Antes de usar, siga o passo a passo do CLAUDE.md (service account + credenciais.json).

Uso:
    python buscar_gsc.py --listar                                # mostra os sites que a credencial enxerga
    python buscar_gsc.py sc-domain:exemplo.ms.gov.br             # últimos 90 dias
    python buscar_gsc.py https://www.exemplo.ms.gov.br/ --dias 30
    python buscar_gsc.py --teste                                 # testes sem internet
"""
import argparse
import json
import os
import xml.etree.ElementTree as ET
from datetime import date, timedelta

from filtrar import termos_encontrados  # mesma lista de termos da fase 1

ESCOPO = ["https://www.googleapis.com/auth/webmasters.readonly"]  # só leitura
LIMITE_POR_PAGINA = 25000  # máximo que a API devolve por chamada


def conectar(arquivo_credenciais):
    """Abre a conexão com a API usando a chave da service account."""
    # Import aqui dentro: assim o --teste roda mesmo sem as bibliotecas do Google instaladas.
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    if not os.path.exists(arquivo_credenciais):
        raise SystemExit(f"Credencial '{arquivo_credenciais}' não encontrada. Veja a Fase 2 no CLAUDE.md.")
    credenciais = service_account.Credentials.from_service_account_file(arquivo_credenciais, scopes=ESCOPO)
    return build("searchconsole", "v1", credentials=credenciais)


def listar_sites(servico):
    """Sites (propriedades) em que a service account foi adicionada como usuária."""
    return [s["siteUrl"] for s in servico.sites().list().execute().get("siteEntry", [])]


def buscar_paginas(servico, site, inicio, fim):
    """Devolve todas as páginas com impressão no período, de 25 000 em 25 000."""
    paginas = []
    while True:
        corpo = {
            "startDate": inicio,
            "endDate": fim,
            "dimensions": ["page"],
            "rowLimit": LIMITE_POR_PAGINA,
            "startRow": len(paginas),  # continua de onde parou
        }
        resposta = servico.searchanalytics().query(siteUrl=site, body=corpo).execute()
        linhas = resposta.get("rows", [])
        paginas += [
            {
                "url": l["keys"][0],
                "cliques": l["clicks"],
                "impressoes": l["impressions"],
                "ctr": round(l["ctr"], 4),
                "posicao": round(l["position"], 1),
            }
            for l in linhas
        ]
        if len(linhas) < LIMITE_POR_PAGINA:  # veio menos que o máximo = acabou
            return paginas


def marcar_suspeitas(paginas):
    """Adiciona o campo "termos" em cada página (lista vazia = página limpa)."""
    for p in paginas:
        p["termos"] = termos_encontrados(p["url"])
    return paginas


def gerar_sitemap(urls, caminho):
    """Grava um sitemap.xml no padrão sitemaps.org (máx. 50 000 URLs por arquivo)."""
    # ponytail: um arquivo só; se passar de 50 000 URLs, dividir em vários + sitemap index
    if len(urls) > 50000:
        raise ValueError(f"{len(urls)} URLs: passa do limite de 50 000 por sitemap")
    raiz = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for url in urls:
        ET.SubElement(ET.SubElement(raiz, "url"), "loc").text = url
    ET.indent(raiz)  # deixa o XML legível
    ET.ElementTree(raiz).write(caminho, encoding="utf-8", xml_declaration=True)


def testar():
    paginas = marcar_suspeitas([
        {"url": "https://www.exemplo.ms.gov.br/servicos"},
        {"url": "https://www.exemplo.ms.gov.br/fortune-tiger"},
    ])
    assert paginas[0]["termos"] == []
    assert paginas[1]["termos"] == ["fortune tiger"]

    import tempfile
    caminho = os.path.join(tempfile.mkdtemp(), "sitemap.xml")
    gerar_sitemap(["https://www.exemplo.ms.gov.br/a?x=1&y=2"], caminho)
    locs = [e.text for e in ET.parse(caminho).iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    assert locs == ["https://www.exemplo.ms.gov.br/a?x=1&y=2"]  # o "&" volta certinho depois de escapado
    print("OK: todos os testes passaram")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Busca páginas no Search Console e gera o sitemap.")
    parser.add_argument("site", nargs="?", help='propriedade, ex.: "sc-domain:exemplo.ms.gov.br" ou "https://www.exemplo.ms.gov.br/"')
    parser.add_argument("--dias", type=int, default=90, help="período em dias até hoje (padrão: 90, máx. ~480)")
    parser.add_argument("--credenciais", default="credenciais.json", help="chave da service account")
    parser.add_argument("--listar", action="store_true", help="lista os sites disponíveis e sai")
    parser.add_argument("--teste", action="store_true", help="roda os testes e sai")
    args = parser.parse_args()

    if args.teste:
        testar()
    elif args.listar:
        for site in listar_sites(conectar(args.credenciais)):
            print(site)
    elif not args.site:
        parser.error("informe o site (use --listar para ver os disponíveis)")
    else:
        fim = date.today()
        inicio = fim - timedelta(days=args.dias)
        paginas = marcar_suspeitas(buscar_paginas(conectar(args.credenciais), args.site, str(inicio), str(fim)))

        with open("paginas.json", "w", encoding="utf-8") as f:
            json.dump({"site": args.site, "inicio": str(inicio), "fim": str(fim), "paginas": paginas},
                      f, ensure_ascii=False, indent=2)

        suspeitas = [p for p in paginas if p["termos"]]
        limpas = [p["url"] for p in paginas if not p["termos"]]
        gerar_sitemap(limpas, "sitemap.xml")

        print(f"{len(paginas)} página(s) de {inicio} a {fim} -> paginas.json")
        print(f"{len(limpas)} limpa(s) -> sitemap.xml")
        print(f"{len(suspeitas)} suspeita(s):")
        for p in suspeitas:
            print(f"  [{', '.join(p['termos'])}] {p['url']}")
