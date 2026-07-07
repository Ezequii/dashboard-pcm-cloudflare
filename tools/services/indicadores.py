"""
Indicadores, filtros e agregações do dashboard.
"""

from __future__ import annotations

from typing import Iterable
import math

import numpy as np
import pandas as pd

from services.constants import (
    STAGE_ORDER,
    VALUE_COLUMNS,
    FILTER_DEFINITIONS,
)


def currency_br(value: float | int | None) -> str:
    if value is None or pd.isna(value):
        value = 0
    text = f"R$ {float(value):,.2f}"
    return text.replace(",", "X").replace(".", ",").replace("X", ".")


def int_br(value: float | int | None) -> str:
    if value is None or pd.isna(value):
        return "0"
    return f"{int(round(float(value))):,}".replace(",", ".")


def percent_br(value: float | int | None) -> str:
    if value is None or pd.isna(value):
        value = 0
    return f"{float(value):.1f}%".replace(".", ",")




DONE_MARKERS = {"*", "＊", "-", "--", "---", "–", "—", "−"}
BLANK_MARKERS = {"", "NAN", "NAT", "NONE", "NULL", "NA", "N/A", "N A", "SEM INFORMACAO", "SEM INFORMAÇÃO"}


def _normalize_marker(value: object) -> str:
    text = str(value or "").strip().upper()
    # Regra v69: símbolos crus de feito não podem virar vazio após normalização.
    if text in DONE_MARKERS:
        return "__FEITO__"
    if text in BLANK_MARKERS:
        return text
    import unicodedata, re
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _is_blank_text_series(series: pd.Series) -> pd.Series:
    """Retorna True apenas para vazios reais. Traço e asterisco contam como feito."""
    return series.fillna("").map(_normalize_marker).isin(BLANK_MARKERS)


def etapa_mask(df: pd.DataFrame, etapa: str) -> pd.Series:
    """
    Máscara exclusiva dos cards executivos.

    Regra v69: células "-" e "*" contam como feito/preenchido.
    A classificação usa o avanço mais alto do processo:
    - CONCLUÍDO: tem NF ou marcador de feito na NF.
    - SEM NF: tem pedido ou marcador de feito no pedido, mas não tem NF.
    - SEM PEDIDO: tem lançamento ou marcador de feito no lançamento, mas não tem pedido.
    - SEM LANÇAMENTO: não tem lançamento, pedido nem NF.
    """
    etapa_norm = str(etapa or "").strip().upper()
    idx = df.index
    if df.empty:
        return pd.Series(False, index=idx)

    if "DATA_LANCAMENTO_DT" in df.columns:
        tem_lancamento = df["DATA_LANCAMENTO_DT"].notna()
        if "DATA LANÇAMENTO" in df.columns:
            tem_lancamento = tem_lancamento | ~_is_blank_text_series(df["DATA LANÇAMENTO"])
    elif "DATA LANÇAMENTO" in df.columns:
        tem_lancamento = ~_is_blank_text_series(df["DATA LANÇAMENTO"])
    else:
        tem_lancamento = pd.Series(False, index=idx)

    if "Nº PEDIDO DE COMPRA" in df.columns:
        tem_pedido = ~_is_blank_text_series(df["Nº PEDIDO DE COMPRA"])
    else:
        tem_pedido = pd.Series(False, index=idx)

    if "Nº NFS/DANFE" in df.columns:
        tem_nf = ~_is_blank_text_series(df["Nº NFS/DANFE"])
    else:
        tem_nf = pd.Series(False, index=idx)

    concluido = tem_nf
    sem_nf = tem_pedido & ~tem_nf
    sem_pedido = tem_lancamento & ~tem_pedido
    sem_lancamento = ~tem_lancamento & ~tem_pedido & ~tem_nf

    masks = {
        "SEM LANÇAMENTO": sem_lancamento,
        "SEM LANCAMENTO": sem_lancamento,
        "SEM PEDIDO": sem_pedido,
        "SEM NF": sem_nf,
        "CONCLUÍDO": concluido,
        "CONCLUIDO": concluido,
    }
    return masks.get(etapa_norm, pd.Series(False, index=idx))

def aplicar_filtro_etapa(df: pd.DataFrame, selected: set[str]) -> pd.DataFrame:
    if not selected:
        return df
    mask = pd.Series(False, index=df.index)
    for etapa in selected:
        mask = mask | etapa_mask(df, etapa)
    return df.loc[mask]

def calcular_kpis(df: pd.DataFrame) -> dict[str, float]:
    total_rcs = int(len(df))
    valor_total = float(df["VALOR TOTAL"].sum()) if not df.empty else 0.0
    valor_servicos = float(df["VALOR SERVIÇO"].sum()) if not df.empty else 0.0
    valor_pecas = float(df["VALOR PEÇAS"].sum()) if not df.empty else 0.0
    ticket_medio = valor_total / total_rcs if total_rcs else 0.0
    if not df.empty and {"DATA_RECEBIMENTO_DT", "DATA_LANCAMENTO_DT"}.issubset(df.columns):
        dias_ticket = (df["DATA_LANCAMENTO_DT"] - df["DATA_RECEBIMENTO_DT"]).dt.days.astype("float")
        dias_ticket = dias_ticket[(dias_ticket >= 0) & (dias_ticket <= 3650)]
        ticket_tempo_dias = float(dias_ticket.mean()) if not dias_ticket.dropna().empty else 0.0
    else:
        ticket_tempo_dias = 0.0
    fornecedores = int(df["FORNECEDOR"].replace("", np.nan).nunique()) if not df.empty else 0
    equipamentos = int(df["EQUIPAMENTO"].replace("", np.nan).nunique()) if not df.empty else 0
    concluidas = int(etapa_mask(df, "CONCLUÍDO").sum()) if not df.empty else 0
    pendentes = total_rcs - concluidas

    return {
        "total_rcs": total_rcs,
        "valor_total": valor_total,
        "valor_servicos": valor_servicos,
        "valor_pecas": valor_pecas,
        "ticket_medio": ticket_medio,
        "fornecedores": fornecedores,
        "ticket_tempo_dias": ticket_tempo_dias,
        "equipamentos": equipamentos,
        "concluidas": concluidas,
        "pendentes": pendentes,
        "pct_concluido": (concluidas / total_rcs * 100) if total_rcs else 0,
        "pct_pendente": (pendentes / total_rcs * 100) if total_rcs else 0,
    }

