@echo off
echo DyRec Debug Test
echo =================
echo.
echo Current directory: %CD%
echo.
echo Checking files:
if exist ".next" (echo [OK] .next exists) else (echo [MISSING] .next)
if exist ".nextBUILD_ID" (echo [OK] BUILD_ID exists) else (echo [MISSING] BUILD_ID)
if exist "server.js" (echo [OK] server.js exists) else (echo [MISSING] server.js)
if exist "node_modules
ext" (echo [OK] node_modules exists) else (echo [MISSING] node_modules)
if exist "package.json" (echo [OK] package.json exists) else (echo [MISSING] package.json)
echo.
echo Node.js version:
node --version
echo.
echo Testing node server.js (will show errors if any):
node -e "try { require('next'); console.log('next module OK'); } catch(e) { console.log('next module ERROR:', e.message); }"
echo.
pause