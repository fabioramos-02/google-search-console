"""Filtra um CSV e lista as células (links/textos) que contêm termos suspeitos.

Uso:
    python filtrar.py planilha.csv              # gera maliciosas.csv e boas.csv
    python filtrar.py planilha.csv -o saida.csv
    python filtrar.py --teste                   # roda os testes rápidos
"""
import argparse
import csv
import math
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
    # messaging / comunidades (golpes de sinais, pirataria, MMN)
    # "whatsapp" sozinho não entra: é comum em páginas de contato oficial.
    "t.me", "telegram", "canal vip", "grupo vip", "grupo exclusivo",
    "wa.me", "whatsapp grupo",
    "discord.gg", "discord",
    # iptv / streaming pirata
    "iptv", "lista m3u", "m3u8", "tv box", "futemax", "redecanais",
    "assistir online grátis", "filmes online grátis",
]

# Possíveis nomes da coluna que lista as páginas no export do Search Console.
COLUNAS_URL = ["Páginas principais", "Top pages", "Página", "Page", "URL", "Url", "url"]


def normalizar(texto):
    """Deixa o texto comparável: minúsculo, sem acento e com separadores de URL virando espaço.

    Ex.: "https://x.ms.gov.br/Fortune-Tiger" -> "https:  x ms gov br fortune tiger"
    """
    texto = unicodedata.normalize("NFD", str(texto).lower())
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
    if texto is None:
        return []
    # NaN do pandas é float; vira string "nan" e não casa com nada — seguro.
    if isinstance(texto, float) and math.isnan(texto):
        return []
    return sorted(set(PADRAO.findall(normalizar(texto))))


def filtrar(caminho_csv):
    """Percorre todas as células do CSV e devolve (maliciosas, boas)."""
    maliciosas = []
    boas = []
    # utf-8-sig: aceita CSV com ou sem BOM (o export do Google vem com BOM)
    with open(caminho_csv, encoding="utf-8-sig", newline="") as f:
        leitor = csv.reader(f)
        cabecalho = next(leitor, [])
        for n_linha, linha in enumerate(leitor, start=2):  # linha 1 é o cabeçalho
            for i, celula in enumerate(linha):
                termos = termos_encontrados(celula)
                coluna = cabecalho[i] if i < len(cabecalho) else f"coluna {i + 1}"
                if termos:
                    maliciosas.append({
                        "linha": n_linha,
                        "coluna": coluna,
                        "url": " ".join(URL.findall(celula)),
                        "termos": ", ".join(termos),
                        "trecho": celula[:150],
                    })
                else:
                    for link in URL.findall(celula):
                        boas.append({"linha": n_linha, "coluna": coluna, "url": link})
    return maliciosas, boas


def _detectar_coluna(df):
    """Devolve o nome da primeira coluna conhecida do export GSC, ou None."""
    for nome in COLUNAS_URL:
        if nome in df.columns:
            return nome
    return None


def filtrar_url_from_rows(linhas):
    """Núcleo testável: recebe lista de strings, devolve (maliciosas, boas) como [{"url": ...}]."""
    maliciosas, boas = [], []
    for linha in linhas:
        if linha is None or (isinstance(linha, float) and math.isnan(linha)):
            continue
        url = str(linha)
        if termos_encontrados(url):
            maliciosas.append({"url": url})
        else:
            boas.append({"url": url})
    return maliciosas, boas


def filtrar_url(caminho_csv, coluna=None):
    """Lê CSV via pandas e devolve (maliciosas, boas). Detecta coluna automaticamente."""
    df = pd.read_csv(caminho_csv)
    coluna = coluna or _detectar_coluna(df)
    if coluna is None:
        # fallback: usa a primeira coluna
        coluna = df.columns[0]
    linhas = df[coluna].dropna().astype(str).tolist()
    return filtrar_url_from_rows(linhas)


