@echo off
chcp 65001 > nul
title Heltec Triangulation Python - Localisateur HackRF

echo ======================================================================
echo    HELTEC TRIANGULATION PYTHON - DEMARRAGE SUR PC WINDOWS
echo ======================================================================
echo.

:: Verification de la presence de Python 3.11+
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERREUR] Python n'a pas ete detecte dans votre PATH Windows.
        echo Veuillez installer Python 3.11 ou superieur depuis https://www.python.org/
        echo Pensez a cocher "Add Python to PATH" lors de l'installation.
        echo.
        pause
        exit /b 1
    ) else (
        set PY_CMD=py
    )
) else (
    set PY_CMD=python
)

echo [OK] Interpreteur Python detecte.
echo [INFO] Demarrage du serveur local sur http://127.0.0.1:8080 ...
echo [INFO] Ouverture automatique de votre navigateur dans 2 secondes...
echo.
echo Pour fermer l'application, appuyez sur Ctrl+C ou fermez cette fenetre.
echo ======================================================================
echo.

:: Ouvre le navigateur par defaut apres un court delai
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8080"

:: Lance le serveur Python natif (aucune dependance externe requise)
%PY_CMD% server.py --host 127.0.0.1 --port 8080

pause
