"""Persistência da lista de termos customizados.

Guarda `termos_custom.json` na raiz do projeto. Formato:
    {"custom": ["termo1", "termo2", ...]}

Zero dependência externa. Padrões (TERMOS_PADRAO) ficam no código em `filtrar.py` e nunca
são removidos daqui — só o custom é editável via UI.
"""
import json
from pathlib import Path

ARQUIVO = Path(__file__).parent / "termos_custom.json"


def carregar_customizados() -> list[str]:
    """Lê os termos customizados do disco. Devolve [] se não existir ou se o arquivo for inválido."""
    if not ARQUIVO.exists():
        return []
    try:
        dados = json.loads(ARQUIVO.read_text(encoding="utf-8"))
        lista = dados.get("custom", []) if isinstance(dados, dict) else []
        return [str(t).strip() for t in lista if str(t).strip()]
    except (json.JSONDecodeError, OSError):
        return []


def salvar_customizados(lista: list[str]) -> list[str]:
    """Normaliza, grava em disco e recompila o regex do filtrar.py. Devolve a lista final."""
    import filtrar

    # Normaliza: tira espaços, remove duplicados preservando ordem.
    vistos = set()
    normalizada: list[str] = []
    for item in lista:
        t = str(item).strip()
        if t and t not in vistos:
            vistos.add(t)
            normalizada.append(t)

    ARQUIVO.write_text(json.dumps({"custom": normalizada}, ensure_ascii=False, indent=2), encoding="utf-8")
    filtrar._recompilar(normalizada)
    return normalizada


def aplicar_customizados_no_boot() -> list[str]:
    """Chamado uma vez no start do backend: carrega do disco e aplica no regex."""
    import filtrar

    custom = carregar_customizados()
    filtrar._recompilar(custom)
    return custom


def testar():
    """Teste rápido: roundtrip no arquivo (usa pasta temporária pra não sujar o repo)."""
    global ARQUIVO
    import tempfile

    original = ARQUIVO
    try:
        with tempfile.TemporaryDirectory() as tmp:
            ARQUIVO = Path(tmp) / "termos_custom.json"
            assert carregar_customizados() == []
            final = salvar_customizados(["abc", "def", "abc", "  ghi  "])
            assert final == ["abc", "def", "ghi"]
            assert carregar_customizados() == ["abc", "def", "ghi"]
    finally:
        ARQUIVO = original
        # restaura o estado do filtrar (zera o custom)
        import filtrar as _f
        _f._recompilar()
    print("OK: termos_store testado")


if __name__ == "__main__":
    testar()
