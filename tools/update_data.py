#!/usr/bin/env python3
"""Atualiza public/data/os-orc.json a partir da planilha operacional.

Uso:
    python tools/update_data.py data-local/CONTROLE_DE_REQUISICOES_2026.xlsx

Somente bibliotecas da própria instalação do Python são usadas.
A planilha original nunca é copiada para public/ nem para dist/.
"""

from __future__ import annotations

from pathlib import Path
import datetime as dt
import html
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT_ROOT / "public" / "data" / "os-orc.json"
SHEET_NAME = "Acompanhamento RC 2026"

EXPECTED_HEADERS = [
    "DATA DE RECEBIMENTO", "DATA LANÇAMENTO", "PREFIXO ", "Equipamento",
    "FORNECEDOR", "Nº ORÇ. FINAL", "VALOR SERVIÇO", "VALOR PEÇAS",
    "VALOR TOTAL", "SOLICITANTE", "Nº ORDEM SERVIÇO", "Nº REQUISIÇÃO",
    "Nº PEDIDO DE COMPRA", "DATA DO PEDIDO", "Nº NFS/DANFE",
    "DATA LANÇAMENTO(NFS)", "STATUS", "OBS ADICIONAIS"
]

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
CELL_TOKEN_RE = re.compile(r"<c\b([^>]*)/>|<c\b([^>]*)>(.*?)</c>", re.S)


def col_num(ref: str) -> int:
    match = re.match(r"([A-Z]+)", ref)
    if not match:
        return 0
    value = 0
    for char in match.group(1):
        value = value * 26 + ord(char) - 64
    return value


def text_value(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def number_value(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        value = value.strip()
        if not value:
            return 0.0
        try:
            return float(value.replace(".", "").replace(",", "."))
        except ValueError:
            return 0.0
    return 0.0


def excel_date(value):
    if isinstance(value, (int, float)) and value:
        return (dt.datetime(1899, 12, 30) + dt.timedelta(days=float(value))).date().isoformat()
    if isinstance(value, str) and value.strip():
        raw = value.strip()
        try:
            return dt.datetime.strptime(raw, "%d/%m/%Y").date().isoformat()
        except ValueError:
            return raw
    return None


def read_shared_strings(archive: zipfile.ZipFile):
    try:
        xml = archive.read("xl/sharedStrings.xml").decode("utf-8")
    except KeyError:
        return []
    strings = []
    for item in re.findall(r"<si>(.*?)</si>", xml, flags=re.S):
        parts = re.findall(r"<t(?: [^>]*)?>(.*?)</t>", item, flags=re.S)
        strings.append(html.unescape("".join(parts)))
    return strings


def locate_sheet(archive: zipfile.ZipFile, sheet_name: str) -> str:
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))

    relation_map = {
        rel.attrib["Id"]: rel.attrib["Target"]
        for rel in rels.findall(f"{{{PKG_REL_NS}}}Relationship")
    }

    for sheet in workbook.findall(f".//{{{MAIN_NS}}}sheet"):
        if sheet.attrib.get("name") != sheet_name:
            continue
        rid = sheet.attrib.get(f"{{{REL_NS}}}id")
        if not rid or rid not in relation_map:
            break
        target = relation_map[rid].lstrip("/")
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        return target

    raise RuntimeError(f"Aba '{sheet_name}' não encontrada.")


def parse_cell(attrs: str, body: str, shared):
    ref_match = re.search(r'\br="([A-Z]+\d+)"', attrs)
    ref = ref_match.group(1) if ref_match else ""
    type_match = re.search(r'\bt="([^"]+)"', attrs)
    cell_type = type_match.group(1) if type_match else None
    value_match = re.search(r"<v>(.*?)</v>", body, re.S)

    if cell_type == "inlineStr":
        parts = re.findall(r"<t(?: [^>]*)?>(.*?)</t>", body, re.S)
        value = html.unescape("".join(parts))
    elif value_match:
        raw = html.unescape(value_match.group(1))
        if cell_type == "s":
            value = shared[int(raw)]
        elif cell_type in ("str", "e"):
            value = raw
        elif cell_type == "b":
            value = raw == "1"
        else:
            try:
                numeric = float(raw)
                value = int(numeric) if numeric.is_integer() else numeric
            except ValueError:
                value = raw
    else:
        value = ""

    return ref, value


