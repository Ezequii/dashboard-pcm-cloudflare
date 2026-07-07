"""
Tratamento, normalização e enriquecimento da planilha de RC.

Este módulo concentra as regras de negócio:
LANÇAMENTO -> PEDIDO -> NF -> CONCLUÍDO.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable
import re
import unicodedata

import numpy as np
import pandas as pd

from services.constants import (
    CANONICAL_COLUMNS,
    DATE_COLUMNS,
    VALUE_COLUMNS,
    STAGE_ORDER,
)


HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "DATA DE RECEBIMENTO": (
        "DATA DE RECEBIMENTO",
        "DATA RECEBIMENTO",
        "DT RECEBIMENTO",
        "RECEBIMENTO",
    ),
    "DATA LANÇAMENTO": (
        "DATA LANÇAMENTO",
        "DATA LANCAMENTO",
        "DT LANÇAMENTO",
        "DT LANCAMENTO",
    ),
    "PREFIXO": ("PREFIXO", "PREFIXO "),
    "EQUIPAMENTO": ("EQUIPAMENTO", "DESCRIÇÃO EQUIPAMENTO", "DESCRICAO EQUIPAMENTO"),
    "FORNECEDOR": ("FORNECEDOR", "FORNECEDORES"),
    "Nº ORÇAMENTO FINAL": (
        "Nº ORÇAMENTO FINAL",
        "Nº ORÇ. FINAL",
        "NO ORCAMENTO FINAL",
        "N ORC FINAL",
        "ORÇAMENTO FINAL",
        "ORCAMENTO FINAL",
        "Nº ORÇ FINAL",
    ),
    "VALOR SERVIÇO": ("VALOR SERVIÇO", "VALOR SERVICO", "SERVIÇO", "SERVICO"),
    "VALOR PEÇAS": ("VALOR PEÇAS", "VALOR PECAS", "PEÇAS", "PECAS"),
    "VALOR TOTAL": ("VALOR TOTAL", "TOTAL"),
    "SOLICITANTE": ("SOLICITANTE", "REQUISITANTE"),
    "Nº ORDEM SERVIÇO": (
        "Nº ORDEM SERVIÇO",
        "Nº ORDEM DE SERVIÇO",
        "NO ORDEM SERVICO",
        "ORDEM SERVIÇO",
        "ORDEM DE SERVIÇO",
        "ORDEM SERVICO",
        "OS",
    ),
    "Nº REQUISIÇÃO": (
        "Nº REQUISIÇÃO",
        "Nº REQUISICAO",
        "NO REQUISICAO",
        "REQUISIÇÃO",
        "REQUISICAO",
        "RC",
        "REQ",
    ),
    "Nº PEDIDO DE COMPRA": (
        "Nº PEDIDO DE COMPRA",
        "Nº PEDIDO COMPRA",
        "NO PEDIDO DE COMPRA",
        "PEDIDO DE COMPRA",
        "PEDIDO COMPRA",
        "PEDIDO",
        "PC",
    ),
    "DATA DO PEDIDO": ("DATA DO PEDIDO", "DT PEDIDO", "DATA PEDIDO"),
    "Nº NFS/DANFE": (
        "Nº NFS/DANFE",
        "Nº NFS",
        "NFS/DANFE",
        "NF",
        "NFS",
        "DANFE",
        "NOTA FISCAL",
    ),
    "DATA LANÇAMENTO NFS": (
        "DATA LANÇAMENTO NFS",
        "DATA LANÇAMENTO(NFS)",
        "DATA LANCAMENTO NFS",
        "DATA LANÇAMENTO NF",
        "DATA NF",
        "DATA NFS",
    ),
    "STATUS": ("STATUS", "SITUAÇÃO", "SITUACAO"),
    "OBS ADICIONAIS": ("OBS ADICIONAIS", "OBS", "OBSERVAÇÃO", "OBSERVACAO", "OBSERVAÇÕES"),
}


# Marcadores que na planilha significam ausência real de dado operacional.
# Regra v69: "-" e "*" são marcadores de FEITO/CONSIDERADO e contam como campo preenchido.
# Assim, "*" ou "-" em pedido/NF/lançamento avançam a etapa em vez de cair como pendência.
DONE_MARKERS = {"*", "＊", "-", "--", "---", "–", "—", "−"}
OPERATIONAL_BLANK_MARKERS = {
    "", "NAN", "NAT", "NONE", "NULL",
    "NA", "N/A", "N A", "SEM INFORMACAO", "SEM INFORMAÇÃO",
}

def is_done_marker(text: Any) -> bool:
    """True quando a célula tem marcador operacional que deve contar como feito/preenchido."""
    if text is None or (isinstance(text, float) and np.isnan(text)):
        return False
    return str(text).strip() in DONE_MARKERS


def is_operational_blank_text(text: Any) -> bool:
    """True quando a célula é vazia operacional. Traço e asterisco contam como feito."""
    if text is None:
        return True
    if isinstance(text, float) and np.isnan(text):
        return True
    raw = str(text).strip()
    if raw == "":
        return True
    # Antes de normalizar, preserva os símbolos que significam feito.
    if raw in DONE_MARKERS:
        return False
    if raw.upper() in OPERATIONAL_BLANK_MARKERS:
        return True
    norm = normalize_text(raw)
    return norm in OPERATIONAL_BLANK_MARKERS


def normalize_text(value: Any) -> str:
    """Normaliza texto para comparação sem acentos, espaços extras ou pontuação."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return ""
    text = str(value).strip().upper()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def to_display_text(value: Any) -> str:
    """Texto para exibição. Mantém * e - porque eles contam como feito na regra v69."""
    if pd.isna(value) or is_operational_blank_text(value):
        return ""
    return str(value).strip()


