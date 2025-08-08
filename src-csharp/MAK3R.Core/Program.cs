using System;
using System.Threading.Tasks;
using System.Text.Json;
using System.Linq;
using System.Collections.Generic;

namespace MAK3R.Core
{
    /// <summary>
    /// MAK3R-HUB Automation Engine Entry Point
    /// Universal Claude Code force multiplier for website development
    /// </summary>
    class Program
    {
        static async Task<int> Main(string[] args)
        {
            try
            {
                if (args.Length == 0)
                {
                    ShowHelp();
                    return 0;
                }

                var command = args[0].ToLower();
                var platform = CreatePlatformAdapter();

                switch (command)
                {
                    case "create":
                        return await HandleCreateCommand(args, platform);
                    case "dev":
                        return await HandleDevCommand(args, platform);
                    case "deploy":
                        return await HandleDeployCommand(args, platform);
                    case "doctor":
                        return await HandleDoctorCommand(platform);
                    case "help":
                    case "--help":
                    case "-h":
                        ShowHelp();
                        return 0;
                    default:
                        Console.WriteLine($"❌ Unknown command: {command}");
                        ShowHelp();
                        return 1;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error: {ex.Message}");
                return 1;
            }
        }

        private static async Task<int> HandleCreateCommand(string[] args, IPlatformAdapter platform)
        {
            if (args.Length < 2)
            {
                Console.WriteLine("❌ Project name required");
                Console.WriteLine("Usage: MAK3R-HUB create <project-name> [--type <type>] [--framework <framework>]");
                return 1;
            }

            var name = args[1];
            var type = GetArgValue(args, "--type", "landing-page");
            var framework = GetArgValue(args, "--framework", "vue-nuxt");
            var output = GetArgValue(args, "--output", null);

            try
            {
                var automation = new WebsiteAutomation(platform);

                await platform.WriteLineAsync($"🚀 MAK3R-HUB Creating {type} website: {name}", ConsoleColor.Blue);

                var request = new WebsiteCreationRequest
                {
                    Name = name,
                    Type = type,
                    Framework = framework,
                    OutputPath = output
                };

                var project = await automation.CreateWebsiteAsync(request);

                await platform.WriteLineAsync($"✅ Website '{name}' created successfully!", ConsoleColor.Green);
                await platform.WriteLineAsync($"📁 Location: {project.Path}", ConsoleColor.Cyan);
                await platform.WriteLineAsync($"🚀 Next: cd {name} && MAK3R-HUB dev", ConsoleColor.Yellow);

                // Output project info as JSON for CLI consumption
                var result = new
                {
                    success = true,
                    project = new
                    {
                        name = project.Name,
                        type = project.Type,
                        framework = project.Framework,
                        path = project.Path,
                        devServerPort = project.DevServerPort
                    }
                };

                var jsonOptions = new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(result, jsonOptions)}");
                return 0;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"❌ Error creating website: {ex.Message}");
                var errorResult = new { success = false, error = ex.Message };
                var jsonOptions = new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(errorResult, jsonOptions)}");
                return 1;
            }
        }

        private static async Task<int> HandleDevCommand(string[] args, IPlatformAdapter platform)
        {
            var projectPath = GetArgValue(args, "--project", ".");
            var port = GetArgValue(args, "--port", "3000");

            try
            {
                var automation = new WebsiteAutomation(platform);

                await platform.WriteLineAsync($"⚡ Starting development server on port {port}...", ConsoleColor.Blue);

                var result = await automation.StartDevelopmentServerAsync(projectPath);

                if (result.Success)
                {
                    await platform.WriteLineAsync("✅ Development server started successfully!", ConsoleColor.Green);
                    await platform.WriteLineAsync($"🌐 Local: http://localhost:{port}", ConsoleColor.Cyan);
                }
                else
                {
                    await platform.WriteLineAsync($"❌ Failed to start server: {result.Error}", ConsoleColor.Red);
                }

                var jsonResult = new { success = result.Success, output = result.Output, error = result.Error };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(jsonResult)}");
                return result.Success ? 0 : 1;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"❌ Error starting development server: {ex.Message}");
                var errorResult = new { success = false, error = ex.Message };
                var jsonOptions = new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(errorResult, jsonOptions)}");
                return 1;
            }
        }

        private static async Task<int> HandleDeployCommand(string[] args, IPlatformAdapter platform)
        {
            var projectPath = GetArgValue(args, "--project", ".");
            var deployPlatform = GetArgValue(args, "--platform", "auto");
            var domain = GetArgValue(args, "--domain", null);

            try
            {
                var automation = new WebsiteAutomation(platform);

                await platform.WriteLineAsync($"🚀 Deploying to {deployPlatform}...", ConsoleColor.Blue);

                var result = await automation.DeployWebsiteAsync(projectPath, deployPlatform);

                if (result.Success)
                {
                    await platform.WriteLineAsync("✅ Deployment successful!", ConsoleColor.Green);
                    await platform.WriteLineAsync($"🌐 Live URL: {result.Url}", ConsoleColor.Cyan);
                }
                else
                {
                    await platform.WriteLineAsync($"❌ Deployment failed: {result.Message}", ConsoleColor.Red);
                }

                var jsonResult = new
                {
                    success = result.Success,
                    url = result.Url,
                    platform = result.Platform,
                    message = result.Message
                };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(jsonResult)}");
                return result.Success ? 0 : 1;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"❌ Error during deployment: {ex.Message}");
                var errorResult = new { success = false, error = ex.Message };
                var jsonOptions = new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(errorResult, jsonOptions)}");
                return 1;
            }
        }

        private static async Task<int> HandleDoctorCommand(IPlatformAdapter platform)
        {
            try
            {
                await platform.WriteLineAsync("🔍 MAK3R-HUB System Health Check", ConsoleColor.Blue);

                var checks = new Dictionary<string, bool>
                {
                    ["Node.js"] = await platform.IsNodeAvailableAsync(),
                    ["npm"] = await platform.IsNpmAvailableAsync(),
                    [".NET"] = await platform.IsDotNetAvailableAsync()
                };

                foreach (var check in checks)
                {
                    var status = check.Value ? "✅" : "❌";
                    var color = check.Value ? ConsoleColor.Green : ConsoleColor.Red;
                    await platform.WriteLineAsync($"{status} {check.Key}: {(check.Value ? "Available" : "Not Found")}", color);
                }

                var allHealthy = checks.Values.All(v => v);
                var overallStatus = allHealthy ? "🎯 System Status: Ready for development!" : "⚠️  System Status: Issues detected";
                var overallColor = allHealthy ? ConsoleColor.Green : ConsoleColor.Yellow;

                await platform.WriteLineAsync($"\n{overallStatus}", overallColor);

                var result = new { success = allHealthy, checks = checks };
                var jsonOptions = new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(result, jsonOptions)}");
                return allHealthy ? 0 : 1;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"❌ Error during health check: {ex.Message}");
                var errorResult = new { success = false, error = ex.Message };
                var jsonOptions = new JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                    WriteIndented = false
                };
                Console.WriteLine($"RESULT:{JsonSerializer.Serialize(errorResult, jsonOptions)}");
                return 1;
            }
        }

        private static void ShowHelp()
        {
            Console.WriteLine("🚀 MAK3R-HUB: Universal Claude Code Force Multiplier");
            Console.WriteLine("Create professional websites 10x faster\n");
            Console.WriteLine("Usage: MAK3R-HUB <command> [options]\n");
            Console.WriteLine("Commands:");
            Console.WriteLine("  create <name>     Create a new website project");
            Console.WriteLine("    --type          Website type (landing-page|ecommerce|portfolio|blog|saas)");
            Console.WriteLine("    --framework     Framework (react-next|vue-nuxt|svelte-kit|angular)");
            Console.WriteLine("    --output        Output directory");
            Console.WriteLine();
            Console.WriteLine("  dev               Start development server");
            Console.WriteLine("    --port          Port number (default: 3000)");
            Console.WriteLine("    --project       Project path (default: .)");
            Console.WriteLine();
            Console.WriteLine("  deploy            Deploy website to production");
            Console.WriteLine("    --platform      Deployment platform (vercel|netlify|auto)");
            Console.WriteLine("    --project       Project path (default: .)");
            Console.WriteLine("    --domain        Custom domain");
            Console.WriteLine();
            Console.WriteLine("  doctor            Check system health and requirements");
            Console.WriteLine();
            Console.WriteLine("Examples:");
            Console.WriteLine("  MAK3R-HUB create MyLandingPage --type landing-page");
            Console.WriteLine("  MAK3R-HUB create MyStore --type ecommerce --framework react-next");
            Console.WriteLine("  MAK3R-HUB dev --port 3001");
            Console.WriteLine("  MAK3R-HUB deploy --platform vercel");
        }

        private static string GetArgValue(string[] args, string argName, string defaultValue)
        {
            for (int i = 0; i < args.Length - 1; i++)
            {
                if (args[i] == argName)
                {
                    return args[i + 1];
                }
            }
            return defaultValue;
        }

        private static IPlatformAdapter CreatePlatformAdapter()
        {
            // For now, always return Windows adapter
            // In the future, detect platform and return appropriate adapter
            return new WindowsPlatformAdapter();
        }
    }
}