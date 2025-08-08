@echo off
echo Building MAK3R-HUB for Production...

echo.
echo [1/3] Cleaning previous builds...
if exist "src-csharp\MAK3R.Core\bin\Release" rmdir /s /q "src-csharp\MAK3R.Core\bin\Release"
if exist "src-csharp\MAK3R.Core\obj\Release" rmdir /s /q "src-csharp\MAK3R.Core\obj\Release"

echo.
echo [2/3] Building C# engine for production...
cd src-csharp\MAK3R.Core
dotnet publish -c Release --self-contained -r win-x64 -o publish-win-x64 -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -p:DebugType=None -p:DebugSymbols=false
cd ..\..

echo.
echo [3/3] Package ready for NPM publication
echo.
echo Production build completed!
echo Executable: src-csharp\MAK3R.Core\publish-win-x64\MAK3R.Core.exe
echo.

pause