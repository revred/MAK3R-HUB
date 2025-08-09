using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using MAK3R.Core.ExtensionFramework;

namespace MAK3R.Extensions.Example
{
    /// <summary>
    /// Example C# Extension - Demonstrates full MCP integration patterns
    /// This extension shows how to create C# extensions that work seamlessly with the Node.js hub
    /// </summary>
    public class ExampleExtension : MCPExtensionBase
    {
        public ExampleExtension() : base(
            "example-extension",
            "1.0.0", 
            "Complete example C# extension demonstrating MCP patterns",
            "MAK3R-HUB Team")
        {
        }

        public override IEnumerable<string> AvailableCommands => new[]
        {
            "m3r__example__hello",
            "m3r__example__system_info", 
            "m3r__example__file_operations",
            "m3r__example__error_demo"
        };

        public override IEnumerable<MCPToolDefinition> MCPTools => new[]
        {
            new MCPToolDefinition
            {
                Name = "m3r__example__hello",
                Description = "Simple hello world command with optional name parameter",
                InputSchema = JsonSerializer.Deserialize<JsonElement>("""
                {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Name to greet (optional)",
                            "default": "World"
                        }
                    },
                    "additionalProperties": false
                }
                """),
                Category = "example"
            },

            new MCPToolDefinition
            {
                Name = "m3r__example__system_info",
                Description = "Get comprehensive system information",
                InputSchema = JsonSerializer.Deserialize<JsonElement>("""
                {
                    "type": "object",
                    "properties": {
                        "includeEnvironment": {
                            "type": "boolean",
                            "description": "Include environment variables",
                            "default": false
                        }
                    },
                    "additionalProperties": false
                }
                """),
                Category = "system"
            },

            new MCPToolDefinition
            {
                Name = "m3r__example__file_operations",
                Description = "Demonstrate safe file operations with validation",
                InputSchema = JsonSerializer.Deserialize<JsonElement>("""
                {
                    "type": "object",
                    "properties": {
                        "operation": {
                            "type": "string",
                            "enum": ["list", "create_temp", "read_info"],
                            "description": "File operation to perform"
                        },
                        "path": {
                            "type": "string",
                            "description": "Path for file operations (optional for some operations)"
                        }
                    },
                    "required": ["operation"],
                    "additionalProperties": false
                }
                """),
                Category = "file"
            },

            new MCPToolDefinition
            {
                Name = "m3r__example__error_demo",
                Description = "Demonstrate error handling patterns",
                InputSchema = JsonSerializer.Deserialize<JsonElement>("""
                {
                    "type": "object",
                    "properties": {
                        "errorType": {
                            "type": "string",
                            "enum": ["none", "validation", "runtime", "timeout"],
                            "description": "Type of error to demonstrate",
                            "default": "none"
                        }
                    },
                    "additionalProperties": false
                }
                """),
                Category = "testing"
            }
        };

        protected override async Task OnInitializeAsync()
        {
            // Custom initialization logic for this extension
            await Task.Delay(100); // Simulate initialization work
        }

        public override async Task<ExtensionResult> ExecuteCommandAsync(string command, ExtensionParameters parameters)
        {
            try
            {
                var jsonResult = command switch
                {
                    "m3r__example__hello" => await ExecuteHelloAsync(parameters),
                    "m3r__example__system_info" => await ExecuteSystemInfoAsync(parameters),
                    "m3r__example__file_operations" => await ExecuteFileOperationsAsync(parameters),
                    "m3r__example__error_demo" => await ExecuteErrorDemoAsync(parameters),
                    _ => new { 
                        success = false, 
                        error = $"Unknown command: {command}",
                        errorCode = "UNKNOWN_COMMAND"
                    }
                };

                return new ExtensionResult
                {
                    Success = jsonResult.GetType().GetProperty("success")?.GetValue(jsonResult) as bool? ?? true,
                    Data = jsonResult as Dictionary<string, object> ?? new Dictionary<string, object>(),
                    Message = jsonResult.GetType().GetProperty("message")?.GetValue(jsonResult) as string ?? "Command executed"
                };
            }
            catch (Exception ex)
            {
                return new ExtensionResult
                {
                    Success = false,
                    Error = ex.Message,
                    Message = $"Command execution failed: {ex.Message}"
                };
            }
        }

