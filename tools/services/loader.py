"""
Carregamento otimizado da planilha Excel.

O loader detecta automaticamente a aba principal, lê as abas auxiliares
e usa cache por caminho + data de modificação.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any
import os

import pandas as pd

from services.tratamento_dados import normalize_text, preparar_dados


@dataclass(frozen=True)
class WorkbookMetadata:
    arquivo: str
    aba_principal: str
    abas: tuple[str, ...]
    linhas: int
    colunas: int
    data_modificacao: float


@dataclass
class WorkbookData:
    df: pd.DataFrame
    metadata: WorkbookMetadata
    fornecedores: list[str]
    equipamentos: pd.DataFrame


def find_workbook(base_dir: Path, preferred: str | None = None) -> Path:
    """
    Localiza a planilha padrão.
    Prioridade:
    1. Caminho informado pelo usuário.
    2. data/CONTROLE_DE_REQUISICOES_2026.xlsx
    3. Qualquer xlsx no projeto com CONTROLE + REQUISI.
    """
    candidates: list[Path] = []

    if preferred:
        candidates.append(Path(preferred))

    candidates.extend([
        base_dir / "data" / "CONTROLE_DE_REQUISICOES_2026.xlsx",
        base_dir / "CONTROLE_DE_REQUISICOES_2026.xlsx",
        base_dir / "CONTROLE DE REQUISIÇÕES 2026.xlsx",
        base_dir / "CONTROLE DE REQUISICOES 2026.xlsx",
    ])

    for xlsx in list(base_dir.glob("*.xlsx")) + list((base_dir / "data").glob("*.xlsx")):
        norm = normalize_text(xlsx.name)
        if "CONTROLE" in norm and "REQUISI" in norm:
            candidates.append(xlsx)

    for candidate in candidates:
        if candidate.exists() and candidate.suffix.lower() in {".xlsx", ".xlsm", ".xls"}:
            return candidate

    raise FileNotFoundError(
        "Planilha não encontrada. Coloque o arquivo CONTROLE_DE_REQUISICOES_2026.xlsx "
        "na pasta data/ ou informe o caminho ao iniciar o app."
    )


def _detect_header_row(excel_file: pd.ExcelFile, sheet_name: str) -> int:
    preview = pd.read_excel(excel_file, sheet_name=sheet_name, header=None, nrows=20, dtype=object)
    best_row = 0
    best_score = -1

    required_terms = [
        "DATA DE RECEBIMENTO",
        "FORNECEDOR",
        "VALOR TOTAL",
        "STATUS",
        "PEDIDO",
        "REQUISICAO",
    ]

    for idx, row in preview.iterrows():
        row_text = " | ".join(normalize_text(x) for x in row.tolist())
        score = sum(1 for term in required_terms if normalize_text(term) in row_text)
        if score > best_score:
            best_row = int(idx)
            best_score = score

    return best_row


def _choose_main_sheet(excel_file: pd.ExcelFile) -> str:
    preferred = [
        "ACOMPANHAMENTO RC 2026",
        "ACOMPANHAMENTO",
        "RC 2026",
    ]

    for sheet in excel_file.sheet_names:
        norm = normalize_text(sheet)
        if any(p in norm for p in preferred):
            return sheet

    # Fallback: aba com maior pontuação de cabeçalho.
    best_sheet = excel_file.sheet_names[0]
    best_score = -1
    for sheet in excel_file.sheet_names:
        preview = pd.read_excel(excel_file, sheet_name=sheet, header=None, nrows=10, dtype=object)
        text = " ".join(normalize_text(x) for x in preview.fillna("").astype(str).to_numpy().ravel())
        score = sum(term in text for term in ["FORNECEDOR", "VALOR", "STATUS", "PEDIDO", "REQUISICAO"])
        if score > best_score:
            best_score = int(score)
            best_sheet = sheet
    return best_sheet


def _read_auxiliary_sheets(excel_file: pd.ExcelFile) -> tuple[list[str], pd.DataFrame]:
    fornecedores: list[str] = []
    equipamentos = pd.DataFrame()

    for sheet in excel_file.sheet_names:
        norm = normalize_text(sheet)

        if "FORNE" in norm:
            aux = pd.read_excel(excel_file, sheet_name=sheet, header=None, dtype=object)
            values = [str(v).strip() for v in aux.iloc[:, 0].dropna().tolist()]
            fornecedores = sorted({v for v in values if v and normalize_text(v) not in {"FORNECEDORES TERCEIROS", "FORNECEDOR"}})

        if "EQUIP" in norm:
            equipamentos = pd.read_excel(excel_file, sheet_name=sheet, header=0, dtype=object)
            equipamentos = equipamentos.dropna(how="all")

    return fornecedores, equipamentos


@lru_cache(maxsize=8)
def _load_cached(path_str: str, mtime: float) -> WorkbookData:
    path = Path(path_str)
    excel_file = pd.ExcelFile(path, engine="openpyxl")
    main_sheet = _choose_main_sheet(excel_file)
    header_row = _detect_header_row(excel_file, main_sheet)

    raw = pd.read_excel(
        excel_file,
        sheet_name=main_sheet,
        header=header_row,
        dtype=object,
    )
    raw = raw.dropna(how="all")
    raw = raw.loc[:, ~raw.columns.astype(str).str.contains("^Unnamed", case=False, na=False)]

    fornecedores, equipamentos = _read_auxiliary_sheets(excel_file)
    df = preparar_dados(raw, df_equipamentos=equipamentos, fornecedores=fornecedores)

    metadata = WorkbookMetadata(
        arquivo=str(path),
        aba_principal=main_sheet,
        abas=tuple(excel_file.sheet_names),
        linhas=int(len(df)),
        colunas=int(len(df.columns)),
        data_modificacao=mtime,
    )

    return WorkbookData(df=df, metadata=metadata, fornecedores=fornecedores, equipamentos=equipamentos)


def load_workbook_data(path: Path) -> WorkbookData:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {path}")
    mtime = os.path.getmtime(path)
    return _load_cached(str(path.resolve()), mtime)


def clear_cache() -> None:
    _load_cached.cache_clear()
