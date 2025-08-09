using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.IO;
using System.Text.Json;

namespace MAK3R.Core.ExtensionFramework
{
    /// <summary>
    /// Bulletproof extension execution manager
    /// Ensures NO exceptions ever reach Claude Code regardless of extension quality
    /// </summary>
    public class ExtensionSafetyManager
    {
        private readonly Dictionary<string, IExtension> _loadedExtensions = new();
        private readonly IPlatformAdapter _platform;
        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };

        public ExtensionSafetyManager(IPlatformAdapter platform)
        {
            _platform = platform ?? throw new ArgumentNullException(nameof(platform));
        }

        /// <summary>
        /// Execute extension command with complete safety wrapper
        /// GUARANTEES: Never throws exceptions, always returns valid JSON result
        /// </summary>
        public async Task<string> ExecuteCommandSafelyAsync(string extensionName, string command, ExtensionParameters parameters)
        {
            var stopwatch = Stopwatch.StartNew();
            
            try
            {
                // 1. Validate inputs with safe defaults
                extensionName = SafeString(extensionName, "unknown");
                command = SafeString(command, "help");
                parameters ??= new ExtensionParameters();

                // 2. Apply execution timeout
                using var timeoutCancellation = new CancellationTokenSource(TimeSpan.FromSeconds(parameters.TimeoutSeconds));
                
                // 3. Execute with timeout protection
                var result = await ExecuteWithTimeoutAsync(extensionName, command, parameters, timeoutCancellation.Token);
                result.ExecutionTime = stopwatch.Elapsed;
                
                // 4. Return guaranteed valid JSON
                return JsonSerializer.Serialize(new
                {
                    success = result.Success,
                    message = SafeString(result.Message),
                    data = result.Data ?? new Dictionary<string, object>(),
                    error = SafeString(result.Error),
                    errorCode = SafeString(result.ErrorCode),
                    warnings = result.Warnings ?? Array.Empty<string>(),
                    executionTimeMs = result.ExecutionTime.TotalMilliseconds,
                    extension = extensionName,
                    command = command
                }, JsonOptions);
            }
            catch (Exception ex)
            {
                // ULTIMATE SAFETY NET - This should never execute if extensions are properly written
                stopwatch.Stop();
                return CreateEmergencyErrorResponse(extensionName, command, ex, stopwatch.Elapsed);
            }
        }

        /// <summary>
        /// Load extension with complete error isolation
        /// </summary>
        public async Task<bool> LoadExtensionSafelyAsync(string extensionName, IExtension extension, ExtensionConfiguration config)
        {
            try
            {
                extensionName = SafeString(extensionName, "unknown");
                
                if (extension == null)
                {
                    await LogErrorAsync($"Extension {extensionName}: null extension provided");
                    return false;
                }

                // Initialize extension with timeout protection
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
                
                var initTask = SafeInitializeExtension(extension, config ?? new ExtensionConfiguration());
                var completedTask = await Task.WhenAny(initTask, Task.Delay(30000, timeout.Token));
                
                if (completedTask == initTask && await initTask)
                {
                    _loadedExtensions[extensionName] = extension;
                    await LogInfoAsync($"Extension {extensionName}: loaded successfully");
                    return true;
                }
                else
                {
                    await LogErrorAsync($"Extension {extensionName}: initialization failed or timed out");
                    return false;
                }
            }
            catch (Exception ex)
            {
                await LogErrorAsync($"Extension {extensionName}: load error - {SafeString(ex.Message)}");
                return false;
            }
        }

        /// <summary>
        /// Get extension health with complete safety
        /// </summary>
        public async Task<string> GetExtensionHealthAsync(string extensionName)
        {
            var stopwatch = Stopwatch.StartNew();
            
            try
            {
                extensionName = SafeString(extensionName, "unknown");
                
                if (!_loadedExtensions.TryGetValue(extensionName, out var extension))
                {
                    return JsonSerializer.Serialize(new
                    {
                        success = false,
                        error = "Extension not loaded",
                        errorCode = "EXTENSION_NOT_FOUND",
                        extension = extensionName,
                        executionTimeMs = stopwatch.Elapsed.TotalMilliseconds
                    }, JsonOptions);
                }

                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                var healthTask = SafeCheckHealth(extension);
                var completedTask = await Task.WhenAny(healthTask, Task.Delay(10000, timeout.Token));
                
                ExtensionHealthResult health;
                if (completedTask == healthTask)
                {
                    health = await healthTask;
                }
                else
                {
                    health = new ExtensionHealthResult
                    {
                        IsHealthy = false,
                        Status = "TIMEOUT",
                        Issues = new[] { "Health check timed out after 10 seconds" }
                    };
                }

                stopwatch.Stop();
                health.ResponseTime = stopwatch.Elapsed;

                return JsonSerializer.Serialize(new
                {
                    success = health.IsHealthy,
                    status = SafeString(health.Status),
                    dependencies = health.Dependencies ?? new Dictionary<string, bool>(),
                    issues = health.Issues ?? Array.Empty<string>(),
                    responseTimeMs = health.ResponseTime.TotalMilliseconds,
                    extension = extensionName
                }, JsonOptions);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return CreateEmergencyErrorResponse(extensionName, "health-check", ex, stopwatch.Elapsed);
            }
        }

