using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Text.RegularExpressions;

namespace MAK3R.Core
{
    /// <summary>
    /// Windows platform adapter implementation
    /// Extracted and refined from SharpUtility SimpleGUI.cs patterns
    /// Optimized for website development automation
    /// </summary>
    public class WindowsPlatformAdapter : IPlatformAdapter
    {
        private static readonly object _consoleLock = new object();

        public bool IsInteractiveSession => Environment.UserInteractive;

        #region File System Operations

        public async Task<bool> FileExistsAsync(string path)
        {
            return await Task.FromResult(File.Exists(path));
        }

        public async Task<bool> DirectoryExistsAsync(string path)
        {
            return await Task.FromResult(Directory.Exists(path));
        }

        public async Task CreateDirectoryAsync(string path)
        {
            await Task.Run(() => Directory.CreateDirectory(path));
        }

        public async Task CopyFileAsync(string source, string destination)
        {
            await Task.Run(() => File.Copy(source, destination, true));
        }

        public async Task DeleteFileAsync(string path)
        {
            await Task.Run(() => File.Delete(path));
        }

        public async Task DeleteDirectoryAsync(string path, bool recursive = false)
        {
            await Task.Run(() => Directory.Delete(path, recursive));
        }

        public async Task<string> ReadFileAsync(string path)
        {
            return await File.ReadAllTextAsync(path);
        }

        public async Task WriteFileAsync(string path, string content)
        {
            await File.WriteAllTextAsync(path, content);
        }

        #endregion

        #region Process Management

        public async Task<ProcessResult> ExecuteCommandAsync(string command, string arguments = "", string workingDirectory = "")
        {
            var stopwatch = Stopwatch.StartNew();
            
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = $"/c {command} {arguments}",
                    WorkingDirectory = string.IsNullOrEmpty(workingDirectory) ? Environment.CurrentDirectory : workingDirectory,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                using var process = Process.Start(processInfo);
                if (process == null)
                    throw new InvalidOperationException("Failed to start process");
                    
                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                stopwatch.Stop();

                return new ProcessResult
                {
                    ExitCode = process.ExitCode,
                    Output = output,
                    Error = error,
                    Duration = stopwatch.Elapsed
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new ProcessResult
                {
                    ExitCode = -1,
                    Error = ex.Message,
                    Duration = stopwatch.Elapsed
                };
            }
        }

        public async Task<ProcessResult> StartWebServerAsync(string framework, string projectPath, int port = 3000)
        {
            var commands = new Dictionary<string, string>
            {
                ["nuxt"] = "npm run dev",
                ["next"] = "npm run dev",
                ["react"] = "npm start",
                ["vue"] = "npm run serve",
                ["svelte"] = "npm run dev",
                ["angular"] = "ng serve"
            };

            var command = commands.GetValueOrDefault(framework.ToLower(), "npm run dev");
            
            // Set port environment variable for frameworks that support it
            Environment.SetEnvironmentVariable("PORT", port.ToString());
            
            return await ExecuteCommandAsync(command, "", projectPath);
        }

        public async Task<bool> IsPortInUseAsync(int port)
        {
            var result = await ExecuteCommandAsync("netstat", $"-ano | findstr :{port}");
            return result.Success && !string.IsNullOrEmpty(result.Output);
        }

        public async Task KillProcessByPortAsync(int port)
        {
            var findResult = await ExecuteCommandAsync("netstat", $"-ano | findstr :{port}");
            
            if (findResult.Success && !string.IsNullOrEmpty(findResult.Output))
            {
                var lines = findResult.Output.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                foreach (var line in lines)
                {
                    var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                    if (parts.Length > 4 && int.TryParse(parts.Last(), out int pid))
                    {
                        await ExecuteCommandAsync("TASKKILL", $"/F /PID {pid}");
                    }
                }
            }
        }

