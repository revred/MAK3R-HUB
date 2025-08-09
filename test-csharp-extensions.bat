@echo off
echo 🧪 Testing C# Extension Integration
echo.

cd src-csharp

echo 🔧 Building solution...
dotnet build MAK3R.HUB.sln --configuration Release
if errorlevel 1 (
    echo ❌ Build failed
    exit /b 1
)

echo.
echo ✅ Build successful
echo.

echo 🚀 Testing MAK3R.Core.exe with Example extension...
cd MAK3R.Core/bin/Release/net9.0/win-x64

echo.
echo 📝 Sending discover-extensions request...
echo {"id":"test-1","type":"request","timestamp":"2025-01-09T10:00:00.000Z","payload":{"command":"discover-extensions"}} | MAK3R.Core.exe

echo.
echo 📝 Sending hello command request...  
echo {"id":"test-2","type":"request","timestamp":"2025-01-09T10:00:00.000Z","payload":{"command":"execute-tool","parameters":{"extensionName":"example-extension","toolName":"m3r__example__hello","arguments":{"name":"MAK3R-HUB Tester"}}}} | MAK3R.Core.exe

echo.
echo ✅ C# Extension test completed
pause