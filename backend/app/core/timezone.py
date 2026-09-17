import datetime
from zoneinfo import ZoneInfo

# Fuso horário oficial do ecossistema Sentinela Frigate Pro
TZ_BRASILIA = ZoneInfo("America/Sao_Paulo")

def get_brasilia_now() -> datetime.datetime:
    """
    Retorna o horário atual estritamente calibrado no fuso de Brasília (America/Sao_Paulo, UTC-3).
    O objeto datetime retornado é naive (sem tzinfo anexado) para garantir compatibilidade
    nativa e transparente com SQLite, Pydantic e ordenações de queries SQLAlchemy.
    """
    return datetime.datetime.now(TZ_BRASILIA).replace(tzinfo=None)

def get_brasilia_isoformat() -> str:
    """Retorna o timestamp ISO 8601 correspondente ao fuso de Brasília."""
    return get_brasilia_now().isoformat()
