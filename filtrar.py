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
    "sexo", "sex", "nudes", "onlyfans","pelada",
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

def salvar_url_boas(url_boas, caminho_saida):
    with open(caminho_saida, "w", encoding="utf-8-sig", newline="") as f:  # BOM: Excel abre com acento certo
        escritor = csv.DictWriter(f, fieldnames=["url"])
        escritor.writeheader()
        escritor.writerows(url_boas)
