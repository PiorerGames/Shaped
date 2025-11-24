@echo off
echo Building Android App...
echo.
echo Using JDK: %JAVA_HOME%
echo Using Android SDK: %ANDROID_HOME%
echo.
cd /d "%~dp0"
call npx expo run:android
pause
