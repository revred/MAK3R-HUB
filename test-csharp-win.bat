@echo off
echo 🧪 MAK3R-HUB C# Extension Windows Test
echo =====================================
echo.

echo 🔧 Building C# solution...
cd src-csharp
dotnet build MAK3R.HUB.sln --configuration Release --verbosity minimal

if errorlevel 1 (
    echo.
    echo ❌ Build failed - C# extensions cannot be tested
    echo Check .NET SDK installation and project references
    pause
    exit /b 1
)

echo.
echo ✅ Build successful
echo.

echo 📊 Testing MAK3R.Core.exe availability...
set CORE_EXE=MAK3R.Core\bin\Release\net9.0\win-x64\MAK3R.Core.exe

if not exist "%CORE_EXE%" (
    echo ❌ MAK3R.Core.exe not found at: %CORE_EXE%
    echo Checking alternate locations...
    
    if exist "MAK3R.Core\bin\Debug\net9.0\win-x64\MAK3R.Core.exe" (
        set CORE_EXE=MAK3R.Core\bin\Debug\net9.0\win-x64\MAK3R.Core.exe
        echo ✅ Found debug build: %CORE_EXE%
    ) else (
        echo ❌ MAK3R.Core.exe not found in debug build either
        echo Run: dotnet build MAK3R.Core\MAK3R.Core.csproj
        pause
        exit /b 1
    )
)

echo.
echo 🚀 Testing C# Extension Discovery...
cd MAK3R.Core\bin\Release\net9.0\win-x64

echo.
echo 📝 Sending extension discovery request...
echo {"id":"test-discovery","type":"request","timestamp":"2025-01-09T10:00:00.000Z","payload":{"command":"discover-extensions"}} | MAK3R.Core.exe

echo.
echo 📝 Testing hello command...
echo {"id":"test-hello","type":"request","timestamp":"2025-01-09T10:00:00.000Z","payload":{"command":"execute-tool","parameters":{"extensionName":"example-extension","toolName":"m3r__example__hello","arguments":{"name":"Windows Tester"}}}} | MAK3R.Core.exe

echo.
echo ✅ C# Extension integration test completed
echo.
pause