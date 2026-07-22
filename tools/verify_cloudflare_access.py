#!/usr/bin/env python3
"""Falha se rotas protegidas responderem 200 sem credenciais do Access."""

from __future__ import annotations

import argparse
import ssl
import sys
import urllib.error
import urllib.parse
import urllib.request

PROTECTED_PATHS = (
    "/",
    "/index.html",
    "/static/data/executive-data.json",
    "/static/data/operational-data.json",
    "/static/config/security-config.json",
)


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def anonymous_status(url: str, timeout: float) -> int:
    opener = urllib.request.build_opener(
        NoRedirectHandler(),
        urllib.request.HTTPSHandler(context=ssl.create_default_context()),
    )
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "text/html,application/json",
            "User-Agent": "pcm-access-perimeter-check/1.0",
        },
    )
    try:
        with opener.open(request, timeout=timeout) as response:
            return int(response.status)
    except urllib.error.HTTPError as error:
        return int(error.code)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("base_url", help="Ex.: https://dashboard.exemplo.com")
    parser.add_argument("--timeout", type=float, default=15.0)
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    parsed = urllib.parse.urlparse(base)
    if parsed.scheme != "https" or not parsed.netloc:
        parser.error("base_url deve ser uma URL HTTPS absoluta.")

    failures: list[str] = []
    for path in PROTECTED_PATHS:
        status = anonymous_status(f"{base}{path}", args.timeout)
        print(f"{status} {path}")
        if 200 <= status < 300:
            failures.append(path)

    if failures:
        print(
            "FALHA: rotas acessíveis anonimamente: " + ", ".join(failures),
            file=sys.stderr,
        )
        return 1

    print("OK: nenhuma rota protegida respondeu 2xx anonimamente.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
