using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.Threading;

namespace MAK3R.Core.ExtensionFramework
{
    /// <summary>
    /// MCP Host Service - Handles IPC communication with Node.js Hub
    /// Provides JSON-based request/response protocol over stdin/stdout
    /// </summary>
    public class MCPHostService
    {
        private readonly ExtensionSafetyManager _safetyManager;
        private readonly ExtensionDiscovery _extensionDiscovery;
        private readonly IPlatformAdapter _platform;
        private readonly Dictionary<string, TaskCompletionSource<object>> _pendingRequests;
        private readonly CancellationTokenSource _cancellationTokenSource;
        private bool _running = false;

        public MCPHostService(IPlatformAdapter platform)
        {
            _platform = platform;
            _safetyManager = new ExtensionSafetyManager(platform);
            _extensionDiscovery = new ExtensionDiscovery(platform);
            _pendingRequests = new Dictionary<string, TaskCompletionSource<object>>();
            _cancellationTokenSource = new CancellationTokenSource();
        }

        /// <summary>
        /// Start the MCP host service
        /// </summary>
        public async Task StartAsync()
        {
            try
            {
                await _platform.WriteLineAsync("🚀 Starting MAK3R-HUB MCP Host Service...", ConsoleColor.Blue);
                
                // Initialize extension system
                await InitializeExtensionSystemAsync();
                
                _running = true;
                
                // Send ready signal to Node.js hub
                await SendReadySignalAsync();
                
                // Start listening for requests
                await ProcessRequestsAsync(_cancellationTokenSource.Token);
            }
            catch (Exception ex)
            {
                await _platform.WriteLineAsync($"❌ MCP Host Service startup failed: {ex.Message}", ConsoleColor.Red);
                throw;
            }
        }

        /// <summary>
        /// Stop the MCP host service
        /// </summary>
        public async Task StopAsync()
        {
            try
            {
                _running = false;
                _cancellationTokenSource.Cancel();
                
                await _platform.WriteLineAsync("🛑 MCP Host Service stopping...", ConsoleColor.Yellow);
            }
            catch (Exception ex)
            {
                await _platform.WriteLineAsync($"⚠️ MCP Host Service stop error: {ex.Message}", ConsoleColor.Yellow);
            }
        }

        private async Task InitializeExtensionSystemAsync()
        {
            try
            {
                // Load built-in extensions
                await LoadBuiltInExtensionsAsync();
                
                // Discover and load external extensions
                await LoadExternalExtensionsAsync();
                
                await _platform.WriteLineAsync("✅ Extension system initialized", ConsoleColor.Green);
            }
            catch (Exception ex)
            {
                await _platform.WriteLineAsync($"⚠️ Extension system initialization warning: {ex.Message}", ConsoleColor.Yellow);
            }
        }

