"""Filtra um CSV e lista as células (links/textos) que contêm termos suspeitos.

Uso:
    python filtrar.py planilha.csv              # gera resultado.csv
    python filtrar.py planilha.csv -o saida.csv
    python filtrar.py --teste                   # roda os testes rápidos
"""
import argparse
import csv
import re
import unicodedata
from collections import Counter
import pandas as pd

# Mesma lista do filtro "site:seusite.ms.gov.br (...)". Para mudar o filtro, edite só aqui.
TERMOS = [
    # conteúdo adulto
    "xvideos", "xvodeos", "xnxx", "pornhub", "porn", "porno", "pornô", "xxx",
    "sexo", "sex", "nudes", "onlyfans",
    # apostas
    "bet", "bets", "bet365", "betano", "blaze", "casino", "cassino", "slots",
    "tigrinho", "fortune tiger", "apostas", "jogo do bicho",
    # farmácia
    "viagra", "cialis", "sildenafil", "tadalafil", "kamagra", "buy pills",
    "online pharmacy", "male enhancement",
    # pirataria
    "crack", "keygen", "serial key", "ativador", "torrent", "download grátis",
    "free download", "premium apk", "mod apk",
    # golpes financeiros
    "renda garantida", "lucro garantido", "ganhe dinheiro", "robô trader",
    "double your money", "crypto giveaway", "free bitcoin",
]


def normalizar(texto):
    """Deixa o texto comparável: minúsculo, sem acento e com separadores de URL virando espaço.

    Ex.: "https://x.ms.gov.br/Fortune-Tiger" -> "https:  x ms gov br fortune tiger"
    """
    texto = unicodedata.normalize("NFD", texto.lower())
    texto = "".join(c for c in texto if not unicodedata.combining(c))  # tira acentos
    texto = texto.replace("%20", " ")
    return re.sub(r"[-_/.+=?&#]", " ", texto)


# \b = borda de palavra: "bet" casa "bet" e "bet-365", mas NÃO casa "alphabet" nem "betão".
# Termos longos primeiro para "bet365" ganhar de "bet".
_termos = sorted({normalizar(t) for t in TERMOS}, key=len, reverse=True)
PADRAO = re.compile(r"\b(" + "|".join(re.escape(t) for t in _termos) + r")\b")
URL = re.compile(r"https?://[^\s\"',|)]+")


def termos_encontrados(texto):
    """Devolve a lista (sem repetição) de termos suspeitos presentes no texto."""
    return sorted(set(PADRAO.findall(normalizar(texto))))

url_boas = []

def filtrar(caminho_csv):
    """Percorre todas as células do CSV e devolve uma linha de resultado para cada achado."""
    achados = []
    # utf-8-sig: aceita CSV com ou sem BOM (o export do Google vem com BOM)
    with open(caminho_csv, encoding="utf-8-sig", newline="") as f:
        leitor = csv.reader(f)
        cabecalho = next(leitor, [])
        for n_linha, linha in enumerate(leitor, start=2):  # linha 1 é o cabeçalho
            for i, celula in enumerate(linha):
                termos = termos_encontrados(celula)
                coluna = cabecalho[i] if i < len(cabecalho) else f"coluna {i + 1}"
                if termos:
                    achados.append({
                        "linha": n_linha,
                        "coluna": coluna,
                        "url": " ".join(URL.findall(celula)),
                        "termos": ", ".join(termos),
                        "trecho": celula[:150],
                    })
                else:
                    links = URL.findall(celula)
                    for link in links:
                        url_boas.append({
                        "linha": n_linha,
                        "coluna": coluna,
                        "url": " ".join(URL.findall(celula)),
                        })
    return achados

def filtrar_url(caminho_csv):
    achados = []
    if caminho_csv is not None:
        leitor = pd.read_csv(caminho_csv)
        for linha in leitor['Páginas principais'].tolist():
            termos = termos_encontrados(linha)
            if termos:
                achados.append({
                    "url": linha
                })
            else:
                url_boas.append({
                    "url": linha
                })
        return achados
        
def get_url_boas():
    return url_boas

def salvar_url_maliciosas(achados, caminho_saida):
    with open(caminho_saida, "w", encoding="utf-8-sig", newline="") as f:  # BOM: Excel abre com acento certo
        escritor = csv.DictWriter(f, fieldnames=["linha", "coluna", "url", "termos", "trecho"])
        escritor.writeheader()
        escritor.writerows(achados)

def salvar_url_boas(url_boas, caminho_saida):
    with open(caminho_saida, "w", encoding="utf-8-sig", newline="") as f:  # BOM: Excel abre com acento certo
        escritor = csv.DictWriter(f, fieldnames=["linha", "coluna", "url", "termos", "trecho"])
        escritor.writeheader()
        escritor.writerows(url_boas)

def testar():
    assert termos_encontrados("https://x.ms.gov.br/fortune-tiger") == ["fortune tiger"]
    assert termos_encontrados("Página PORNÔ") == ["porno"]
    assert termos_encontrados("https://x.ms.gov.br/bet365-bonus") == ["bet365"]
    assert termos_encontrados("download_gratis.html") == ["download gratis"]
    assert termos_encontrados("alphabet") == []  # "bet" dentro de palavra não conta
    assert termos_encontrados("reunião na sexta") == []  # "sex" dentro de palavra não conta
    assert termos_encontrados("https://www.detran.ms.gov.br/servicos") == []
    print("OK: todos os testes passaram")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lista links/textos de um CSV com termos suspeitos.")
    parser.add_argument("csv", nargs="?", help="planilha de entrada (.csv)")
    parser.add_argument("-o", "--saida", default="resultado.csv", help="arquivo de saída (padrão: resultado.csv)")
    parser.add_argument("--teste", action="store_true", help="roda os testes e sai")
    args = parser.parse_args()

    if args.teste:
        testar()
    elif not args.csv:
        parser.error("informe o CSV de entrada")
    else:
        achados = filtrar(args.csv)
        salvar_url_maliciosas(achados, "maliciosas.csv")
        salvar_url_boas(url_boas, "boas.csv")
        print(f"{len(url_boas)} URL(s) boa(s) -> boas.csv")
        print(f"{len(achados)} achado(s) malicioso(s) -> maliciosas.csv")
        contagem = Counter(t for a in achados for t in a["termos"].split(", "))
        for termo, qtd in contagem.most_common():
            print(f"  {termo}: {qtd}")