        private async Task<object> ExecuteHelloAsync(ExtensionParameters parameters)
        {
            var name = parameters.Arguments.ContainsKey("name") ? 
                parameters.Arguments["name"].ToString() : "World";

            var result = new
            {
                success = true,
                message = $"Hello, {name}! 👋",
                timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"),
                extension = Metadata.Name,
                version = Metadata.Version
            };

            return result;
        }

        private async Task<object> ExecuteSystemInfoAsync(ExtensionParameters parameters)
        {
            var includeEnvironment = parameters.Arguments.ContainsKey("includeEnvironment") && 
                                   bool.Parse(parameters.Arguments["includeEnvironment"].ToString());

            var systemInfo = new
            {
                success = true,
                data = new
                {
                    platform = Environment.OSVersion.Platform.ToString(),
                    osVersion = Environment.OSVersion.VersionString,
                    machineName = Environment.MachineName,
                    userName = Environment.UserName,
                    processorCount = Environment.ProcessorCount,
                    workingSet = Environment.WorkingSet,
                    dotnetVersion = Environment.Version.ToString(),
                    currentDirectory = Environment.CurrentDirectory,
                    environment = includeEnvironment ? GetSafeEnvironmentInfo() : null
                },
                timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            };

            return systemInfo;
        }

        private async Task<object> ExecuteFileOperationsAsync(ExtensionParameters parameters)
        {
            var operation = parameters.Arguments.ContainsKey("operation") ? 
                parameters.Arguments["operation"].ToString() : "list";
            var path = parameters.Arguments.ContainsKey("path") ? 
                parameters.Arguments["path"].ToString() : "";

            try
            {
                object result = operation switch
                {
                    "list" => await ListCurrentDirectoryAsync(),
                    "create_temp" => await CreateTempFileAsync(),
                    "read_info" => await ReadFileInfoAsync(path),
                    _ => new { error = $"Unknown operation: {operation}" }
                };

                return new {
                    success = true,
                    operation,
                    data = result,
                    timestamp = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                };
            }
            catch (Exception ex)
            {
                return new {
                    success = false,
                    operation,
                    error = ex.Message,
                    errorCode = "FILE_OPERATION_ERROR"
                };
            }
        }

        private async Task<object> ExecuteErrorDemoAsync(ExtensionParameters parameters)
        {
            var errorType = parameters.Arguments.ContainsKey("errorType") ? 
                parameters.Arguments["errorType"].ToString() : "none";

            switch (errorType)
            {
                case "validation":
                    return new {
                        success = false,
                        error = "Validation error demonstration: Required parameter missing",
                        errorCode = "VALIDATION_ERROR",
                        details = "This is an intentional validation error for testing"
                    };

                case "runtime":
                    throw new InvalidOperationException("Intentional runtime error for demonstration");

                case "timeout":
                    await Task.Delay(35000); // Simulate timeout
                    return new { success = true, message = "This should timeout" };

                case "none":
                default:
                    return new {
                        success = true,
                        message = "No error demonstration - all systems normal",
                        availableErrorTypes = new[] { "validation", "runtime", "timeout" }
                    };
            }
        }

        private async Task<object> ListCurrentDirectoryAsync()
        {
            var currentDir = Environment.CurrentDirectory;
            var files = new List<object>();
            var directories = new List<object>();

            try
            {
                foreach (var file in Directory.GetFiles(currentDir))
                {
                    var fileInfo = new FileInfo(file);
                    files.Add(new
                    {
                        name = fileInfo.Name,
                        size = fileInfo.Length,
                        modified = fileInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                    });
                }

                foreach (var dir in Directory.GetDirectories(currentDir))
                {
                    var dirInfo = new DirectoryInfo(dir);
                    directories.Add(new
                    {
                        name = dirInfo.Name,
                        modified = dirInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                    });
                }
            }
            catch (Exception ex)
            {
                return new { error = ex.Message };
            }

            return new
            {
                currentDirectory = currentDir,
                fileCount = files.Count,
                directoryCount = directories.Count,
                files = files.Take(10), // Limit to first 10 files
                directories = directories.Take(10) // Limit to first 10 directories
            };
        }

