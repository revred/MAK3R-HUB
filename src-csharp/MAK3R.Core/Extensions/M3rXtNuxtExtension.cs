using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using MAK3R.Core.ExtensionFramework;

namespace MAK3R.Core
{
    /// <summary>
    /// m3r-xt-nuxt Extension - Vue/Nuxt Development Command Abstractions
    /// Leverages SharpUtility functions to provide high-level Vue/Nuxt workflow commands
    /// Designed to reduce Claude Code token usage through intelligent command abstractions
    /// </summary>
    public class M3rXtNuxtExtension : IExtension
    {
        private bool _initialized = false;
        private ExtensionConfiguration _config;
        private readonly string _sharpUtilityPath;

        public M3rXtNuxtExtension()
        {
            // Try to locate SharpUtility executable
            _sharpUtilityPath = FindSharpUtilityPath();
        }

        public ExtensionMetadata Metadata => new ExtensionMetadata
        {
            Name = "m3r-xt-nuxt",
            Version = "1.0.0",
            Description = "Vue/Nuxt development workflow abstractions for Claude Code token efficiency",
            Author = "MAK3R-HUB",
            Dependencies = new[] { "Node.js", "npm", "SharpUtility" },
            Tags = new[] { "vue", "nuxt", "development", "server-management", "diagnostics" }
        };

        public IEnumerable<string> AvailableCommands => new[]
        {
            "discover-projects",     // Auto-discover all Vue/Nuxt projects
            "smart-start",          // Intelligent project launcher
            "kill-servers",         // Terminate all Vue/Nuxt servers
            "health-check-all",     // Health check all discovered projects
            "analyze-deep",         // Deep project analysis
            "scan-running",         // Scan for running development servers
            "live-monitor",         // Real-time server monitoring
            "resource-analysis",    // System resource usage analysis
            "anomaly-scan",         // Detect development issues
            "direct-nuxt-launch",   // Direct Nuxt Hello World launcher
            "help"                  // Show available commands
        };

        public async Task<ExtensionResult> ExecuteCommandAsync(string command, ExtensionParameters parameters)
        {
            if (!_initialized)
            {
                return ExtensionResult.ErrorResult("Extension not initialized", "NOT_INITIALIZED");
            }

            if (string.IsNullOrEmpty(_sharpUtilityPath))
            {
                return ExtensionResult.ErrorResult("SharpUtility executable not found", "SHARPUTIL_NOT_FOUND");
            }

            var stopwatch = Stopwatch.StartNew();
            
            try
            {
                var result = command.ToLower() switch
                {
                    "discover-projects" => await ExecuteSharpUtilityCommand("A", parameters),
                    "smart-start" => await ExecuteSharpUtilityCommand("E", parameters),
                    "kill-servers" => await ExecuteSharpUtilityCommand("F", parameters),
                    "health-check-all" => await ExecuteSharpUtilityCommand("G", parameters),
                    "analyze-deep" => await ExecuteSharpUtilityCommand("C", parameters),
                    "scan-running" => await ExecuteSharpUtilityCommand("B", parameters),
                    "live-monitor" => await ExecuteSharpUtilityCommand("D", parameters),
                    "resource-analysis" => await ExecuteSharpUtilityCommand("J", parameters),
                    "anomaly-scan" => await ExecuteSharpUtilityCommand("I", parameters),
                    "direct-nuxt-launch" => await ExecuteSharpUtilityCommand("Z", parameters),
                    "help" => await ShowExtensionHelp(parameters),
                    _ => ExtensionResult.ErrorResult($"Unknown command: {command}", "UNKNOWN_COMMAND")
                };

                result.ExecutionTime = stopwatch.Elapsed;
                return result;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return ExtensionResult.ErrorResult(
                    $"Command execution failed: {ex.Message}", 
                    "EXECUTION_EXCEPTION",
                    new[] { $"Command: {command}", $"Execution time: {stopwatch.Elapsed.TotalMilliseconds}ms" }
                );
            }
        }