def calcular_etapas(df: pd.DataFrame) -> pd.DataFrame:
    rows = []
    total = int(len(df))
    for etapa in STAGE_ORDER:
        mask = etapa_mask(df, etapa) if not df.empty else pd.Series(False, index=df.index)
        subset = df.loc[mask] if not df.empty else df
        qtd = int(mask.sum()) if not df.empty else 0
        valor = float(subset["VALOR TOTAL"].sum()) if qtd and "VALOR TOTAL" in subset.columns else 0.0
        rows.append({
            "ETAPA": etapa,
            "QTD": qtd,
            "VALOR": valor,
            "PERCENTUAL": (qtd / total * 100) if total else 0.0,
        })
    return pd.DataFrame(rows)

def aplicar_filtros(
    df: pd.DataFrame,
    filtros: dict[str, set[str]],
    busca_global: str = "",
    ignore_filter_key: str | None = None,
) -> pd.DataFrame:
    """Aplica filtros de multiseleção e pesquisa global de forma vetorizada."""
    out = df
    for col, selected in filtros.items():
        if ignore_filter_key and col == ignore_filter_key:
            continue
        if not selected:
            continue
        if col == "ETAPA":
            out = aplicar_filtro_etapa(out, selected)
            continue
        if col not in out.columns:
            continue
        values = out[col].fillna("").astype(str)
        out = out.loc[values.isin(selected)]

    busca = (busca_global or "").strip()
    if busca:
        busca_norm = busca.upper()
        searchable_cols = [
            "ETAPA", "FORNECEDOR", "EQUIPAMENTO", "PREFIXO", "SOLICITANTE",
            "Nº ORÇAMENTO FINAL", "Nº ORDEM SERVIÇO", "Nº REQUISIÇÃO",
            "Nº PEDIDO DE COMPRA", "Nº NFS/DANFE", "STATUS", "OBS ADICIONAIS",
        ]
        mask = pd.Series(False, index=out.index)
        for col in searchable_cols:
            if col in out.columns:
                mask = mask | out[col].fillna("").astype(str).str.upper().str.contains(busca_norm, na=False, regex=False)
        out = out.loc[mask]

    return out


def filter_options(
    df: pd.DataFrame,
    filtros: dict[str, set[str]],
    filter_key: str,
    busca_global: str = "",
    limit: int | None = 2000,
) -> list[str]:
    """Retorna opções do filtro considerando os demais filtros ativos."""
    filtered = aplicar_filtros(df, filtros, busca_global="", ignore_filter_key=filter_key)
    if filter_key not in filtered.columns:
        return []
    values = filtered[filter_key].fillna("").astype(str)
    values = values[values.str.strip().ne("")]
    unique = sorted(values.unique().tolist())
    if limit is not None:
        return unique[:limit]
    return unique


def ordenar_dataframe(df: pd.DataFrame, coluna: str | None, asc: bool = True) -> pd.DataFrame:
    if not coluna or df.empty:
        return df

    # Ordenação inteligente: cabeçalhos visuais de data usam as colunas datetime
    # tratadas; valores continuam numéricos e textos seguem ordenação alfabética.
    sort_map = {
        "DATA DE RECEBIMENTO": "DATA_RECEBIMENTO_DT",
        "DATA LANÇAMENTO": "DATA_LANCAMENTO_DT",
        "DATA DO PEDIDO": "DATA_PEDIDO_DT",
        "DATA LANÇAMENTO NFS": "DATA_NF_DT",
    }
    sort_col = sort_map.get(coluna, coluna)
    if sort_col not in df.columns:
        return df
    try:
        return df.sort_values(sort_col, ascending=asc, kind="mergesort", na_position="last")
    except Exception:
        return df


def tempo_medio_processo(df: pd.DataFrame) -> pd.DataFrame:
    cols = {
        "Recebimento → Pedido": "DIAS_RECEBIMENTO_PEDIDO",
        "Pedido → NF": "DIAS_PEDIDO_NF",
        "NF → Conclusão": "DIAS_NF_CONCLUSAO",
    }
    rows = []
    for label, col in cols.items():
        if col in df.columns and not df.empty:
            value = float(df[col].dropna().mean()) if not df[col].dropna().empty else 0.0
        else:
            value = 0.0
        rows.append({"PROCESSO": label, "DIAS": value})
    return pd.DataFrame(rows)


def totalizadores_tabela(df: pd.DataFrame) -> dict[str, str]:
    return {
        "registros": int_br(len(df)),
        "valor_total": currency_br(df["VALOR TOTAL"].sum() if not df.empty else 0),
        "valor_servico": currency_br(df["VALOR SERVIÇO"].sum() if not df.empty else 0),
        "valor_pecas": currency_br(df["VALOR PEÇAS"].sum() if not df.empty else 0),
    }