def is_blank_value(value: Any) -> bool:
    """Trata apenas vazios reais como ausência; * e - contam como preenchido/feito."""
    return is_operational_blank_text(value)


def rename_to_canonical(df: pd.DataFrame) -> pd.DataFrame:
    """Renomeia colunas reais da planilha para os nomes canônicos esperados pelo app."""
    normalized_aliases: dict[str, str] = {}
    for canonical, aliases in HEADER_ALIASES.items():
        for alias in aliases:
            normalized_aliases[normalize_text(alias)] = canonical

    used: set[str] = set()
    rename_map: dict[Any, str] = {}
    for column in df.columns:
        norm = normalize_text(column)
        canonical = normalized_aliases.get(norm)
        if canonical and canonical not in used:
            rename_map[column] = canonical
            used.add(canonical)

    out = df.rename(columns=rename_map).copy()

    # Remove colunas sem nome ou totalmente vazias que vêm da planilha.
    valid_columns = []
    for col in out.columns:
        name = str(col)
        if normalize_text(name).startswith("UNNAMED"):
            continue
        if normalize_text(name) == "":
            continue
        valid_columns.append(col)
    out = out.loc[:, valid_columns]

    # Garante a presença de todas as colunas oficiais, mesmo se uma aba vier incompleta.
    for col in CANONICAL_COLUMNS:
        if col not in out.columns:
            out[col] = pd.NA

    return out


def parse_money_series(series: pd.Series) -> pd.Series:
    """Converte valores monetários brasileiros e floats do Excel para número."""
    def parse_one(value: Any) -> float:
        if is_blank_value(value):
            return np.nan
        if isinstance(value, (int, float, np.integer, np.floating)):
            return float(value)
        text = str(value).strip()
        text = text.replace("R$", "").replace(" ", "")
        # Formato brasileiro: 1.234,56
        if "," in text and "." in text:
            text = text.replace(".", "").replace(",", ".")
        elif "," in text:
            text = text.replace(",", ".")
        text = re.sub(r"[^0-9.\-]", "", text)
        try:
            return float(text)
        except ValueError:
            return np.nan

    return series.map(parse_one)


def extract_dates(value: Any) -> list[pd.Timestamp]:
    """Extrai uma ou mais datas de células simples ou valores separados por pipe."""
    if is_blank_value(value):
        return []
    if isinstance(value, pd.Timestamp):
        return [value.normalize()]
    if hasattr(value, "date") and not isinstance(value, str):
        try:
            return [pd.Timestamp(value).normalize()]
        except Exception:
            return []

    text = str(value).strip()
    if not text:
        return []

    candidates: list[str] = []
    # Captura datas no padrão brasileiro.
    candidates.extend(re.findall(r"\b\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}\b", text))
    # Quando não encontra por regex, tenta separar por pipes ou barras de texto.
    if not candidates:
        candidates = [part.strip() for part in re.split(r"\s*\|\s*|;", text) if part.strip()]

    parsed: list[pd.Timestamp] = []
    for candidate in candidates:
        dt = pd.to_datetime(candidate, dayfirst=True, errors="coerce")
        if not pd.isna(dt):
            parsed.append(pd.Timestamp(dt).normalize())
    return parsed