        public async Task<ProcessInfo[]> GetRunningProcessesAsync()
        {
            var result = await ExecuteCommandAsync("wmic", "process get Name,ProcessId,CommandLine /format:csv");
            
            if (!result.Success) return Array.Empty<ProcessInfo>();

            var processes = new List<ProcessInfo>();
            var lines = result.Output.Split('\n', StringSplitOptions.RemoveEmptyEntries).Skip(1);

            foreach (var line in lines)
            {
                var parts = line.Split(',', StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 3 && int.TryParse(parts[2], out int pid))
                {
                    processes.Add(new ProcessInfo
                    {
                        ProcessId = pid,
                        ProcessName = parts[1],
                        CommandLine = parts.Length > 3 ? parts[3] : ""
                    });
                }
            }

            return processes.ToArray();
        }

        public async Task<ProcessInfo[]> GetWebServerProcessesAsync()
        {
            var allProcesses = await GetRunningProcessesAsync();
            var webProcesses = allProcesses.Where(p => 
                p.ProcessName.Contains("node") || 
                p.ProcessName.Contains("npm") ||
                p.CommandLine.Contains("webpack") ||
                p.CommandLine.Contains("vite") ||
                p.CommandLine.Contains("next") ||
                p.CommandLine.Contains("nuxt")).ToArray();

            // Try to detect ports for web server processes
            foreach (var process in webProcesses)
            {
                process.IsWebServer = true;
                process.Framework = DetectFrameworkFromProcess(process);
                process.Port = await DetectPortFromProcess(process.ProcessId);
            }

            return webProcesses;
        }

        #endregion

        #region Console Operations

        public async Task ClearConsoleAsync()
        {
            await Task.Run(() => SafeConsoleOperation(() => Console.Clear()));
        }

        public async Task WriteLineAsync(string message, ConsoleColor color = ConsoleColor.White)
        {
            await Task.Run(() =>
            {
                SafeConsoleOperation(() =>
                {
                    lock (_consoleLock)
                    {
                        var originalColor = Console.ForegroundColor;
                        Console.ForegroundColor = color;
                        Console.WriteLine(message);
                        Console.ForegroundColor = originalColor;
                    }
                });
            });
        }

        public async Task<string> ReadLineAsync()
        {
            return await Task.Run(() =>
            {
                try
                {
                    return Console.ReadLine() ?? string.Empty;
                }
                catch
                {
                    return string.Empty;
                }
            });
        }

        #endregion

        #region Website Development Specific

        public async Task<bool> IsNpmAvailableAsync()
        {
            var result = await ExecuteCommandAsync("npm", "--version");
            return result.Success;
        }

        public async Task<bool> IsNodeAvailableAsync()
        {
            var result = await ExecuteCommandAsync("node", "--version");
            return result.Success;
        }

        public async Task<bool> IsDotNetAvailableAsync()
        {
            var result = await ExecuteCommandAsync("dotnet", "--version");
            return result.Success;
        }

        public async Task<string> DetectPackageManagerAsync(string projectPath)
        {
            if (await FileExistsAsync(Path.Combine(projectPath, "yarn.lock")))
                return "yarn";
            if (await FileExistsAsync(Path.Combine(projectPath, "pnpm-lock.yaml")))
                return "pnpm";
            if (await FileExistsAsync(Path.Combine(projectPath, "package-lock.json")))
                return "npm";
            
            return "npm"; // Default fallback
        }

        public async Task<string> DetectWebFrameworkAsync(string projectPath)
        {
            var packageJsonPath = Path.Combine(projectPath, "package.json");
            if (await FileExistsAsync(packageJsonPath))
            {
                var packageJson = await ReadFileAsync(packageJsonPath);
                
                if (packageJson.Contains("\"nuxt\"")) return "nuxt";
                if (packageJson.Contains("\"next\"")) return "next";
                if (packageJson.Contains("\"@angular/core\"")) return "angular";
                if (packageJson.Contains("\"svelte\"")) return "svelte";
                if (packageJson.Contains("\"vue\"")) return "vue";
                if (packageJson.Contains("\"react\"")) return "react";
            }

            return "unknown";
        }

        #endregion

        #region Deployment Operations