        private async Task<object> CreateTempFileAsync()
        {
            try
            {
                var tempPath = Path.GetTempFileName();
                var content = $"MAK3R-HUB Example Extension Test File\nCreated: {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC\nExtension: {Metadata.Name} v{Metadata.Version}";
                
                await File.WriteAllTextAsync(tempPath, content);

                return new
                {
                    tempFilePath = tempPath,
                    contentLength = content.Length,
                    message = "Temporary file created successfully"
                };
            }
            catch (Exception ex)
            {
                return new { error = ex.Message };
            }
        }

        private async Task<object> ReadFileInfoAsync(string path)
        {
            if (string.IsNullOrEmpty(path))
            {
                return new { error = "Path parameter is required for read_info operation" };
            }

            try
            {
                if (File.Exists(path))
                {
                    var fileInfo = new FileInfo(path);
                    return new
                    {
                        type = "file",
                        name = fileInfo.Name,
                        fullPath = fileInfo.FullName,
                        size = fileInfo.Length,
                        created = fileInfo.CreationTime.ToString("yyyy-MM-dd HH:mm:ss"),
                        modified = fileInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss"),
                        readOnly = fileInfo.IsReadOnly
                    };
                }
                else if (Directory.Exists(path))
                {
                    var dirInfo = new DirectoryInfo(path);
                    var fileCount = dirInfo.GetFiles().Length;
                    var subdirCount = dirInfo.GetDirectories().Length;

                    return new
                    {
                        type = "directory",
                        name = dirInfo.Name,
                        fullPath = dirInfo.FullName,
                        fileCount,
                        subdirectoryCount = subdirCount,
                        created = dirInfo.CreationTime.ToString("yyyy-MM-dd HH:mm:ss"),
                        modified = dirInfo.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
                    };
                }
                else
                {
                    return new { error = "Path does not exist" };
                }
            }
            catch (Exception ex)
            {
                return new { error = ex.Message };
            }
        }

        private Dictionary<string, object> GetSafeEnvironmentInfo()
        {
            var safeVars = new Dictionary<string, object>();
            
            // Only include non-sensitive environment variables
            var safeKeys = new[] {
                "COMPUTERNAME", "PROCESSOR_IDENTIFIER", "PROCESSOR_ARCHITECTURE",
                "NUMBER_OF_PROCESSORS", "OS", "PATHEXT", "TEMP", "TMP"
            };

            foreach (var key in safeKeys)
            {
                var value = Environment.GetEnvironmentVariable(key);
                if (!string.IsNullOrEmpty(value))
                {
                    safeVars[key] = value;
                }
            }

            return safeVars;
        }

        protected override async Task<ExtensionHealthResult> OnHealthCheckAsync()
        {
            try
            {
                // Perform basic health checks
                var canWriteTemp = CanWriteToTempDirectory();
                var memoryUsage = GC.GetTotalMemory(false);
                
                var isHealthy = canWriteTemp;
                var status = isHealthy ? "Healthy" : "Degraded";

                return new ExtensionHealthResult
                {
                    IsHealthy = isHealthy,
                    Status = status,
                    Issues = canWriteTemp ? new string[0] : new[] { "Temp directory access limited" }
                };
            }
            catch (Exception ex)
            {
                return new ExtensionHealthResult
                {
                    IsHealthy = false,
                    Status = "Unhealthy",
                    Issues = new[] { ex.Message }
                };
            }
        }

        private bool CanWriteToTempDirectory()
        {
            try
            {
                var tempFile = Path.GetTempFileName();
                File.WriteAllText(tempFile, "test");
                File.Delete(tempFile);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}