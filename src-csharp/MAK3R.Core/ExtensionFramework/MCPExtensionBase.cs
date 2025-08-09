using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Text.Json;

namespace MAK3R.Core.ExtensionFramework
{
    /// <summary>
    /// Base class for MCP-compatible extensions
    /// Provides standard MCP tool integration with MAK3R-HUB Node.js hub
    /// </summary>
    public abstract class MCPExtensionBase : IExtension
    {
        protected ExtensionMetadata _metadata;
        protected ExtensionConfiguration _configuration;
        protected bool _initialized = false;
        
        /// <summary>
        /// Extension metadata
        /// </summary>
        public ExtensionMetadata Metadata => _metadata;
        
        /// <summary>
        /// Available MCP tools this extension provides
        /// </summary>
        public abstract IEnumerable<string> AvailableCommands { get; }
        
        /// <summary>
        /// MCP tool definitions for Node.js hub integration
        /// </summary>
        public abstract IEnumerable<MCPToolDefinition> MCPTools { get; }

        protected MCPExtensionBase(string name, string version, string description, string author)
        {
            _metadata = new ExtensionMetadata
            {
                Name = name,
                Version = version,
                Description = description,
                Author = author
            };
        }

        /// <summary>
        /// Initialize the extension
        /// </summary>
        public virtual async Task<bool> InitializeAsync(ExtensionConfiguration config)
        {
            try
            {
                _configuration = config;
                await OnInitializeAsync();
                _initialized = true;
                return true;
            }
            catch (Exception ex)
            {
                await LogErrorAsync($"Extension initialization failed: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Execute a command/tool
        /// </summary>
        public abstract Task<ExtensionResult> ExecuteCommandAsync(string command, ExtensionParameters parameters);

        /// <summary>
        /// Health check
        /// </summary>
        public virtual async Task<ExtensionHealthResult> CheckHealthAsync()
        {
            try
            {
                if (!_initialized)
                {
                    return new ExtensionHealthResult
                    {
                        IsHealthy = false,
                        Status = "Not Initialized",
                        Issues = new[] { "Extension not initialized" }
                    };
                }

                var customHealth = await OnHealthCheckAsync();
                return customHealth ?? new ExtensionHealthResult
                {
                    IsHealthy = true,
                    Status = "Healthy"
                };
            }
            catch (Exception ex)
            {
                return new ExtensionHealthResult
                {
                    IsHealthy = false,
                    Status = "Error",
                    Issues = new[] { ex.Message }
                };
            }
        }

        /// <summary>
        /// Cleanup resources
        /// </summary>
        public virtual async Task ShutdownAsync()
        {
            try
            {
                await OnShutdownAsync();
                _initialized = false;
            }
            catch (Exception ex)
            {
                await LogErrorAsync($"Extension shutdown error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get MCP tools formatted for Node.js hub
        /// </summary>
        public string GetMCPToolsJSON()
        {
            try
            {
                var tools = new List<object>();
                
                foreach (var tool in MCPTools)
                {
                    tools.Add(new
                    {
                        name = tool.Name,
                        description = tool.Description,
                        inputSchema = tool.InputSchema,
                        category = tool.Category ?? "general",
                        timeout = tool.TimeoutSeconds,
                        cached = tool.CacheResults
                    });
                }

                return JsonSerializer.Serialize(tools, new JsonSerializerOptions { WriteIndented = true });
            }
            catch (Exception ex)
            {
                return JsonSerializer.Serialize(new { error = ex.Message });
            }
        }

        /// <summary>
        /// Execute MCP tool with JSON parameters from Node.js hub
        /// </summary>
        public async Task<string> ExecuteMCPToolAsync(string toolName, string jsonParameters)
        {
            try
            {
                var parameters = ParseJSONParameters(jsonParameters);
                var result = await ExecuteCommandAsync(toolName, parameters);
                
                return JsonSerializer.Serialize(new
                {
                    success = result.Success,
                    message = result.Message,
                    data = result.Data,
                    error = result.Error,
                    errorCode = result.ErrorCode,
                    executionTime = result.ExecutionTime.TotalMilliseconds,
                    warnings = result.Warnings
                });
            }
            catch (Exception ex)
            {
                return JsonSerializer.Serialize(new
                {
                    success = false,
                    error = ex.Message,
                    errorCode = "MCP_EXECUTION_ERROR"
                });
            }
        }

        #region Protected Virtual Methods (Override in derived classes)

        /// <summary>
        /// Called during initialization - override for custom setup
        /// </summary>
        protected virtual Task OnInitializeAsync()
        {
            return Task.CompletedTask;
        }

        /// <summary>
        /// Called during health check - override for custom health checks
        /// </summary>
        protected virtual Task<ExtensionHealthResult> OnHealthCheckAsync()
        {
            return Task.FromResult((ExtensionHealthResult)null);
        }

        /// <summary>
        /// Called during shutdown - override for custom cleanup
        /// </summary>
        protected virtual Task OnShutdownAsync()
        {
            return Task.CompletedTask;
        }

        #endregion

        #region Helper Methods

        protected ExtensionParameters ParseJSONParameters(string jsonParameters)
        {
            try
            {
                if (string.IsNullOrEmpty(jsonParameters))
                {
                    return new ExtensionParameters();
                }

                var jsonDoc = JsonDocument.Parse(jsonParameters);
                var parameters = new ExtensionParameters();

                foreach (var property in jsonDoc.RootElement.EnumerateObject())
                {
                    parameters.Arguments[property.Name] = property.Value.Clone();
                }

                return parameters;
            }
            catch
            {
                return new ExtensionParameters();
            }
        }

        protected async Task LogInfoAsync(string message)
        {
            if (_configuration?.EnableLogging == true)
            {
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] INFO [{_metadata.Name}] {message}");
            }
        }

        protected async Task LogErrorAsync(string message)
        {
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] ERROR [{_metadata.Name}] {message}");
        }

        protected T GetConfigSetting<T>(string key, T defaultValue = default(T)!)
        {
            if (_configuration == null)
                return defaultValue;
            
            return _configuration.GetSetting(key, defaultValue) ?? defaultValue;
        }

        #endregion
    }

    /// <summary>
    /// MCP tool definition for Node.js hub integration
    /// </summary>
    public class MCPToolDefinition
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public object InputSchema { get; set; }
        public string Category { get; set; }
        public int TimeoutSeconds { get; set; } = 60;
        public bool CacheResults { get; set; } = false;
    }
}