        public async Task<DeploymentResult> DeployToVercelAsync(string projectPath, Dictionary<string, string> config)
        {
            // Install Vercel CLI if not available
            var vercelCheck = await ExecuteCommandAsync("vercel", "--version");
            if (!vercelCheck.Success)
            {
                var installResult = await ExecuteCommandAsync("npm", "install -g vercel");
                if (!installResult.Success)
                {
                    return new DeploymentResult
                    {
                        Success = false,
                        Message = "Failed to install Vercel CLI",
                        Platform = "vercel"
                    };
                }
            }

            // Deploy to Vercel
            var deployResult = await ExecuteCommandAsync("vercel", "--prod --yes", projectPath);
            
            if (deployResult.Success)
            {
                var url = ExtractUrlFromOutput(deployResult.Output, @"https://[\w\-\.]+\.vercel\.app");
                return new DeploymentResult
                {
                    Success = true,
                    Url = url,
                    Platform = "vercel",
                    Message = "Deployment successful"
                };
            }

            return new DeploymentResult
            {
                Success = false,
                Message = deployResult.Error,
                Platform = "vercel"
            };
        }

        public async Task<DeploymentResult> DeployToNetlifyAsync(string projectPath, Dictionary<string, string> config)
        {
            // Install Netlify CLI if not available
            var netlifyCheck = await ExecuteCommandAsync("netlify", "--version");
            if (!netlifyCheck.Success)
            {
                var installResult = await ExecuteCommandAsync("npm", "install -g netlify-cli");
                if (!installResult.Success)
                {
                    return new DeploymentResult
                    {
                        Success = false,
                        Message = "Failed to install Netlify CLI",
                        Platform = "netlify"
                    };
                }
            }

            // Build and deploy to Netlify
            var buildResult = await ExecuteCommandAsync("npm", "run build", projectPath);
            if (!buildResult.Success)
            {
                return new DeploymentResult
                {
                    Success = false,
                    Message = $"Build failed: {buildResult.Error}",
                    Platform = "netlify"
                };
            }

            var deployResult = await ExecuteCommandAsync("netlify", "deploy --prod --dir=dist", projectPath);
            
            if (deployResult.Success)
            {
                var url = ExtractUrlFromOutput(deployResult.Output, @"https://[\w\-]+\.netlify\.app");
                return new DeploymentResult
                {
                    Success = true,
                    Url = url,
                    Platform = "netlify",
                    Message = "Deployment successful"
                };
            }

            return new DeploymentResult
            {
                Success = false,
                Message = deployResult.Error,
                Platform = "netlify"
            };
        }

        public async Task<bool> ConfigureDomainAsync(string platform, string domain, Dictionary<string, string> config)
        {
            var command = platform.ToLower() switch
            {
                "vercel" => $"vercel domains add {domain}",
                "netlify" => $"netlify sites:update --domain {domain}",
                _ => throw new ArgumentException($"Unsupported platform: {platform}")
            };

            var result = await ExecuteCommandAsync(command);
            return result.Success;
        }

        #endregion

        #region Helper Methods

        private static void SafeConsoleOperation(Action operation)
        {
            try
            {
                operation();
            }
            catch (IOException)
            {
                // Ignore console handle errors in non-interactive environments
            }
            catch (InvalidOperationException)
            {
                // Ignore console operation errors
            }
            catch
            {
                // Ignore other console-related errors
            }
        }

        private string DetectFrameworkFromProcess(ProcessInfo process)
        {
            var commandLine = process.CommandLine.ToLower();
            
            if (commandLine.Contains("nuxt")) return "nuxt";
            if (commandLine.Contains("next")) return "next";
            if (commandLine.Contains("angular") || commandLine.Contains("ng ")) return "angular";
            if (commandLine.Contains("svelte")) return "svelte";
            if (commandLine.Contains("vue")) return "vue";
            if (commandLine.Contains("react")) return "react";
            if (commandLine.Contains("webpack")) return "webpack";
            if (commandLine.Contains("vite")) return "vite";
            
            return "unknown";
        }

        private async Task<int> DetectPortFromProcess(int processId)
        {
            var result = await ExecuteCommandAsync("netstat", $"-ano | findstr {processId}");
            if (result.Success)
            {
                var match = Regex.Match(result.Output, @":(\d+)\s");
                if (match.Success && int.TryParse(match.Groups[1].Value, out int port))
                {
                    return port;
                }
            }
            return 0;
        }

        private string ExtractUrlFromOutput(string output, string pattern)
        {
            var match = Regex.Match(output, pattern);
            return match.Success ? match.Value : string.Empty;
        }

        #endregion
    }
}