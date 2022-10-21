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
PAUSE

START ./outputs/output.xls
