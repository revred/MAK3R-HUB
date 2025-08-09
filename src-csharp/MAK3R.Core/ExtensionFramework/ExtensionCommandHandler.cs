using System;
using System.Threading.Tasks;
using System.Text.Json;
using System.IO;
using System.Reflection;
using System.Linq;

namespace MAK3R.Core.ExtensionFramework
{
    /// <summary>
    /// Handles extension commands within the MAK3R-HUB CLI framework
    /// Integrates seamlessly with existing Program.cs command structure
    /// </summary>
    public static class ExtensionCommandHandler
    {
        private static ExtensionSafetyManager _safetyManager;
        private static bool _initialized = false;

        /// <summary>
        /// Initialize the extension system
        /// Called once during program startup
        /// </summary>
        public static async Task InitializeAsync(IPlatformAdapter platform)
        {
            try
            {
                _safetyManager = new ExtensionSafetyManager(platform);
                await LoadAvailableExtensionsAsync(platform);
                _initialized = true;
                
                await platform.WriteLineAsync("✅ Extension system initialized", ConsoleColor.Green);
            }
            catch (Exception ex)
            {
                await platform.WriteLineAsync($"⚠️ Extension system initialization failed: {ex.Message}", ConsoleColor.Yellow);
                _initialized = false;
            }
        }

        /// <summary>
        /// Handle extension commands from CLI
        /// Integrates with existing MAK3R-HUB command structure
        /// </summary>
        public static async Task<int> HandleExtensionCommandAsync(string[] args, IPlatformAdapter platform)
        {
            try
            {
                if (!_initialized)
                {
                    await InitializeAsync(platform);
                }

                if (!_initialized)
                {
                    var errorResult = new { success = false, error = "Extension system not available" };
                    Console.WriteLine($"RESULT:{JsonSerializer.Serialize(errorResult)}");
                    return 1;
                }

                // Parse command format: ext <extension-name> <command> [args...]
                if (args.Length < 3)
                {
                    await ShowExtensionHelp(platform);
                    return 1;
                }

                var extensionName = args[1];
                var command = args[2];
                var parameters = ParseCommandParameters(args.Skip(3).ToArray());

                // Execute with complete safety
                var jsonResult = await _safetyManager.ExecuteCommandSafelyAsync(extensionName, command, parameters);
                Console.WriteLine($"RESULT:{jsonResult}");
                
                // Parse success from JSON to return appropriate exit code
                try
                {
                    var result = JsonSerializer.Deserialize<JsonElement>(jsonResult);
                    var success = result.GetProperty("success").GetBoolean();
                    return success ? 0 : 1;
                }
                catch
                {
                    return 1; // Default to failure if we can't parse the result
                }
            }
            catch (Exception ex)
            {
                // Final safety net for any unforeseen errors
                var emergencyResult = new 
                { 
                    success = false, 
                    error = $"Extension command handler error: {ex.Message}",
                    errorCode = "HANDLER_ERROR"
                };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(emergencyResult)}");
                return 1;
            }
        }

