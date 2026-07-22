from __future__ import annotations

from pathlib import Path
import http.server
import json
import os
import shutil
import socket
import socketserver
import subprocess
import sys
import tempfile
import threading

import pandas as pd
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
WORKBOOK = ROOT / "data/CONTROLE_DE_REQUISICOES_2026.xlsx"
DATA_DIR = ROOT / "static/data"
LOCAL_STATE = Path(tempfile.mkdtemp(prefix="pcm-v994a2-browser-state-"))
ENVIRONMENT = os.environ.copy()
ENVIRONMENT["PCM_LOCAL_STATE_DIR"] = str(LOCAL_STATE)

PREVIEW_EXEC = Path("/mnt/data/PREVIEW_V994A2_FLUXO_4_ETAPAS.png")
PREVIEW_BASE = Path("/mnt/data/PREVIEW_V994A2_TABELA_CORRIGIDA.png")
REPORT = ROOT / "reports/browser-layout-v994a2.json"


def create_workbook() -> None:
    stages = [
        ("FALTA LANÇAMENTO", "CAMPO ERE", 55),
        ("FALTA O PEDIDO", "ASTER MAQUINAS", 19),
        ("FALTA NF", "RZK AGRO", 32),
        ("CONCLUÍDO", "PARECIS MAQUINAS", 60),
    ]

    rows = []
    counter = 1
    for status, supplier, count in stages:
        for index in range(count):
            received_day = 1 + (index % 20)
            launched = (
                ""
                if status == "FALTA LANÇAMENTO"
                else f"{min(received_day + 1, 28):02d}/06/2026"
            )
            order = (
                ""
                if status in {"FALTA LANÇAMENTO", "FALTA O PEDIDO"}
                else f"{min(received_day + 2, 28):02d}/06/2026"
            )
            nf = (
                ""
                if status != "CONCLUÍDO"
                else f"{min(received_day + 3, 28):02d}/06/2026"
            )
            service = 2500 + index * 35
            parts = 1800 + index * 27
            rows.append(
                {
                    "DATA DE RECEBIMENTO": f"{received_day:02d}/06/2026",
                    "DATA LANÇAMENTO": launched,
                    "PREFIXO": f"PX-{counter:05d}",
                    "EQUIPAMENTO": f"Equipamento operacional {index % 8 + 1}",
                    "FORNECEDOR": supplier,
                    "Nº ORÇAMENTO FINAL": str(40000 + counter),
                    "VALOR SERVIÇO": service,
                    "VALOR PEÇAS": parts,
                    "VALOR TOTAL": service + parts,
                    "SOLICITANTE": [
                        "JOSE EDUARDO",
                        "EDUARDO PALMA",
                        "KAMYLLA SANTOS",
                    ][index % 3],
                    "Nº ORDEM SERVIÇO": f"OS-{80000 + counter}",
                    "Nº REQUISIÇÃO": str(830000 + counter),
                    "Nº PEDIDO DE COMPRA": (
                        "" if not order else str(41000000 + counter)
                    ),
                    "DATA DO PEDIDO": order,
                    "Nº NFS/DANFE": (
                        "" if not nf else f"NF-{300000 + counter}"
                    ),
                    "DATA LANÇAMENTO NFS": nf,
                    "STATUS": status,
                    "OBS ADICIONAIS": "não publicar",
                }
            )
            counter += 1

    frame = pd.DataFrame(rows)
    WORKBOOK.parent.mkdir(parents=True, exist_ok=True)
    with pd.ExcelWriter(WORKBOOK, engine="openpyxl") as writer:
        frame.to_excel(
            writer,
            sheet_name="ACOMPANHAMENTO RC 2026",
            index=False,
        )


def generate_data() -> None:
    result = subprocess.run(
        [sys.executable, "tools/gerar_json_planilha.py"],
        cwd=ROOT,
        env=ENVIRONMENT,
        capture_output=True,
        text=True,
        timeout=180,
    )
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
        raise RuntimeError("Falha ao gerar fixture temporária.")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def clean() -> None:
    WORKBOOK.unlink(missing_ok=True)
    for name in [
        "executive-data.json",
        "operational-data.json",
        "publication-status.json",
        "version.json",
    ]:
        (DATA_DIR / name).unlink(missing_ok=True)
    shutil.rmtree(LOCAL_STATE, ignore_errors=True)


