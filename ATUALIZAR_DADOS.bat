@echo off
chcp 65001 >nul
title Atualizar dados do Dashboard PCM - Cloudflare Pages

echo ======================================================
echo  Atualizador do Dashboard PCM - Cloudflare Pages
echo ======================================================
echo.
echo Coloque sua planilha em:
echo   data\CONTROLE_DE_REQUISICOES_2026.xlsx
echo.
echo Este processo vai gerar:
echo   static\data\dashboard-data.json
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  set PY_CMD=py -3
) else (
  set PY_CMD=python
)

echo Instalando/verificando bibliotecas...
%PY_CMD% -m pip install -r requirements_update.txt
if %errorlevel% neq 0 (
  echo.
  echo ERRO: Não consegui instalar as bibliotecas.
  echo Se aparecer que Python não foi encontrado, instale Python 3 no Windows.
  pause
  exit /b 1
)

echo.
echo Gerando JSON atualizado...
%PY_CMD% tools\gerar_json_planilha.py
if %errorlevel% neq 0 (
  echo.
  echo ERRO: Não consegui gerar o JSON.
  pause
  exit /b 1
)

echo.
echo ======================================================
echo  Pronto! Agora abra o GitHub Desktop, faça Commit e Push.
echo ======================================================
pause
