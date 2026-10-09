"""Loader minimalista de .env (stdlib, sem python-dotenv)."""
import os
from pathlib import Path


def carregar(arquivo=".env"):
    """Lê KEY=VALUE do .env e injeta em os.environ (sem sobrescrever já definidos)."""
    p = Path(arquivo)
    if not p.exists():
        return
    for linha in p.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, _, valor = linha.partition("=")
        os.environ.setdefault(chave.strip(), valor.strip().strip('"').strip("'"))