def main() -> int:
    results = []
    browser_error = ""

    def check(name: str, condition: bool, detail) -> None:
        results.append(
            {"name": name, "passed": bool(condition), "detail": detail}
        )

    create_workbook()
    generate_data()

    port = free_port()
    handler = lambda *args, **kwargs: QuietHandler(
        *args,
        directory=str(ROOT),
        **kwargs,
    )
    server = socketserver.TCPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(
                headless=True,
                executable_path="/usr/bin/chromium",
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-software-rasterizer",
                    "--disable-background-networking",
                ],
                timeout=120000,
            )
            context = browser.new_context(
                viewport={"width": 1600, "height": 900},
                device_scale_factor=1,
                accept_downloads=True,
            )
            page = context.new_page()
            console_errors = []
            page.on(
                "console",
                lambda message: (
                    console_errors.append(message.text)
                    if message.type == "error"
                    else None
                ),
            )

            page.goto(
                f"http://127.0.0.1:{port}/",
                wait_until="networkidle",
                timeout=90000,
            )
            page.wait_for_function(
                "() => document.body.classList.contains('app-ready')",
                timeout=90000,
            )
            page.wait_for_selector(
                "#processCards .flow-step-v994a2",
                timeout=30000,
            )

            stage_names = page.locator(
                "#processCards .flow-step-v994a2 > small"
            ).all_inner_texts()
            boxes = page.locator(
                "#processCards .flow-step-v994a2"
            ).evaluate_all(
                """elements => elements.map(element => {
                    const box = element.getBoundingClientRect();
                    return {
                      x:box.x,
                      y:box.y,
                      width:box.width,
                      height:box.height
                    };
                })"""
            )
            container_box = page.locator("#processCards").evaluate(
                """element => {
                    const box = element.getBoundingClientRect();
                    return {
                      x:box.x,
                      right:box.right,
                      width:box.width,
                      height:box.height
                    };
                }"""
            )

            visible_four = (
                len(boxes) == 4
                and all(
                    box["width"] >= 120 and box["height"] >= 200
                    for box in boxes
                )
                and all(
                    boxes[index]["x"] < boxes[index + 1]["x"]
                    for index in range(3)
                )
                and boxes[0]["x"] >= container_box["x"] - 1
                and (
                    boxes[-1]["x"] + boxes[-1]["width"]
                    <= container_box["right"] + 1
                )
            )
            check(
                "fluxo_quatro_visivel",
                visible_four,
                {"stages": stage_names, "boxes": boxes},
            )
            check(
                "ordem_visual",
                stage_names
                == [
                    "SEM LANÇAMENTO",
                    "SEM PEDIDO",
                    "SEM NF",
                    "CONCLUÍDO",
                ],
                stage_names,
            )

            page.screenshot(path=PREVIEW_EXEC, full_page=True)

            page.click('[data-tab="base"]')
            page.wait_for_selector(
                "#dataTable tbody tr[data-row-id]",
                timeout=30000,
            )

            table_boxes = page.evaluate(
                """() => {
                    const selection = document.querySelector(
                      '#dataTable tbody .selection-column-v99'
                    );
                    const pinned = [
                      ...document.querySelectorAll(
                        '#dataTable tbody tr:first-child .pin-col-v994a2'
                      )
                    ];
                    const box = element => {
                        const rect = element.getBoundingClientRect();
                        return {
                          left:rect.left,
                          right:rect.right,
                          width:rect.width
                        };
                    };
                    return {
                        selection: box(selection),
                        pinned: pinned.map(box)
                    };
                }"""
            )
            no_overlap = (
                len(table_boxes["pinned"]) == 4
                and (
                    table_boxes["selection"]["right"]
                    <= table_boxes["pinned"][0]["left"] + 1
                )
                and all(
                    table_boxes["pinned"][index]["right"]
                    <= table_boxes["pinned"][index + 1]["left"] + 1
                    for index in range(3)
                )
            )
            check(
                "tabela_sem_sobreposicao_real",
                no_overlap,
                table_boxes,
            )

            page.locator(
                "#dataTable tbody tr[data-row-id]"
            ).first.click(position={"x": 700, "y": 20})
            page.wait_for_selector(
                "#detailsDrawerV99.is-open",
                timeout=30000,
            )
            detail_text = page.locator("#detailsContentV99").inner_text()
            check(
                "gaveta_moeda_formatada",
                "R$" in detail_text,
                detail_text[:500],
            )

            page.click("#btnCloseDetailsV99")
            page.screenshot(path=PREVIEW_BASE, full_page=False)

            check(
                "console_sem_erros",
                len(console_errors) == 0,
                console_errors,
            )
            browser.close()

    except Exception as exc:
        browser_error = f"{type(exc).__name__}: {exc}"
    finally:
        server.shutdown()
        server.server_close()
        clean()

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(
        json.dumps(
            {
                "results": results,
                "browser_error": browser_error,
                "preview_exec": (
                    str(PREVIEW_EXEC) if PREVIEW_EXEC.exists() else ""
                ),
                "preview_base": (
                    str(PREVIEW_BASE) if PREVIEW_BASE.exists() else ""
                ),
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    for result in results:
        print(
            ("OK" if result["passed"] else "FALHOU"),
            result["name"],
            "—",
            result["detail"],
        )

    if browser_error:
        print("BROWSER_ERROR:", browser_error)
        return 2

    failed = [item for item in results if not item["passed"]]
    print(
        f"RESULTADO: {len(results) - len(failed)}/{len(results)} aprovados."
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