def parse_date_series(series: pd.Series, prefer: str = "first") -> pd.Series:
    """
    Converte série de datas.
    prefer='first': primeira/menor data encontrada.
    prefer='last': última/maior data encontrada, útil para NF com múltiplas datas.
    """
    def parse_one(value: Any) -> pd.Timestamp | pd.NaT:
        dates = extract_dates(value)
        if not dates:
            return pd.NaT
        return min(dates) if prefer == "first" else max(dates)

    return series.map(parse_one)


def format_date_br(value: Any) -> str:
    if pd.isna(value):
        return ""
    try:
        return pd.Timestamp(value).strftime("%d/%m/%Y")
    except Exception:
        return ""


def normalize_status(value: Any) -> str:
    text = normalize_text(value)
    if not text:
        return ""
    if "CONCLUID" in text:
        return "CONCLUÍDO"
    return str(value).strip().upper()


def criar_etapa(df: pd.DataFrame) -> pd.Series:
    """
    Regra executiva exclusiva para os cards de acompanhamento.

    A classificação usa o avanço mais alto do processo.
    Regra v69: "-" e "*" contam como feito/preenchido.

    1. CONCLUÍDO: possui Nº NFS/DANFE, inclusive se for "-" ou "*".
    2. SEM NF: possui Nº PEDIDO DE COMPRA, inclusive se for "-" ou "*", mas não possui NF.
    3. SEM PEDIDO: possui DATA LANÇAMENTO, inclusive se for "-" ou "*", mas não possui pedido.
    4. SEM LANÇAMENTO: não possui DATA LANÇAMENTO, pedido nem NF.
    """
    if "DATA_LANCAMENTO_DT" in df.columns:
        tem_lancamento = df["DATA_LANCAMENTO_DT"].notna()
        if "DATA LANÇAMENTO" in df.columns:
            tem_lancamento = tem_lancamento | ~df["DATA LANÇAMENTO"].map(is_blank_value)
    else:
        tem_lancamento = ~df["DATA LANÇAMENTO"].map(is_blank_value)

    tem_pedido = ~df["Nº PEDIDO DE COMPRA"].map(is_blank_value)
    tem_nf = ~df["Nº NFS/DANFE"].map(is_blank_value)

    conditions = [
        tem_nf,
        tem_pedido & ~tem_nf,
        tem_lancamento & ~tem_pedido,
    ]
    choices = ["CONCLUÍDO", "SEM NF", "SEM PEDIDO"]
    return pd.Series(np.select(conditions, choices, default="SEM LANÇAMENTO"), index=df.index)


def calcular_dias_parado(df: pd.DataFrame) -> pd.Series:
    """Dias de pendência considerando a última etapa alcançada no processo."""
    if df.empty:
        return pd.Series(dtype="float")
    hoje = pd.Timestamp.today().normalize()
    base = df["DATA_RECEBIMENTO_DT"].copy()
    base = base.where(~df["ETAPA"].eq("SEM PEDIDO"), df["DATA_LANCAMENTO_DT"].fillna(df["DATA_RECEBIMENTO_DT"]))
    base = base.where(~df["ETAPA"].eq("SEM NF"), df["DATA_PEDIDO_DT"].fillna(df["DATA_LANCAMENTO_DT"]).fillna(df["DATA_RECEBIMENTO_DT"]))
    dias = (hoje - base).dt.days.astype("float")
    dias = dias.where(df["ETAPA"].ne("CONCLUÍDO"), 0.0)
    dias = dias.where((dias >= 0) & (dias <= 3650), np.nan)
    return dias