        public async Task<ExtensionHealthResult> CheckHealthAsync()
        {
            var stopwatch = Stopwatch.StartNew();
            var dependencies = new Dictionary<string, bool>();
            var issues = new List<string>();

            try
            {
                // Check SharpUtility availability
                dependencies["SharpUtility"] = !string.IsNullOrEmpty(_sharpUtilityPath) && File.Exists(_sharpUtilityPath);
                if (!dependencies["SharpUtility"])
                {
                    issues.Add("SharpUtility executable not found or not accessible");
                }

                // Check Node.js availability
                dependencies["Node.js"] = await CheckCommandAvailable("node", "--version");
                if (!dependencies["Node.js"])
                {
                    issues.Add("Node.js not found in PATH");
                }

                // Check npm availability  
                dependencies["npm"] = await CheckCommandAvailable("npm", "--version");
                if (!dependencies["npm"])
                {
                    issues.Add("npm not found in PATH");
                }

                // Test SharpUtility execution if available
                if (dependencies["SharpUtility"])
                {
                    try
                    {
                        var testResult = await ExecuteSharpUtilityCommand("K", new ExtensionParameters { TimeoutSeconds = 10 });
                        dependencies["SharpUtility-Execution"] = testResult.Success;
                        if (!testResult.Success)
                        {
                            issues.Add($"SharpUtility execution test failed: {testResult.Error}");
                        }
                    }
                    catch (Exception ex)
                    {
                        dependencies["SharpUtility-Execution"] = false;
                        issues.Add($"SharpUtility execution test error: {ex.Message}");
                    }
                }

                stopwatch.Stop();

                var isHealthy = dependencies.Values.All(v => v);
                return new ExtensionHealthResult
                {
                    IsHealthy = isHealthy,
                    Status = isHealthy ? "HEALTHY" : "ISSUES_DETECTED",
                    Dependencies = dependencies,
                    Issues = issues.ToArray(),
                    ResponseTime = stopwatch.Elapsed
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new ExtensionHealthResult
                {
                    IsHealthy = false,
                    Status = "HEALTH_CHECK_FAILED",
                    Dependencies = dependencies,
                    Issues = new[] { $"Health check error: {ex.Message}" },
                    ResponseTime = stopwatch.Elapsed
                };
            }
        }

        public async Task<bool> InitializeAsync(ExtensionConfiguration config)
        {
            try
            {
                _config = config ?? new ExtensionConfiguration();
                
                // Verify SharpUtility is available
                if (string.IsNullOrEmpty(_sharpUtilityPath))
                {
                    return false;
                }

                // Test basic connectivity
                var testResult = await CheckCommandAvailable("node", "--version");
                
                _initialized = true;
                return true;
            }
            catch
            {
                _initialized = false;
                return false;
            }
        }

        public async Task ShutdownAsync()
        {
            try
            {
                _initialized = false;
                // Cleanup any resources if needed
                await Task.CompletedTask;
            }
            catch
            {
                // Ignore shutdown errors
            }
        }

        #region Private Helper Methods

        private string FindSharpUtilityPath()
        {
            // Try common locations for SharpUtility
            var possiblePaths = new[]
            {
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "..", "batch-ops", "sharpUtility.exe"),
                Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "batch-ops", "sharpUtility.exe"),
                @"C:\code\ConvertStar\batch-ops\sharpUtility.exe",
                Path.Combine(Environment.CurrentDirectory, "batch-ops", "sharpUtility.exe"),
                Path.Combine(Environment.CurrentDirectory, "..", "..", "..", "batch-ops", "sharpUtility.exe")
            };

            foreach (var path in possiblePaths)
            {
                try
                {
                    var fullPath = Path.GetFullPath(path);
                    if (File.Exists(fullPath))
                    {
                        return fullPath;
                    }
                }
                catch
                {
                    // Continue searching
                }
            }

            return null;
        }