        private async Task LoadBuiltInExtensionsAsync()
        {
            try
            {
                await _platform.WriteLineAsync("🔍 Discovering and loading C# extensions...", ConsoleColor.Blue);
                
                // Discover all available extensions
                var discoveryResult = await _extensionDiscovery.DiscoverExtensionsAsync();
                
                // Log any discovery errors
                foreach (var error in discoveryResult.Errors)
                {
                    await _platform.WriteLineAsync($"⚠️ Discovery warning: {error}", ConsoleColor.Yellow);
                }
                
                var config = new ExtensionConfiguration
                {
                    EnableLogging = true,
                    LogLevel = "INFO"
                };
                
                int loadedCount = 0;
                
                // Load each discovered extension
                foreach (var extensionInfo in discoveryResult.DiscoveredExtensions)
                {
                    try
                    {
                        if (extensionInfo.JsonConfiguration?.Extension?.Enabled == false)
                        {
                            await _platform.WriteLineAsync($"⏭️ Extension {extensionInfo.Name}: disabled in configuration", ConsoleColor.Gray);
                            continue;
                        }
                        
                        var extension = await _extensionDiscovery.LoadExtensionAsync(extensionInfo.Name);
                        if (extension != null)
                        {
                            var loaded = await _safetyManager.LoadExtensionSafelyAsync(extensionInfo.Name, extension, config);
                            if (loaded)
                            {
                                loadedCount++;
                                await _platform.WriteLineAsync($"✅ Extension {extensionInfo.Name} v{extensionInfo.Version} loaded", ConsoleColor.Green);
                            }
                            else
                            {
                                await _platform.WriteLineAsync($"❌ Failed to load extension {extensionInfo.Name}", ConsoleColor.Red);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        await _platform.WriteLineAsync($"❌ Error loading extension {extensionInfo.Name}: {ex.Message}", ConsoleColor.Red);
                    }
                }
                
                await _platform.WriteLineAsync($"✅ Extension loading complete: {loadedCount} of {discoveryResult.DiscoveredExtensions.Count} extensions loaded", ConsoleColor.Green);
            }
            catch (Exception ex)
            {
                await _platform.WriteLineAsync($"⚠️ Extension discovery/loading error: {ex.Message}", ConsoleColor.Yellow);
            }
        }

        private async Task LoadExternalExtensionsAsync()
        {
            var extensionsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "extensions");
            
            if (!Directory.Exists(extensionsPath))
            {
                Directory.CreateDirectory(extensionsPath);
                return;
            }

            // Future: Load external extension assemblies
            // This would scan for .dll files implementing IExtension
        }

        private async Task SendReadySignalAsync()
        {
            var readyMessage = new
            {
                id = "ready-signal",
                type = "event",
                timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                payload = new
                {
                    @event = "mcp-host-ready",
                    version = "1.0.0",
                    extensionCount = _safetyManager.GetLoadedExtensionCount()
                }
            };

            var json = JsonSerializer.Serialize(readyMessage);
            Console.WriteLine(json);
        }

        private async Task ProcessRequestsAsync(CancellationToken cancellationToken)
        {
            while (_running && !cancellationToken.IsCancellationRequested)
            {
                try
                {
                    var line = await Console.In.ReadLineAsync();
                    if (string.IsNullOrEmpty(line))
                    {
                        continue;
                    }

                    // Process request in background
                    _ = Task.Run(async () => await ProcessSingleRequestAsync(line), cancellationToken);
                }
                catch (Exception ex)
                {
                    await SendErrorResponseAsync("request-processing-error", ex.Message, "IPC_ERROR");
                }
            }
        }

        private async Task ProcessSingleRequestAsync(string requestJson)
        {
            try
            {
                var request = JsonSerializer.Deserialize<MCPRequest>(requestJson);
                if (request == null)
                {
                    await SendErrorResponseAsync("unknown", "Invalid request format", "INVALID_JSON");
                    return;
                }

                var response = await HandleRequestAsync(request);
                
                var responseJson = JsonSerializer.Serialize(response);
                Console.WriteLine(responseJson);
            }
            catch (Exception ex)
            {
                await SendErrorResponseAsync("unknown", ex.Message, "REQUEST_PROCESSING_ERROR");
            }
        }

        private async Task<MCPResponse> HandleRequestAsync(MCPRequest request)
        {
            try
            {
                switch (request.Payload?.Command)
                {
                    case "discover-extensions":
                        return await HandleDiscoverExtensionsAsync(request);
                        
                    case "execute-tool":
                        return await HandleExecuteToolAsync(request);
                        
                    case "health-check":
                        return await HandleHealthCheckAsync(request);
                        
                    case "load-extension":
                        return await HandleLoadExtensionAsync(request);
                        
                    case "unload-extension":
                        return await HandleUnloadExtensionAsync(request);
                        
                    default:
                        return CreateErrorResponse(request.Id, $"Unknown command: {request.Payload?.Command}", "UNKNOWN_COMMAND");
                }
            }
            catch (Exception ex)
            {
                return CreateErrorResponse(request.Id, ex.Message, "COMMAND_EXECUTION_ERROR");
            }
        }

        private async Task<MCPResponse> HandleDiscoverExtensionsAsync(MCPRequest request)
        {
            try
            {
                var extensions = new List<object>();
                var loadedExtensions = _safetyManager.GetLoadedExtensions();

                foreach (var ext in loadedExtensions)
                {
                    if (ext is MCPExtensionBase mcpExt)
                    {
                        extensions.Add(new
                        {
                            name = mcpExt.Metadata.Name,
                            version = mcpExt.Metadata.Version,
                            description = mcpExt.Metadata.Description,
                            author = mcpExt.Metadata.Author,
                            tools = mcpExt.MCPTools
                        });
                    }
                }

                return CreateSuccessResponse(request.Id, new { extensions });
            }
            catch (Exception ex)
            {
                return CreateErrorResponse(request.Id, ex.Message, "DISCOVERY_ERROR");
            }
        }

        private async Task<MCPResponse> HandleExecuteToolAsync(MCPRequest request)
        {
            try
            {
                var parameters = request.Payload?.Parameters as JsonElement?;
                if (!parameters.HasValue)
                {
                    return CreateErrorResponse(request.Id, "Missing parameters", "MISSING_PARAMETERS");
                }

                // Extract execution parameters
                var extensionName = parameters.Value.GetProperty("extensionName").GetString();
                var toolName = parameters.Value.GetProperty("toolName").GetString();
                var timeout = parameters.Value.TryGetProperty("timeout", out var timeoutElement) 
                    ? timeoutElement.GetInt32() : 30;
                
                string argumentsJson;
                if (parameters.Value.TryGetProperty("arguments", out var argsElement))
                {
                    argumentsJson = argsElement.GetRawText();
                }
                else
                {
                    argumentsJson = "{}";
                }

                // Validate extension exists
                var loadedExtensions = _safetyManager.GetLoadedExtensions();
                var targetExtension = loadedExtensions.FirstOrDefault(ext => 
                    ext.Metadata?.Name?.Equals(extensionName, StringComparison.OrdinalIgnoreCase) == true);
                
                if (targetExtension == null)
                {
                    return CreateErrorResponse(request.Id, 
                        $"Extension '{extensionName}' not loaded or not found", 
                        "EXTENSION_NOT_LOADED");
                }

                // For MCP extensions, use the MCP tool execution pipeline
                if (targetExtension is MCPExtensionBase mcpExtension)
                {
                    var result = await ExecuteMCPToolAsync(mcpExtension, toolName, argumentsJson, timeout);
                    return CreateSuccessResponse(request.Id, result);
                }
                else
                {
                    // Fallback to generic command execution
                    var result = await _safetyManager.ExecuteCommandSafelyAsync(
                        extensionName, 
                        toolName, 
                        ParseParameters(argumentsJson));

                    var resultObj = JsonSerializer.Deserialize<object>(result);
                    return CreateSuccessResponse(request.Id, resultObj);
                }
            }
            catch (Exception ex)
            {
                return CreateErrorResponse(request.Id, ex.Message, "TOOL_EXECUTION_ERROR");
            }
        }

        private async Task<MCPResponse> HandleHealthCheckAsync(MCPRequest request)
        {
            try
            {
                var parameters = request.Payload?.Parameters as JsonElement?;
                var extensionName = parameters?.GetProperty("extensionName").GetString();

                if (string.IsNullOrEmpty(extensionName))
                {
                    return CreateErrorResponse(request.Id, "Extension name required", "MISSING_EXTENSION_NAME");
                }

                var healthResult = await _safetyManager.GetExtensionHealthAsync(extensionName);
                var healthObj = JsonSerializer.Deserialize<object>(healthResult);
                
                return CreateSuccessResponse(request.Id, healthObj);
            }
            catch (Exception ex)
            {
                return CreateErrorResponse(request.Id, ex.Message, "HEALTH_CHECK_ERROR");
            }
        }

        private async Task<MCPResponse> HandleLoadExtensionAsync(MCPRequest request)
        {
            // Future: Implement dynamic extension loading
            return CreateErrorResponse(request.Id, "Dynamic extension loading not yet implemented", "NOT_IMPLEMENTED");
        }

        private async Task<MCPResponse> HandleUnloadExtensionAsync(MCPRequest request)
        {
            // Future: Implement extension unloading
            return CreateErrorResponse(request.Id, "Extension unloading not yet implemented", "NOT_IMPLEMENTED");
        }

        private ExtensionParameters ParseParameters(string jsonArguments)
        {
            try
            {
                var parameters = new ExtensionParameters();
                
                if (!string.IsNullOrEmpty(jsonArguments))
                {
                    var jsonDoc = JsonDocument.Parse(jsonArguments);
                    foreach (var property in jsonDoc.RootElement.EnumerateObject())
                    {
                        parameters.Arguments[property.Name] = property.Value.Clone();
                    }
                }

                return parameters;
            }
            catch
            {
                return new ExtensionParameters();
            }
        }

        private MCPResponse CreateSuccessResponse(string requestId, object data)
        {
            return new MCPResponse
            {
                Id = requestId,
                Type = "response",
                Timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                Payload = new
                {
                    success = true,
                    data
                }
            };
        }

        private MCPResponse CreateErrorResponse(string requestId, string error, string errorCode)
        {
            return new MCPResponse
            {
                Id = requestId,
                Type = "response",
                Timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                Payload = new
                {
                    success = false,
                    error,
                    errorCode
                }
            };
        }

        private async Task<object> ExecuteMCPToolAsync(MCPExtensionBase mcpExtension, string toolName, string argumentsJson, int timeoutSeconds)
        {
            try
            {
                // Find the specific MCP tool
                var mcpTool = mcpExtension.MCPTools?.FirstOrDefault(tool => 
                    tool.Name.Equals(toolName, StringComparison.OrdinalIgnoreCase));
                
                if (mcpTool == null)
                {
                    return new
                    {
                        success = false,
                        error = $"MCP tool '{toolName}' not found in extension '{mcpExtension.Metadata.Name}'",
                        errorCode = "MCP_TOOL_NOT_FOUND"
                    };
                }

                // Execute the MCP tool with timeout
                using var timeoutCancellation = new CancellationTokenSource(TimeSpan.FromSeconds(timeoutSeconds));
                
                var executionTask = mcpExtension.ExecuteMCPToolAsync(toolName, argumentsJson);
                var timeoutTask = Task.Delay(TimeSpan.FromSeconds(timeoutSeconds), timeoutCancellation.Token);
                
                var completedTask = await Task.WhenAny(executionTask, timeoutTask);
                
                if (completedTask == executionTask)
                {
                    timeoutCancellation.Cancel();
                    var result = await executionTask;
                    
                    // Parse the JSON result from the MCP extension
                    if (!string.IsNullOrEmpty(result))
                    {
                        try
                        {
                            return JsonSerializer.Deserialize<object>(result) ?? new { success = true, message = result };
                        }
                        catch
                        {
                            return new { success = true, message = result };
                        }
                    }
                    
                    return new { success = true, message = "Command executed successfully" };
                }
                else
                {
                    return new
                    {
                        success = false,
                        error = $"MCP tool execution timed out after {timeoutSeconds} seconds",
                        errorCode = "MCP_EXECUTION_TIMEOUT"
                    };
                }
            }
            catch (Exception ex)
            {
                return new
                {
                    success = false,
                    error = $"MCP tool execution failed: {ex.Message}",
                    errorCode = "MCP_EXECUTION_ERROR",
                    exception = ex.GetType().Name
                };
            }
        }

        private async Task SendErrorResponseAsync(string requestId, string error, string errorCode)
        {
            var response = CreateErrorResponse(requestId, error, errorCode);
            var json = JsonSerializer.Serialize(response);
            Console.WriteLine(json);
        }
    }

    public class MCPRequest
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public string Timestamp { get; set; }
        public MCPRequestPayload Payload { get; set; }
    }

    public class MCPRequestPayload
    {
        public string Command { get; set; }
        public object Parameters { get; set; }
    }

    public class MCPResponse
    {
        public string Id { get; set; }
        public string Type { get; set; }
        public string Timestamp { get; set; }
        public object Payload { get; set; }
    }
}