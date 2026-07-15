@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Rollback Dashboard PCM V99.4A.6

where py >nul 2>nul
if %errorlevel%==0 (
    set "PY_CMD=py -3"
) else (
    set "PY_CMD=python"
)

echo ======================================================
echo   Rollback dos dados - Dashboard PCM V99.4A.6
echo ======================================================
echo.
echo Esta operacao restaura a ultima publicacao valida.
echo.

%PY_CMD% tools\rollback_v994a.py
if %errorlevel% neq 0 (
    echo.
    echo ROLLBACK FALHOU
    echo Nenhum arquivo deve ser publicado ate corrigir o problema.
    pause
    exit /b 1
)

echo.
echo ROLLBACK CONCLUIDO
echo Faca Commit e Push para publicar a versao restaurada.
echo.
pause
