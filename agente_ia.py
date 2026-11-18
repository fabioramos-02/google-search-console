"""Agente de IA que revisa as URLs suspeitas e separa invasão real de falso positivo.

Os termos de `filtrar.py` marcam também páginas oficiais (ex.: notícia sobre apreensão de drogas,
regulamentação de apostas). Este módulo manda só as suspeitas a um modelo leve (gpt-oss:20b no
Ollama da SES, API compatível com OpenAI) e guarda o veredito por URL em `veredictos_ia.json`,
para a mesma URL não ir de novo ao modelo.

Base: backend do projeto poc-llm (`backend/conexao_agente.py`). Só stdlib, sem `requests`.

Variáveis de ambiente (.env):
    LLM_API_KEY   obrigatória (sem ela o endpoint devolve 503)
    LLM_BASE_URL  padrão https://ollamases.saude.ms.gov.br/v1
    LLM_MODEL     padrão gpt-oss:20b

Rodar:
    python agente_ia.py --teste
"""
import argparse
import json
import os
import urllib.request
from datetime import date
from pathlib import Path

ARQUIVO = Path(__file__).parent / "veredictos_ia.json"
LIMITE_POR_CHAMADA = 200  # proteção: o endpoint é público e cada URL custa tempo de modelo
TAMANHO_LOTE = 25         # URLs por pergunta ao modelo

PROMPT_SISTEMA = """Você revisa URLs de sites do Governo de Mato Grosso do Sul (*.ms.gov.br).
Sites do governo invadidos ganham páginas falsas de pornografia, apostas, cassino, farmácia,
pirataria, canais de Telegram ou WhatsApp de golpe, listas IPTV e portais sensacionalistas
(ex.: Portal Zacarias). Um filtro de palavras já marcou cada URL abaixo como suspeita.

Para cada URL, decida:
- "malicioso": conteúdo que o Governo de MS nunca publicaria (propaganda de aposta ou cassino,
  pornografia, venda de remédio, download pirata, convite para grupo VIP, lista IPTV, link de
  portal sensacionalista).
- "legitimo": conteúdo oficial que só cita o termo (notícia de apreensão de drogas, campanha
  contra o crack, regulamentação de apostas, formulário com campo "sexo", página de contato).

Responda SOMENTE com um array JSON, sem texto antes ou depois, no formato:
[{"url": "...", "veredito": "malicioso" ou "legitimo", "motivo": "frase curta em português"}]"""


def configurado() -> bool:
    """A IA só funciona com chave no ambiente."""
    return bool(os.environ.get("LLM_API_KEY"))


