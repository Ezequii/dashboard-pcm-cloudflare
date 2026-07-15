@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Atualizar Dashboard PCM V99.4A.6

echo ======================================================
echo   Atualizar Dashboard PCM - V99.4A.6 Topo Clean e Rankings Gerais
echo ======================================================
echo.
echo Verificando planilha oficial...

if not exist "data\CONTROLE_DE_REQUISICOES_2026.xlsx" (
    echo.
    echo ERRO: planilha nao encontrada:
    echo data\CONTROLE_DE_REQUISICOES_2026.xlsx
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
    echo ERRO: falha ao preparar o Python.
    pause
    exit /b 1
)

echo.
echo Gerando 404.html seguro...
%PY_CMD% tools\gerar_404.py
if %errorlevel% neq 0 (
    echo ERRO: falha ao gerar 404.html.
    pause
    exit /b 1
)

echo.
echo Backups e temporarios ficarao fora do OneDrive.
echo Local padrao: %LOCALAPPDATA%\AMAGGI\DashboardPCM
echo.
echo Gerando payload executivo e operacional...
%PY_CMD% tools\gerar_json_planilha.py
if %errorlevel% neq 0 (
    echo.
    echo ERRO: a publicacao atomica foi cancelada.
    echo A ultima versao valida foi preservada.
    pause
    exit /b 1
)

echo.
echo Validando V99.4A.6...
%PY_CMD% tools\validar_v994a6.py
if %errorlevel% neq 0 (
    echo.
    echo ERRO: a validacao da V99.4A.6 encontrou um problema.
    echo Nao publique os arquivos.
    pause
    exit /b 1
)

echo.
echo ======================================================
echo   VALIDACAO V99.4A.6: OK
echo   BACKUP VALIDO: snapshot imutavel fora do OneDrive
echo   PAYLOAD SENSIVEL: campos proibidos removidos
echo ======================================================
echo.
echo Agora faca Commit e Push no GitHub Desktop.
echo.
pause
