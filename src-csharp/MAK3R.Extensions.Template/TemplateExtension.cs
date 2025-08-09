using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MAK3R.Core.ExtensionFramework;

namespace MAK3R.Extensions.Template
{
    /// <summary>
    /// Template C# Extension for MAK3R-HUB
    /// Example implementation showing MCP tool integration patterns
    /// </summary>
    public class TemplateExtension : MCPExtensionBase
    {
        public TemplateExtension() : base(
            name: "template-extension",
            version: "1.0.0", 
            description: "Template C# extension demonstrating MCP integration patterns",
            author: "MAK3R Team"
        )
        {
        }

        public override IEnumerable<string> AvailableCommands => new[]
        {
            "hello",
            "echo",
            "system-info",
            "validate-input"
        };

        public override IEnumerable<MCPToolDefinition> MCPTools => new[]
        {
            new MCPToolDefinition
            {
                Name = "m3r__template__hello",
                Description = "Simple hello world command",
                Category = "example",
                TimeoutSeconds = 10,
                InputSchema = new
                {
                    type = "object",
                    properties = new
                    {
                        name = new { type = "string", description = "Name to greet" }
                    }
                }
            },
            new MCPToolDefinition
            {
                Name = "m3r__template__echo", 
                Description = "Echo back the provided message",
                Category = "example",
                TimeoutSeconds = 5,
                InputSchema = new
                {
                    type = "object",
                    properties = new
                    {
                        message = new { type = "string", description = "Message to echo" }
                    },
                    required = new[] { "message" }
                }
            },
            new MCPToolDefinition
            {
                Name = "m3r__template__system_info",
                Description = "Get system information",
                Category = "diagnostics",
                TimeoutSeconds = 15,
                CacheResults = true,
                InputSchema = new
                {
                    type = "object",
                    properties = new { }
                }
            },
            new MCPToolDefinition
            {
                Name = "m3r__template__validate_input",
                Description = "Validate and process user input",
                Category = "validation",
                TimeoutSeconds = 30,
                InputSchema = new
                {
                    type = "object",
                    properties = new
                    {
                        data = new { type = "string", description = "Data to validate" },
                        rules = new 
                        { 
                            type = "array",
                            items = new { type = "string" },
                            description = "Validation rules to apply"
                        }
                    },
                    required = new[] { "data" }
                }
            }
        };

        protected override async Task OnInitializeAsync()
        {
            await LogInfoAsync("Template extension initializing...");
            
            // Initialize any resources, connections, etc.
            // This is where you'd set up databases, file systems, external APIs, etc.
            
            await LogInfoAsync("Template extension initialized successfully");
        }

        public override async Task<ExtensionResult> ExecuteCommandAsync(string command, ExtensionParameters parameters)
        {
            var startTime = DateTime.UtcNow;
            
            try
            {
                await LogInfoAsync($"Executing command: {command}");

                var result = command switch
                {
                    "hello" => await HandleHelloCommand(parameters),
                    "echo" => await HandleEchoCommand(parameters),
                    "system-info" => await HandleSystemInfoCommand(parameters),
                    "validate-input" => await HandleValidateInputCommand(parameters),
                    _ => ExtensionResult.ErrorResult($"Unknown command: {command}", "UNKNOWN_COMMAND")
                };

                result.ExecutionTime = DateTime.UtcNow - startTime;
                return result;
            }
            catch (Exception ex)
            {
                await LogErrorAsync($"Command execution failed: {ex.Message}");
                
                return new ExtensionResult
                {
                    Success = false,
                    Error = ex.Message,
                    ErrorCode = "EXECUTION_ERROR",
                    ExecutionTime = DateTime.UtcNow - startTime
                };
            }
        }

        private async Task<ExtensionResult> HandleHelloCommand(ExtensionParameters parameters)
        {
            var name = parameters.GetArgument<string>("name", "World");
            var message = $"Hello, {name}! Greetings from MAK3R-HUB C# Extension.";

            await LogInfoAsync($"Generated greeting: {message}");

            return ExtensionResult.SuccessResult(message, new Dictionary<string, object>
            {
                ["greeting"] = message,
                ["name"] = name,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC")
            });
        }