        /// <summary>
        /// List all loaded extensions safely
        /// </summary>
        public string ListLoadedExtensions()
        {
            try
            {
                var extensions = new List<object>();
                
                foreach (var kvp in _loadedExtensions)
                {
                    try
                    {
                        var metadata = kvp.Value.Metadata ?? new ExtensionMetadata { Name = kvp.Key };
                        extensions.Add(new
                        {
                            name = SafeString(kvp.Key),
                            version = SafeString(metadata.Version, "1.0.0"),
                            description = SafeString(metadata.Description, "No description"),
                            author = SafeString(metadata.Author, "Unknown"),
                            commands = SafeStringArray(kvp.Value.AvailableCommands),
                            tags = metadata.Tags ?? Array.Empty<string>()
                        });
                    }
                    catch
                    {
                        // If metadata fails, include basic info
                        extensions.Add(new
                        {
                            name = SafeString(kvp.Key),
                            version = "1.0.0",
                            description = "Metadata unavailable",
                            author = "Unknown",
                            commands = Array.Empty<string>(),
                            tags = Array.Empty<string>()
                        });
                    }
                }

                return JsonSerializer.Serialize(new
                {
                    success = true,
                    extensions = extensions,
                    totalCount = _loadedExtensions.Count
                }, JsonOptions);
            }
            catch (Exception ex)
            {
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    error = SafeString(ex.Message),
                    errorCode = "LIST_EXTENSIONS_ERROR",
                    extensions = Array.Empty<object>(),
                    totalCount = 0
                }, JsonOptions);
            }
        }

        #region Private Safety Methods

        private async Task<ExtensionResult> ExecuteWithTimeoutAsync(string extensionName, string command, ExtensionParameters parameters, CancellationToken cancellationToken)
        {
            try
            {
                if (!_loadedExtensions.TryGetValue(extensionName, out var extension))
                {
                    return ExtensionResult.ErrorResult($"Extension '{extensionName}' not loaded", "EXTENSION_NOT_FOUND");
                }

                var executeTask = SafeExecuteCommand(extension, command, parameters);
                var timeoutTask = Task.Delay(Timeout.Infinite, cancellationToken);
                
                var completedTask = await Task.WhenAny(executeTask, timeoutTask);
                
                if (completedTask == executeTask)
                {
                    return await executeTask;
                }
                else
                {
                    return ExtensionResult.ErrorResult($"Command timed out after {parameters.TimeoutSeconds} seconds", "TIMEOUT");
                }
            }
            catch (Exception ex)
            {
                return ExtensionResult.ErrorResult($"Extension execution error: {SafeString(ex.Message)}", "EXECUTION_ERROR");
            }
        }

        private async Task<ExtensionResult> SafeExecuteCommand(IExtension extension, string command, ExtensionParameters parameters)
        {
            try
            {
                var result = await extension.ExecuteCommandAsync(command, parameters);
                return result ?? ExtensionResult.ErrorResult("Extension returned null result", "NULL_RESULT");
            }
            catch (Exception ex)
            {
                return ExtensionResult.ErrorResult($"Extension threw exception: {SafeString(ex.Message)}", "EXTENSION_EXCEPTION");
            }
        }

        private async Task<bool> SafeInitializeExtension(IExtension extension, ExtensionConfiguration config)
        {
            try
            {
                return await extension.InitializeAsync(config);
            }
            catch
            {
                return false;
            }
        }

        private async Task<ExtensionHealthResult> SafeCheckHealth(IExtension extension)
        {
            try
            {
                var result = await extension.CheckHealthAsync();
                return result ?? new ExtensionHealthResult
                {
                    IsHealthy = false,
                    Status = "NULL_RESPONSE",
                    Issues = new[] { "Health check returned null" }
                };
            }
            catch (Exception ex)
            {
                return new ExtensionHealthResult
                {
                    IsHealthy = false,
                    Status = "EXCEPTION",
                    Issues = new[] { $"Health check threw exception: {SafeString(ex.Message)}" }
                };
            }
        }

        private string CreateEmergencyErrorResponse(string extensionName, string command, Exception ex, TimeSpan executionTime)
        {
            try
            {
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    message = "Emergency error handler activated",
                    data = new Dictionary<string, object>(),
                    error = $"Critical extension failure: {SafeString(ex.Message)}",
                    errorCode = "CRITICAL_EXTENSION_FAILURE",
                    warnings = new[] { "Extension bypassed safety mechanisms" },
                    executionTimeMs = executionTime.TotalMilliseconds,
                    extension = SafeString(extensionName),
                    command = SafeString(command)
                }, JsonOptions);
            }
            catch
            {
                // If JSON serialization fails, return hardcoded safe response
                return "{\"success\":false,\"error\":\"Critical system failure\",\"errorCode\":\"SYSTEM_FAILURE\"}";
            }
        }

        private static string SafeString(string value, string defaultValue = "")
        {
            return string.IsNullOrEmpty(value) ? defaultValue : value;
        }

        private static string[] SafeStringArray(IEnumerable<string> values)
        {
            try
            {
                var result = new List<string>();
                if (values != null)
                {
                    foreach (var value in values)
                    {
                        result.Add(SafeString(value));
                    }
                }
                return result.ToArray();
            }
            catch
            {
                return Array.Empty<string>();
            }
        }

        private async Task LogInfoAsync(string message)
        {
            try
            {
                await _platform.WriteLineAsync($"[INFO] {message}", ConsoleColor.White);
            }
            catch
            {
                // Ignore logging failures
            }
        }

        private async Task LogErrorAsync(string message)
        {
            try
            {
                await _platform.WriteLineAsync($"[ERROR] {message}", ConsoleColor.Red);
            }
            catch
            {
                // Ignore logging failures
            }
        }

        /// <summary>
        /// Get loaded extension count for MCP host
        /// </summary>
        public int GetLoadedExtensionCount()
        {
            return _loadedExtensions.Count;
        }

        /// <summary>
        /// Get all loaded extensions for MCP host
        /// </summary>
        public IEnumerable<IExtension> GetLoadedExtensions()
        {
            return _loadedExtensions.Values;
        }

        #endregion
    }
}