        private async Task<ExtensionResult> ExecuteSharpUtilityCommand(string command, ExtensionParameters parameters)
        {
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = _sharpUtilityPath,
                    Arguments = command,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                    WorkingDirectory = parameters.WorkingDirectory
                };

                using var process = Process.Start(processInfo);
                if (process == null)
                {
                    return ExtensionResult.ErrorResult("Failed to start SharpUtility process", "PROCESS_START_FAILED");
                }

                // Wait for completion with timeout
                var completedInTime = await WaitForExitAsync(process, TimeSpan.FromSeconds(parameters.TimeoutSeconds));
                
                if (!completedInTime)
                {
                    try { process.Kill(); } catch { }
                    return ExtensionResult.ErrorResult($"Command timed out after {parameters.TimeoutSeconds} seconds", "TIMEOUT");
                }

                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();

                var success = process.ExitCode == 0;
                var message = success ? "Command executed successfully" : "Command execution failed";
                
                var data = new Dictionary<string, object>
                {
                    ["exitCode"] = process.ExitCode,
                    ["output"] = output ?? "",
                    ["error"] = error ?? "",
                    ["command"] = command,
                    ["sharpUtilityPath"] = _sharpUtilityPath
                };

                if (success)
                {
                    return ExtensionResult.SuccessResult(message, data);
                }
                else
                {
                    return ExtensionResult.ErrorResult($"SharpUtility returned exit code {process.ExitCode}: {error}", "SHARPUTIL_ERROR");
                }
            }
            catch (Exception ex)
            {
                return ExtensionResult.ErrorResult($"SharpUtility execution error: {ex.Message}", "EXECUTION_ERROR");
            }
        }

        private async Task<bool> CheckCommandAvailable(string command, string args = "--version")
        {
            try
            {
                var processInfo = new ProcessStartInfo
                {
                    FileName = command,
                    Arguments = args,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true
                };

                using var process = Process.Start(processInfo);
                if (process == null) return false;

                var completed = await WaitForExitAsync(process, TimeSpan.FromSeconds(5));
                return completed && process.ExitCode == 0;
            }
            catch
            {
                return false;
            }
        }

        private async Task<bool> WaitForExitAsync(Process process, TimeSpan timeout)
        {
            try
            {
                using var timeoutCancellation = new System.Threading.CancellationTokenSource(timeout);
                
                while (!process.HasExited && !timeoutCancellation.Token.IsCancellationRequested)
                {
                    await Task.Delay(100, timeoutCancellation.Token);
                }
                
                return process.HasExited;
            }
            catch
            {
                return false;
            }
        }

        private async Task<ExtensionResult> ShowExtensionHelp(ExtensionParameters parameters)
        {
            var helpData = new Dictionary<string, object>
            {
                ["extension"] = Metadata.Name,
                ["version"] = Metadata.Version,
                ["description"] = Metadata.Description,
                ["commands"] = AvailableCommands.Select(cmd => new
                {
                    name = cmd,
                    description = GetCommandDescription(cmd)
                }).ToArray()
            };

            return ExtensionResult.SuccessResult("Extension help information", helpData);
        }

        private string GetCommandDescription(string command)
        {
            return command switch
            {
                "discover-projects" => "Auto-discover all Vue/Nuxt projects in filesystem",
                "smart-start" => "Intelligently select and start best available project",
                "kill-servers" => "Terminate all running Vue/Nuxt development servers",
                "health-check-all" => "Comprehensive health check for all discovered projects",
                "analyze-deep" => "Deep analysis of project structure, dependencies, and configuration",
                "scan-running" => "Scan for currently running development servers on common ports",
                "live-monitor" => "Real-time monitoring of development server status",
                "resource-analysis" => "Analyze system resource usage (memory, CPU, disk)",
                "anomaly-scan" => "Detect port conflicts, dependency issues, and configuration problems",
                "direct-nuxt-launch" => "Direct launcher for Nuxt Hello World project",
                "help" => "Show this help information",
                _ => "No description available"
            };
        }

        #endregion
    }
}