def computed_status(row):
    status = text_value(row[16]).upper()
    if status:
        return status
    if not text_value(row[0]):
        return ""
    if not text_value(row[1]):
        return "FALTA LANÇAMENTO"
    if not text_value(row[12]):
        return "FALTA O PEDIDO"
    if not text_value(row[14]):
        return "FALTA NF"
    return "CONCLUÍDO"


def convert(source: Path):
    with zipfile.ZipFile(source) as archive:
        shared = read_shared_strings(archive)
        sheet_path = locate_sheet(archive, SHEET_NAME)
        sheet_xml = archive.read(sheet_path).decode("utf-8")

    parsed_rows = {}
    for row_match in re.finditer(r'<row\b[^>]*r="(\d+)"[^>]*>(.*?)</row>', sheet_xml, re.S):
        row_number = int(row_match.group(1))
        values = [""] * 18

        for cell_match in CELL_TOKEN_RE.finditer(row_match.group(2)):
            if cell_match.group(1) is not None:
                attrs, body = cell_match.group(1), ""
            else:
                attrs, body = cell_match.group(2), cell_match.group(3) or ""

            ref, value = parse_cell(attrs, body, shared)
            index = col_num(ref) - 1
            if 0 <= index < 18:
                values[index] = value

        parsed_rows[row_number] = values

    header_row = None
    for row_number, values in parsed_rows.items():
        if values == EXPECTED_HEADERS:
            header_row = row_number
            break

    if header_row is None:
        raise RuntimeError("Cabeçalho esperado não encontrado. Revise a estrutura da planilha.")

    records = []
    for source_row in sorted(row for row in parsed_rows if row > header_row):
        row = parsed_rows[source_row]
        if not any(value not in ("", None) for value in row):
            continue

        total = number_value(row[8])
        if total == 0:
            total = number_value(row[6]) + number_value(row[7])

        records.append({
            "id": f"osorc-{source_row:04d}",
            "sourceRow": source_row,
            "dataRecebimento": excel_date(row[0]),
            "dataLancamento": excel_date(row[1]),
            "prefixo": text_value(row[2]),
            "equipamento": text_value(row[3]),
            "fornecedor": text_value(row[4]),
            "numeroOrcamento": text_value(row[5]),
            "valorServico": round(number_value(row[6]), 2),
            "valorPecas": round(number_value(row[7]), 2),
            "valorTotal": round(total, 2),
            "solicitante": text_value(row[9]),
            "numeroOrdemServico": text_value(row[10]),
            "numeroRequisicao": text_value(row[11]),
            "numeroPedidoCompra": text_value(row[12]),
            "dataPedido": excel_date(row[13]),
            "numeroNfsDanfe": text_value(row[14]),
            "dataLancamentoNfs": excel_date(row[15]),
            "status": computed_status(row),
            "observacoes": text_value(row[17]),
        })

    status_counts = {}
    for record in records:
        status_counts[record["status"]] = status_counts.get(record["status"], 0) + 1

    pending = [record for record in records if record["status"] != "CONCLUÍDO"]
    metadata = {
        "schemaVersion": 1,
        "sourceFile": source.name,
        "sourceSheet": SHEET_NAME,
        "generatedAt": dt.datetime.now().astimezone().isoformat(timespec="seconds"),
        "recordCount": len(records),
        "pendingCount": len(pending),
        "completedCount": status_counts.get("CONCLUÍDO", 0),
        "statusCounts": status_counts,
        "totalValue": round(sum(record["valorTotal"] for record in records), 2),
        "pendingValue": round(sum(record["valorTotal"] for record in pending), 2),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps({"metadata": metadata, "records": records}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(f"[data] {len(records)} registros processados.")
    print(f"[data] {len(pending)} pendentes; {metadata['completedCount']} concluídos.")
    print(f"[data] Arquivo atualizado: {OUTPUT}")


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else PROJECT_ROOT / "data-local" / "CONTROLE_DE_REQUISICOES_2026.xlsx"
    if not source.exists():
        raise SystemExit(
            f"Planilha não encontrada: {source}\n"
            "Copie a planilha para data-local/CONTROLE_DE_REQUISICOES_2026.xlsx."
        )
    convert(source)


if __name__ == "__main__":
    main()
