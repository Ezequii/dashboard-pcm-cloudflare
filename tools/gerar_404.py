from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

html = """<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="refresh" content="0;url=/">
  <title>Página não encontrada — Controle de Requisições PCM</title>
  <link rel="icon" type="image/png" href="/static/favicon.png">
  <link rel="stylesheet" href="/static/styles_404_v994a.css?v=9942">
</head>
<body>
  <main>
    <strong>Página não encontrada</strong>
    <p>Redirecionando para o dashboard protegido.</p>
    <a href="/">Voltar ao dashboard</a>
  </main>
</body>
</html>
"""

(ROOT / "404.html").write_text(html, encoding="utf-8")
print("404.html gerado com segurança.")