        /// <summary>
        /// Handle extension listing command
        /// </summary>
        public static async Task<int> HandleListExtensionsAsync(IPlatformAdapter platform)
        {
            try
            {
                if (!_initialized)
                {
                    await InitializeAsync(platform);
                }

                var jsonResult = _safetyManager?.ListLoadedExtensions() ?? 
                    JsonSerializer.Serialize(new { success = false, error = "Extension system not available" });
                
                Console.WriteLine($"RESULT:{jsonResult}");
                return 0;
            }
            catch (Exception ex)
            {
                var errorResult = new { success = false, error = ex.Message };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(errorResult)}");
                return 1;
            }
        }

        /// <summary>
        /// Handle extension health check command
        /// </summary>
        public static async Task<int> HandleExtensionHealthAsync(string[] args, IPlatformAdapter platform)
        {
            try
            {
                if (!_initialized)
                {
                    await InitializeAsync(platform);
                }

                if (args.Length < 2)
                {
                    var errorResult = new { success = false, error = "Extension name required for health check" };
                    Console.WriteLine($"RESULT:{JsonSerializer.Serialize(errorResult)}");
                    return 1;
                }

                var extensionName = args[1];
                var jsonResult = await _safetyManager.GetExtensionHealthAsync(extensionName);
                Console.WriteLine($"RESULT:{jsonResult}");
                
                // Parse success from result
                try
                {
                    var result = JsonSerializer.Deserialize<JsonElement>(jsonResult);
                    var success = result.GetProperty("success").GetBoolean();
                    return success ? 0 : 1;
                }
                catch
                {
                    return 1;
                }
            }
            catch (Exception ex)
            {
                var errorResult = new { success = false, error = ex.Message };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(errorResult)}");
                return 1;
            }
        }

        #region Private Methods

        private static async Task LoadAvailableExtensionsAsync(IPlatformAdapter platform)
        {
            try
            {
                var extensionsPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "extensions");
                
                if (!Directory.Exists(extensionsPath))
                {
                    await platform.WriteLineAsync($"📁 Creating extensions directory: {extensionsPath}", ConsoleColor.Cyan);
                    Directory.CreateDirectory(extensionsPath);
                }

                // Load built-in extensions
                await LoadBuiltInExtensionsAsync(platform);
                
                // Future: Load external extension assemblies from extensions directory
                // await LoadExternalExtensionsAsync(extensionsPath, platform);
                
                await platform.WriteLineAsync("🔌 Extension loading complete", ConsoleColor.Green);
            }
            catch (Exception ex)
            {
                await platform.WriteLineAsync($"⚠️ Error loading extensions: {ex.Message}", ConsoleColor.Yellow);
            }
        }

        private static async Task LoadBuiltInExtensionsAsync(IPlatformAdapter platform)
        {
            try
            {
                // Load m3r-xt-nuxt extension
                var nuxtExtension = new M3rXtNuxtExtension();
                var config = new ExtensionConfiguration
                {
                    EnableLogging = true,
                    LogLevel = "INFO"
                };
                
                var loaded = await _safetyManager.LoadExtensionSafelyAsync("m3r-xt-nuxt", nuxtExtension, config);
                if (loaded)
                {
                    await platform.WriteLineAsync("✅ m3r-xt-nuxt extension loaded", ConsoleColor.Green);
                }
                else
                {
                    await platform.WriteLineAsync("❌ Failed to load m3r-xt-nuxt extension", ConsoleColor.Red);
                }

                // Future: Add other built-in extensions here
            }
            catch (Exception ex)
            {
                await platform.WriteLineAsync($"⚠️ Error loading built-in extensions: {ex.Message}", ConsoleColor.Yellow);
            }
        }

        private static ExtensionParameters ParseCommandParameters(string[] args)
        {
            var parameters = new ExtensionParameters();
            
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i].StartsWith("--"))
                {
                    var key = args[i].Substring(2);
                    
                    if (i + 1 < args.Length && !args[i + 1].StartsWith("--"))
                    {
                        parameters.Arguments[key] = args[i + 1];
                        i++; // Skip the value
                    }
                    else
                    {
                        parameters.Arguments[key] = true; // Flag parameter
                    }
                }
            }
            
            // Set special parameters
            if (parameters.Arguments.ContainsKey("verbose"))
            {
                parameters.Verbose = true;
            }
            
            if (parameters.Arguments.TryGetValue("timeout", out var timeoutValue))
            {
                if (int.TryParse(timeoutValue.ToString(), out var timeout))
                {
                    parameters.TimeoutSeconds = timeout;
                }
            }
            
            if (parameters.Arguments.TryGetValue("working-dir", out var workingDirValue))
            {
                parameters.WorkingDirectory = workingDirValue.ToString();
            }
            
            return parameters;
        }

        private static async Task ShowExtensionHelp(IPlatformAdapter platform)
        {
            await platform.WriteLineAsync("🔌 MAK3R-HUB Extension Commands", ConsoleColor.Cyan);
            await platform.WriteLineAsync("", ConsoleColor.White);
            await platform.WriteLineAsync("Usage: MAK3R-HUB ext <extension> <command> [options]", ConsoleColor.White);
            await platform.WriteLineAsync("       MAK3R-HUB ext-list", ConsoleColor.White);
            await platform.WriteLineAsync("       MAK3R-HUB ext-health <extension>", ConsoleColor.White);
            await platform.WriteLineAsync("", ConsoleColor.White);
            await platform.WriteLineAsync("Examples:", ConsoleColor.Yellow);
            await platform.WriteLineAsync("  MAK3R-HUB ext m3r-xt-nuxt discover-projects", ConsoleColor.White);
            await platform.WriteLineAsync("  MAK3R-HUB ext m3r-xt-nuxt smart-start --timeout 30", ConsoleColor.White);
            await platform.WriteLineAsync("  MAK3R-HUB ext m3r-xt-nuxt kill-servers", ConsoleColor.White);
            await platform.WriteLineAsync("  MAK3R-HUB ext-list", ConsoleColor.White);
            await platform.WriteLineAsync("  MAK3R-HUB ext-health m3r-xt-nuxt", ConsoleColor.White);
            await platform.WriteLineAsync("", ConsoleColor.White);
            await platform.WriteLineAsync("Options:", ConsoleColor.Yellow);
            await platform.WriteLineAsync("  --timeout <seconds>    Command timeout (default: 300)", ConsoleColor.White);
            await platform.WriteLineAsync("  --working-dir <path>   Working directory", ConsoleColor.White);
            await platform.WriteLineAsync("  --verbose              Enable verbose output", ConsoleColor.White);
        }

        #endregion
    }
}