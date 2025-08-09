using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Text.Json;

namespace MAK3R.Core.ExtensionFramework
{
    /// <summary>
    /// Standard interface for all MAK3R-HUB extensions
    /// Provides consistent command execution and error handling
    /// </summary>
    public interface IExtension
    {
        /// <summary>
        /// Extension metadata
        /// </summary>
        ExtensionMetadata Metadata { get; }
        
        /// <summary>
        /// Available commands this extension provides
        /// </summary>
        IEnumerable<string> AvailableCommands { get; }
        
        /// <summary>
        /// Execute a command with parameters
        /// Extensions should NOT throw exceptions - return ExtensionResult with error info
        /// </summary>
        Task<ExtensionResult> ExecuteCommandAsync(string command, ExtensionParameters parameters);
        
        /// <summary>
        /// Health check for the extension
        /// </summary>
        Task<ExtensionHealthResult> CheckHealthAsync();
        
        /// <summary>
        /// Initialize the extension with configuration
        /// </summary>
        Task<bool> InitializeAsync(ExtensionConfiguration config);
        
        /// <summary>
        /// Cleanup resources when shutting down
        /// </summary>
        Task ShutdownAsync();
    }

    /// <summary>
    /// Extension metadata information
    /// </summary>
    public class ExtensionMetadata
    {
        public string Name { get; set; }
        public string Version { get; set; }
        public string Description { get; set; }
        public string Author { get; set; }
        public string[] Dependencies { get; set; } = Array.Empty<string>();
        public string[] Tags { get; set; } = Array.Empty<string>();
    }

    /// <summary>
    /// Parameters passed to extension commands
    /// </summary>
    public class ExtensionParameters
    {
        public Dictionary<string, object> Arguments { get; set; } = new();
        public string WorkingDirectory { get; set; } = ".";
        public bool Verbose { get; set; } = false;
        public int TimeoutSeconds { get; set; } = 300;
        
        public T GetArgument<T>(string key, T defaultValue = default)
        {
            if (Arguments.TryGetValue(key, out var value))
            {
                try
                {
                    if (value is JsonElement jsonElement)
                    {
                        return JsonSerializer.Deserialize<T>(jsonElement.GetRawText());
                    }
                    return (T)Convert.ChangeType(value, typeof(T));
                }
                catch
                {
                    return defaultValue;
                }
            }
            return defaultValue;
        }
    }

    /// <summary>
    /// Result from extension command execution
    /// NEVER contains exceptions - all errors are captured safely
    /// </summary>
    public class ExtensionResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public Dictionary<string, object> Data { get; set; } = new();
        public string Error { get; set; }
        public string ErrorCode { get; set; }
        public TimeSpan ExecutionTime { get; set; }
        public string[] Warnings { get; set; } = Array.Empty<string>();
        
        public static ExtensionResult SuccessResult(string message = "", Dictionary<string, object> data = null)
        {
            return new ExtensionResult
            {
                Success = true,
                Message = message,
                Data = data ?? new Dictionary<string, object>()
            };
        }
        
        public static ExtensionResult ErrorResult(string error, string errorCode = "EXTENSION_ERROR", string[] warnings = null)
        {
            return new ExtensionResult
            {
                Success = false,
                Error = error,
                ErrorCode = errorCode,
                Warnings = warnings ?? Array.Empty<string>()
            };
        }
    }

    /// <summary>
    /// Health check result for extensions
    /// </summary>
    public class ExtensionHealthResult
    {
        public bool IsHealthy { get; set; }
        public string Status { get; set; } = "OK";
        public Dictionary<string, bool> Dependencies { get; set; } = new();
        public string[] Issues { get; set; } = Array.Empty<string>();
        public TimeSpan ResponseTime { get; set; }
    }

    /// <summary>
    /// Extension configuration
    /// </summary>
    public class ExtensionConfiguration
    {
        public Dictionary<string, object> Settings { get; set; } = new();
        public string ConfigurationPath { get; set; }
        public bool EnableLogging { get; set; } = true;
        public string LogLevel { get; set; } = "INFO";
        
        public T GetSetting<T>(string key, T defaultValue = default)
        {
            if (Settings.TryGetValue(key, out var value))
            {
                try
                {
                    return (T)Convert.ChangeType(value, typeof(T));
                }
                catch
                {
                    return defaultValue;
                }
            }
            return defaultValue;
        }
    }
}