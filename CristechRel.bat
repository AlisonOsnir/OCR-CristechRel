@ECHO OFF

cd ./

@ECHO.
ECHO *        Iniciar OCR-CristechRel?          *
@ECHO.
@ECHO.

PAUSE
CLS

START /B /WAIT node main.js
@ECHO.
ECHO Continue para abrir o arquivo no excel:
PAUSE

START ./outputs/output.xls
