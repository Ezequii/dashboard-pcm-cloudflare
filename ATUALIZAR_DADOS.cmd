@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Atualizar Dashboard PCM

echo ======================================================
echo   Atualizar Dashboard PCM - Cloudflare Pages
echo ======================================================
echo.
echo Pasta atual:
echo %cd%
echo.
echo Verificando planilha...

if not exist "data\CONTROLE_DE_REQUISICOES_2026.xlsx" (
    echo.
    echo ERRO: Nao encontrei a planilha neste caminho:
    echo data\CONTROLE_DE_REQUISICOES_2026.xlsx
    echo.
    echo Coloque a planilha dentro da pasta data com este nome exato:
    echo CONTROLE_DE_REQUISICOES_2026.xlsx
    echo.
    pause
    exit /b 1
)

where py >nul 2>nul
if %errorlevel%==0 (
    set "PY_CMD=py -3"
) else (
    set "PY_CMD=python"
)

echo Instalando/verificando bibliotecas...
%PY_CMD% -m pip install -r requirements_update.txt
if %errorlevel% neq 0 (
    echo.
    echo ERRO: Nao consegui instalar as bibliotecas.
    echo Se aparecer que Python nao foi encontrado, instale Python 3 no Windows.
    echo.
    pause
    exit /b 1
)

echo.
echo Gerando arquivo static\data\dashboard-data.json...
%PY_CMD% tools\gerar_json_planilha.py
if %errorlevel% neq 0 (
    echo.
    echo ERRO: Nao consegui gerar o dashboard-data.json.
    echo Confira se a planilha esta fechada no Excel e com o nome correto.
    echo.
    pause
    exit /b 1
)

echo.
echo Validando estrutura, dados e interface da V98...
%PY_CMD% tools\validar_v98.py
if %errorlevel% neq 0 (
    echo.
    echo ERRO: A validacao da V98 encontrou um problema.
    echo Corrija o erro mostrado acima antes de publicar.
    echo.
    pause
    exit /b 1
)

echo.
echo ======================================================
echo   Pronto!
echo   Agora abra o GitHub Desktop, faca Commit e Push.
echo ======================================================
echo.
pause