        private async Task<ExtensionResult> HandleEchoCommand(ExtensionParameters parameters)
        {
            var message = parameters.GetArgument<string>("message");
            
            if (string.IsNullOrEmpty(message))
            {
                return ExtensionResult.ErrorResult("Message parameter is required", "MISSING_PARAMETER");
            }

            await LogInfoAsync($"Echoing message: {message}");

            return ExtensionResult.SuccessResult($"Echo: {message}", new Dictionary<string, object>
            {
                ["original"] = message,
                ["echo"] = $"Echo: {message}",
                ["length"] = message.Length
            });
        }

        private async Task<ExtensionResult> HandleSystemInfoCommand(ExtensionParameters parameters)
        {
            await LogInfoAsync("Gathering system information...");

            var systemInfo = new Dictionary<string, object>
            {
                ["platform"] = Environment.OSVersion.Platform.ToString(),
                ["osVersion"] = Environment.OSVersion.VersionString,
                ["machineName"] = Environment.MachineName,
                ["userName"] = Environment.UserName,
                ["processorCount"] = Environment.ProcessorCount,
                ["workingSet"] = Environment.WorkingSet,
                ["dotNetVersion"] = Environment.Version.ToString(),
                ["currentDirectory"] = Environment.CurrentDirectory,
                ["timestamp"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC")
            };

            return ExtensionResult.SuccessResult("System information gathered", systemInfo);
        }

        private async Task<ExtensionResult> HandleValidateInputCommand(ExtensionParameters parameters)
        {
            var data = parameters.GetArgument<string>("data");
            var rules = parameters.GetArgument<string[]>("rules", new string[0]);

            if (string.IsNullOrEmpty(data))
            {
                return ExtensionResult.ErrorResult("Data parameter is required", "MISSING_PARAMETER");
            }

            await LogInfoAsync($"Validating data with {rules.Length} rules");

            var validationResults = new List<string>();
            var isValid = true;

            // Example validation rules
            foreach (var rule in rules)
            {
                switch (rule.ToLower())
                {
                    case "not-empty":
                        if (string.IsNullOrEmpty(data))
                        {
                            validationResults.Add("Data cannot be empty");
                            isValid = false;
                        }
                        break;
                        
                    case "min-length-5":
                        if (data.Length < 5)
                        {
                            validationResults.Add("Data must be at least 5 characters long");
                            isValid = false;
                        }
                        break;
                        
                    case "no-numbers":
                        if (data.Any(char.IsDigit))
                        {
                            validationResults.Add("Data cannot contain numbers");
                            isValid = false;
                        }
                        break;
                        
                    default:
                        validationResults.Add($"Unknown validation rule: {rule}");
                        break;
                }
            }

            if (isValid && validationResults.Count == 0)
            {
                validationResults.Add("All validations passed");
            }

            return ExtensionResult.SuccessResult(
                isValid ? "Validation passed" : "Validation failed",
                new Dictionary<string, object>
                {
                    ["isValid"] = isValid,
                    ["results"] = validationResults,
                    ["dataLength"] = data.Length,
                    ["rulesApplied"] = rules.Length
                });
        }

        protected override async Task<ExtensionHealthResult> OnHealthCheckAsync()
        {
            // Perform extension-specific health checks
            var dependencies = new Dictionary<string, bool>
            {
                ["filesystem"] = true, // Check if we can access filesystem
                ["memory"] = Environment.WorkingSet < 100 * 1024 * 1024, // Check memory usage < 100MB
                ["configuration"] = _configuration != null
            };

            var issues = new List<string>();
            foreach (var dep in dependencies)
            {
                if (!dep.Value)
                {
                    issues.Add($"{dep.Key} is not healthy");
                }
            }

            return new ExtensionHealthResult
            {
                IsHealthy = issues.Count == 0,
                Status = issues.Count == 0 ? "Healthy" : "Issues Detected",
                Dependencies = dependencies,
                Issues = issues.ToArray(),
                ResponseTime = TimeSpan.FromMilliseconds(10) // Mock response time
            };
        }

        protected override async Task OnShutdownAsync()
        {
            await LogInfoAsync("Template extension shutting down...");
            
            // Cleanup resources, close connections, etc.
            
            await LogInfoAsync("Template extension shutdown complete");
        }
    }
}