def chamar_llm(messages: list[dict]) -> str:
    """Chama /chat/completions (padrão OpenAI) e devolve o texto da resposta."""
    base = os.environ.get("LLM_BASE_URL", "https://ollamases.saude.ms.gov.br/v1").rstrip("/")
    corpo = json.dumps({
        "model": os.environ.get("LLM_MODEL", "gpt-oss:20b"),
        "messages": messages,
        "stream": False,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/chat/completions",
        data=corpo,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {os.environ['LLM_API_KEY']}"},
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        dados = json.loads(resp.read().decode("utf-8"))
    return dados.get("choices", [{}])[0].get("message", {}).get("content", "")


def extrair_json(texto: str) -> list[dict]:
    """Pega o array JSON da resposta, mesmo com texto em volta. Devolve [] se não houver."""
    inicio, fim = texto.find("["), texto.rfind("]")
    if inicio == -1 or fim < inicio:
        return []
    try:
        dados = json.loads(texto[inicio:fim + 1])
    except json.JSONDecodeError:
        return []
    return [d for d in dados if isinstance(d, dict) and "url" in d]


def carregar() -> dict:
    """Lê os vereditos já salvos. Devolve {} se o arquivo não existir ou for inválido."""
    try:
        dados = json.loads(ARQUIVO.read_text(encoding="utf-8"))
        return dados if isinstance(dados, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def salvar(vereditos: dict) -> None:
    ARQUIVO.write_text(json.dumps(vereditos, ensure_ascii=False, indent=2), encoding="utf-8")


def _perguntar_lote(lote: list[dict]) -> dict:
    """Manda um lote ao modelo e devolve {url: {veredito, motivo}} só com respostas válidas."""
    linhas = "\n".join(f"- {p['url']} (termos: {', '.join(p.get('termos') or []) or 'nenhum'})" for p in lote)
    resposta = chamar_llm([
        {"role": "system", "content": PROMPT_SISTEMA},
        {"role": "user", "content": f"URLs:\n{linhas}"},
    ])
    urls_do_lote = {p["url"] for p in lote}
    hoje = str(date.today())
    saida = {}
    for item in extrair_json(resposta):
        veredito = str(item.get("veredito", "")).lower()
        if item["url"] in urls_do_lote and veredito in ("malicioso", "legitimo"):
            saida[item["url"]] = {"veredito": veredito, "motivo": str(item.get("motivo", "")), "data": hoje}
    return saida


def analisar(paginas: list[dict]) -> dict:
    """Analisa até LIMITE_POR_CHAMADA páginas [{url, termos}]. URL já julgada vem do arquivo.

    Devolve {"resultados": [{url, veredito, motivo, do_cache}], "cortadas": int}.
    """
    cortadas = max(0, len(paginas) - LIMITE_POR_CHAMADA)
    paginas = paginas[:LIMITE_POR_CHAMADA]
    salvos = carregar()

    novas = [p for p in paginas if p["url"] not in salvos]
    novos_vereditos = {}
    for i in range(0, len(novas), TAMANHO_LOTE):
        lote = _perguntar_lote(novas[i:i + TAMANHO_LOTE])
        novos_vereditos.update(lote)
        salvos.update(lote)
        salvar(salvos)  # grava a cada lote: se o modelo cair no meio, o já feito não se perde

    resultados = []
    for p in paginas:
        v = salvos.get(p["url"])
        if v:
            resultados.append({"url": p["url"], "veredito": v["veredito"], "motivo": v["motivo"],
                               "do_cache": p["url"] not in novos_vereditos})
        else:  # modelo não respondeu essa URL: não salva, tenta de novo no próximo clique
            resultados.append({"url": p["url"], "veredito": "indefinido", "motivo": "", "do_cache": False})
    return {"resultados": resultados, "cortadas": cortadas}


def testar():
    """Testa parser e fluxo de cache sem chamar o modelo de verdade."""
    global ARQUIVO, chamar_llm
    import tempfile

    # extrair_json aguenta texto em volta e resposta inválida
    assert extrair_json('Claro! [{"url": "a", "veredito": "legitimo"}] fim') == [{"url": "a", "veredito": "legitimo"}]
    assert extrair_json("sem json") == []
    assert extrair_json("[quebrado") == []
    assert extrair_json('[{"sem_url": 1}, 3]') == []

    chamadas = []

    def falso(messages):
        """Responde malicioso para URL com 'bet' e esquece a URL com 'sumiu'."""
        chamadas.append(messages)
        urls = [linha[2:].split(" (")[0] for linha in messages[1]["content"].splitlines()[1:]]
        return json.dumps([
            {"url": u, "veredito": "malicioso" if "bet" in u else "legitimo", "motivo": "teste"}
            for u in urls if "sumiu" not in u
        ])

    original_arq, original_llm = ARQUIVO, chamar_llm
    try:
        with tempfile.TemporaryDirectory() as tmp:
            ARQUIVO = Path(tmp) / "veredictos_ia.json"
            chamar_llm = falso
            paginas = [{"url": "https://x.ms.gov.br/bet365", "termos": ["bet365"]},
                       {"url": "https://x.ms.gov.br/noticia-drogas", "termos": ["drogas"]},
                       {"url": "https://x.ms.gov.br/sumiu", "termos": []}]
            r = analisar(paginas)
            vered = {x["url"]: x["veredito"] for x in r["resultados"]}
            assert vered == {"https://x.ms.gov.br/bet365": "malicioso",
                             "https://x.ms.gov.br/noticia-drogas": "legitimo",
                             "https://x.ms.gov.br/sumiu": "indefinido"}, vered
            assert r["cortadas"] == 0 and len(chamadas) == 1
            assert not any(x["do_cache"] for x in r["resultados"])

            # 2ª vez: só a indefinida volta ao modelo; as outras vêm do arquivo
            r = analisar(paginas)
            assert len(chamadas) == 2 and "sumiu" in chamadas[1][1]["content"]
            assert "bet365" not in chamadas[1][1]["content"]
            assert [x["do_cache"] for x in r["resultados"]] == [True, True, False]

            # corte em 200 e lotes de 25
            chamadas.clear()
            muitas = [{"url": f"https://x.ms.gov.br/p{i}", "termos": []} for i in range(230)]
            r = analisar(muitas)
            assert r["cortadas"] == 30 and len(r["resultados"]) == 200
            assert len(chamadas) == 8
    finally:
        ARQUIVO, chamar_llm = original_arq, original_llm
    print("OK: agente_ia testado")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Agente de IA que revisa URLs suspeitas.")
    parser.add_argument("--teste", action="store_true", help="roda os testes e sai")
    args = parser.parse_args()
    if args.teste:
        testar()
    else:
        parser.print_help()