def preparar_base_equipamento(df_equip: pd.DataFrame | None) -> pd.DataFrame:
    if df_equip is None or df_equip.empty:
        return pd.DataFrame(columns=["PREFIXO", "EQUIPAMENTO_BASE"])

    out = df_equip.copy()
    out = out.rename(columns={out.columns[0]: "PREFIXO", out.columns[1]: "EQUIPAMENTO_BASE"})
    out["PREFIXO"] = out["PREFIXO"].astype(str).str.strip()
    out["EQUIPAMENTO_BASE"] = out["EQUIPAMENTO_BASE"].astype(str).str.strip()
    out = out.dropna(subset=["PREFIXO"]).drop_duplicates("PREFIXO")
    return out


def preparar_dados(
    df_raw: pd.DataFrame,
    df_equipamentos: pd.DataFrame | None = None,
    fornecedores: Iterable[str] | None = None,
) -> pd.DataFrame:
    """Pipeline principal de preparação e enriquecimento."""
    df = rename_to_canonical(df_raw)
    df = df.dropna(how="all").copy()

    # Remove linhas onde todas as colunas principais estão vazias.
    key_cols = ["FORNECEDOR", "EQUIPAMENTO", "Nº ORÇAMENTO FINAL", "Nº REQUISIÇÃO", "VALOR TOTAL"]
    df = df.loc[~df[key_cols].isna().all(axis=1)].copy()

    # Texto limpo.
    text_cols = [
        "PREFIXO",
        "EQUIPAMENTO",
        "FORNECEDOR",
        "SOLICITANTE",
        "Nº ORÇAMENTO FINAL",
        "Nº ORDEM SERVIÇO",
        "Nº REQUISIÇÃO",
        "Nº PEDIDO DE COMPRA",
        "Nº NFS/DANFE",
        "STATUS",
        "OBS ADICIONAIS",
    ]
    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].map(to_display_text)

    # Valores.
    for col in VALUE_COLUMNS:
        df[col] = parse_money_series(df[col]).fillna(0.0)

    df["VALOR TOTAL"] = np.where(
        df["VALOR TOTAL"].fillna(0).eq(0) & (df["VALOR SERVIÇO"].fillna(0).gt(0) | df["VALOR PEÇAS"].fillna(0).gt(0)),
        df["VALOR SERVIÇO"].fillna(0) + df["VALOR PEÇAS"].fillna(0),
        df["VALOR TOTAL"].fillna(0),
    )

    # Datas calculadas para filtros, ordenação e tempo de processo.
    df["DATA_RECEBIMENTO_DT"] = parse_date_series(df["DATA DE RECEBIMENTO"], "first")
    df["DATA_LANCAMENTO_DT"] = parse_date_series(df["DATA LANÇAMENTO"], "first")
    df["DATA_PEDIDO_DT"] = parse_date_series(df["DATA DO PEDIDO"], "first")
    df["DATA_NF_DT"] = parse_date_series(df["DATA LANÇAMENTO NFS"], "last")

    df["DATA_RECEBIMENTO_STR"] = df["DATA_RECEBIMENTO_DT"].map(format_date_br)
    df["DATA_LANCAMENTO_STR"] = df["DATA_LANCAMENTO_DT"].map(format_date_br)
    df["DATA_PEDIDO_STR"] = df["DATA_PEDIDO_DT"].map(format_date_br)
    df["DATA_NF_STR"] = df["DATA_NF_DT"].map(format_date_br)
    df["MES_RECEBIMENTO"] = df["DATA_RECEBIMENTO_DT"].dt.strftime("%m/%Y").fillna("")

    # Normaliza status e etapa.
    df["STATUS"] = df["STATUS"].map(normalize_status)
    df["ETAPA"] = criar_etapa(df)
    df["DIAS PARADO"] = calcular_dias_parado(df).fillna(0).round().astype(int)

    # Cockpit regional v33: SLA, dono da ação e faixas de atraso.
    def _sla_status(row):
        etapa = str(row.get("ETAPA", "")).upper()
        dias = int(row.get("DIAS PARADO", 0) or 0)
        if etapa == "CONCLUÍDO":
            return "CONCLUÍDO"
        if dias > 30:
            return "CRÍTICO"
        if etapa == "SEM LANÇAMENTO":
            return "CRÍTICO" if dias >= 5 else ("ATENÇÃO" if dias >= 3 else "OK")
        if etapa == "SEM PEDIDO":
            return "CRÍTICO" if dias >= 8 else ("ATENÇÃO" if dias >= 5 else "OK")
        if etapa == "SEM NF":
            return "CRÍTICO" if dias >= 11 else ("ATENÇÃO" if dias >= 8 else "OK")
        return "OK"

    def _dono_acao(etapa):
        etapa = str(etapa or "").upper()
        if etapa == "SEM LANÇAMENTO":
            return "PCM"
        if etapa == "SEM PEDIDO":
            return "Compras"
        if etapa == "SEM NF":
            return "Fornecedor"
        return "Sem ação"

    def _faixa_atraso(dias):
        try:
            dias = int(dias or 0)
        except Exception:
            dias = 0
        if dias > 30:
            return "30+ dias"
        if dias > 15:
            return "15+ dias"
        if dias > 7:
            return "8–15 dias"
        return "0–7 dias"

    df["DIAS SEM MOVIMENTO"] = df["DIAS PARADO"]
    df["SLA STATUS"] = df.apply(_sla_status, axis=1)
    df["SLA VENCIDO"] = df["SLA STATUS"].isin(["ATENÇÃO", "CRÍTICO"])
    df["DONO DA AÇÃO"] = df["ETAPA"].map(_dono_acao)
    df["FAIXA ATRASO"] = df["DIAS PARADO"].map(_faixa_atraso)

    # Enriquecimento de equipamento por prefixo quando a base auxiliar trouxer descrição.
    base_equip = preparar_base_equipamento(df_equipamentos)
    if not base_equip.empty:
        df["PREFIXO"] = df["PREFIXO"].astype(str).str.strip()
        df = df.merge(base_equip, on="PREFIXO", how="left")
        df["EQUIPAMENTO"] = np.where(
            df["EQUIPAMENTO"].map(is_blank_value) & df["EQUIPAMENTO_BASE"].notna(),
            df["EQUIPAMENTO_BASE"],
            df["EQUIPAMENTO"],
        )
        df = df.drop(columns=["EQUIPAMENTO_BASE"], errors="ignore")

    # Identificador estável para seleção.
    df = df.reset_index(drop=True)
    df["_ROW_ID"] = np.arange(1, len(df) + 1)

    # Tempo de processo.
    df["DIAS_RECEBIMENTO_PEDIDO"] = (
        df["DATA_PEDIDO_DT"] - df["DATA_RECEBIMENTO_DT"]
    ).dt.days.astype("float")
    df["DIAS_PEDIDO_NF"] = (df["DATA_NF_DT"] - df["DATA_PEDIDO_DT"]).dt.days.astype("float")

    # Não há coluna de data de conclusão na estrutura informada. Se existir no futuro,
    # será usada; caso contrário, a conclusão operacional fica igual à data da NF.
    possiveis_data_conclusao = [c for c in df.columns if normalize_text(c) in {"DATA CONCLUSAO", "DT CONCLUSAO"}]
    if possiveis_data_conclusao:
        data_conclusao = parse_date_series(df[possiveis_data_conclusao[0]], "last")
    else:
        data_conclusao = df["DATA_NF_DT"].where(df["ETAPA"].eq("CONCLUÍDO"), pd.NaT)

    df["DATA_CONCLUSAO_DT"] = data_conclusao
    df["DIAS_NF_CONCLUSAO"] = (df["DATA_CONCLUSAO_DT"] - df["DATA_NF_DT"]).dt.days.astype("float")
    df["DIAS_TOTAL_PROCESSO"] = (
        df["DATA_CONCLUSAO_DT"].fillna(df["DATA_NF_DT"]) - df["DATA_RECEBIMENTO_DT"]
    ).dt.days.astype("float")

    # Corrige durações negativas ou absurdas geradas por dados digitados incorretamente.
    for col in ["DIAS_RECEBIMENTO_PEDIDO", "DIAS_PEDIDO_NF", "DIAS_NF_CONCLUSAO", "DIAS_TOTAL_PROCESSO"]:
        df.loc[df[col] < 0, col] = np.nan
        df.loc[df[col] > 3650, col] = np.nan

    # Período para evolução mensal.
    df["ANO_MES"] = df["DATA_RECEBIMENTO_DT"].dt.to_period("M").astype(str)
    df.loc[df["ANO_MES"].eq("NaT"), "ANO_MES"] = ""

    return df