def salvar_url_maliciosas(maliciosas, caminho_saida):
    with open(caminho_saida, "w", encoding="utf-8-sig", newline="") as f:  # BOM: Excel abre com acento certo
        campos = ["linha", "coluna", "url", "termos", "trecho"] if maliciosas and "linha" in maliciosas[0] else ["url"]
        escritor = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
        escritor.writeheader()
        escritor.writerows(maliciosas)


def salvar_url_boas(boas, caminho_saida):
    with open(caminho_saida, "w", encoding="utf-8-sig", newline="") as f:
        campos = ["linha", "coluna", "url"] if boas and "linha" in boas[0] else ["url"]
        escritor = csv.DictWriter(f, fieldnames=campos, extrasaction="ignore")
        escritor.writeheader()
        escritor.writerows(boas)


def testar():
    # regex básico
    assert termos_encontrados("https://x.ms.gov.br/fortune-tiger") == ["fortune tiger"]
    assert termos_encontrados("Página PORNÔ") == ["porno"]
    assert termos_encontrados("https://x.ms.gov.br/bet365-bonus") == ["bet365"]
    assert termos_encontrados("download_gratis.html") == ["download gratis"]
    assert termos_encontrados("alphabet") == []            # "bet" dentro de palavra não conta
    assert termos_encontrados("reunião na sexta") == []    # "sex" dentro de palavra não conta
    assert termos_encontrados("https://www.detran.ms.gov.br/servicos") == []

    # categorias novas — normalizar() troca "." por espaço, por isso "t.me" vira "t me"
    assert "t me" in termos_encontrados("https://t.me/canalgolpe")
    assert "discord gg" in termos_encontrados("acesse discord.gg/xyz")
    assert "wa me" in termos_encontrados("wa.me/5567999999999")
    assert "iptv" in termos_encontrados("lista iptv grátis")
    assert "telegram" in termos_encontrados("entre no telegram para ganhar")
    # falsos positivos que não podem casar
    assert termos_encontrados("fale pelo whatsapp (67) 9999-9999") == []  # "whatsapp" sozinho não casa
    assert termos_encontrados("enviamos telegrama oficial") == []         # "telegram" não casa "telegrama"

    # NaN e tipos não-string
    assert termos_encontrados(float("nan")) == []
    assert termos_encontrados(None) == []

    # filtrar_url_from_rows
    mal, boas = filtrar_url_from_rows(["https://x.ms.gov.br/ok", "https://x.ms.gov.br/bet365"])
    assert mal == [{"url": "https://x.ms.gov.br/bet365"}]
    assert boas == [{"url": "https://x.ms.gov.br/ok"}]
    mal, boas = filtrar_url_from_rows([float("nan"), "https://x.ms.gov.br/ok"])
    assert mal == []
    assert boas == [{"url": "https://x.ms.gov.br/ok"}]

    print("OK: todos os testes passaram")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lista links/textos de um CSV com termos suspeitos.")
    parser.add_argument("csv", nargs="?", help="planilha de entrada (.csv)")
    parser.add_argument("-o", "--saida", default="maliciosas.csv", help="arquivo de saída (padrão: maliciosas.csv)")
    parser.add_argument("--teste", action="store_true", help="roda os testes e sai")
    args = parser.parse_args()

    if args.teste:
        testar()
    elif not args.csv:
        parser.error("informe o CSV de entrada")
    else:
        maliciosas, boas = filtrar(args.csv)
        salvar_url_maliciosas(maliciosas, args.saida)
        salvar_url_boas(boas, "boas.csv")
        print(f"{len(boas)} URL(s) boa(s) -> boas.csv")
        print(f"{len(maliciosas)} achado(s) malicioso(s) -> {args.saida}")
        contagem = Counter(t for a in maliciosas for t in a["termos"].split(", "))
        for termo, qtd in contagem.most_common():
            print(f"  {termo}: {qtd}")
