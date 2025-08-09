using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Threading.Tasks;

namespace MAK3R.Core.ExtensionFramework
{
    /// <summary>
    /// C# Extension Discovery Service
    /// Scans for and loads C# extension assemblies
    /// </summary>
    public class ExtensionDiscovery
    {
        private readonly IPlatformAdapter _platform;
        private readonly List<string> _searchPaths;
        private readonly Dictionary<string, ExtensionAssemblyInfo> _discoveredExtensions;

        public ExtensionDiscovery(IPlatformAdapter platform)
        {
            _platform = platform ?? throw new ArgumentNullException(nameof(platform));
            _searchPaths = new List<string>();
            _discoveredExtensions = new Dictionary<string, ExtensionAssemblyInfo>();
            
            // Add default search paths
            AddDefaultSearchPaths();
        }

        /// <summary>
        /// Discover all available C# extensions
        /// </summary>
        public async Task<ExtensionDiscoveryResult> DiscoverExtensionsAsync()
        {
            var result = new ExtensionDiscoveryResult
            {
                DiscoveredExtensions = new List<ExtensionAssemblyInfo>(),
                Errors = new List<string>()
            };

            try
            {
                await _platform.WriteLineAsync("🔍 Starting C# extension discovery...", ConsoleColor.Blue);

                // Clear previous discoveries
                _discoveredExtensions.Clear();

                // Scan each search path
                foreach (var searchPath in _searchPaths)
                {
                    if (Directory.Exists(searchPath))
                    {
                        await ScanDirectoryAsync(searchPath, result);
                    }
                    else
                    {
                        result.Errors.Add($"Search path not found: {searchPath}");
                    }
                }

                result.DiscoveredExtensions = _discoveredExtensions.Values.ToList();
                
                await _platform.WriteLineAsync(
                    $"✅ Extension discovery completed: {result.DiscoveredExtensions.Count} extensions found", 
                    ConsoleColor.Green);

            }
            catch (Exception ex)
            {
                result.Errors.Add($"Extension discovery failed: {ex.Message}");
                await _platform.WriteLineAsync($"❌ Extension discovery error: {ex.Message}", ConsoleColor.Red);
            }

            return result;
        }

        /// <summary>
        /// Load a specific extension from assembly
        /// </summary>
        public async Task<IExtension?> LoadExtensionAsync(string extensionName)
        {
            try
            {
                if (!_discoveredExtensions.ContainsKey(extensionName))
                {
                    // Try to discover first
                    var discovery = await DiscoverExtensionsAsync();
                    if (!_discoveredExtensions.ContainsKey(extensionName))
                    {
                        await _platform.WriteLineAsync($"❌ Extension '{extensionName}' not found", ConsoleColor.Red);
                        return null;
                    }
                }

                var extensionInfo = _discoveredExtensions[extensionName];
                return await LoadExtensionFromAssemblyAsync(extensionInfo);
            }
            catch (Exception ex)
            {
                await _platform.WriteLineAsync($"❌ Failed to load extension '{extensionName}': {ex.Message}", ConsoleColor.Red);
                return null;
            }
        }

        /// <summary>
        /// Add custom search path for extensions
        /// </summary>
        public void AddSearchPath(string path)
        {
            if (!string.IsNullOrEmpty(path) && !_searchPaths.Contains(path))
            {
                _searchPaths.Add(path);
            }
        }

        /// <summary>
        /// Get all discovered extension information
        /// </summary>
        public IReadOnlyList<ExtensionAssemblyInfo> GetDiscoveredExtensions()
        {
            return _discoveredExtensions.Values.ToList();
        }

        #region Private Methods

        private void AddDefaultSearchPaths()
        {
            var baseDir = AppDomain.CurrentDomain.BaseDirectory;
            
            // Standard extension directories
            _searchPaths.Add(Path.Combine(baseDir, "extensions"));
            _searchPaths.Add(Path.Combine(baseDir, "../MAK3R.Extensions.Template"));
            _searchPaths.Add(Path.Combine(baseDir, "../MAK3R.Extensions.Example"));
            _searchPaths.Add(Path.Combine(Directory.GetCurrentDirectory(), "src-csharp", "MAK3R.Extensions.Template"));
            _searchPaths.Add(Path.Combine(Directory.GetCurrentDirectory(), "src-csharp", "MAK3R.Extensions.Example"));
            
            // Development paths
            var devPaths = new[]
            {
                Path.Combine(baseDir, "../../MAK3R.Extensions.Template"),
                Path.Combine(baseDir, "../../MAK3R.Extensions.Example"),
                Path.Combine(baseDir, "../../../src-csharp/MAK3R.Extensions.Template"),
                Path.Combine(baseDir, "../../../src-csharp/MAK3R.Extensions.Example"),
            };
            
            foreach (var path in devPaths)
            {
                if (Directory.Exists(path))
                {
                    _searchPaths.Add(path);
                }
            }
        }

        private async Task ScanDirectoryAsync(string directory, ExtensionDiscoveryResult result)
        {
            try
            {
                await _platform.WriteLineAsync($"📁 Scanning directory: {directory}", ConsoleColor.Cyan);

                // Look for extension.json files first
                var jsonFiles = Directory.GetFiles(directory, "extension.json", SearchOption.AllDirectories);
                
                foreach (var jsonFile in jsonFiles)
                {
                    await ProcessExtensionJsonAsync(jsonFile, result);
                }

                // Also scan for .dll files that might be extensions
                var dllFiles = Directory.GetFiles(directory, "*.dll", SearchOption.AllDirectories);
                
                foreach (var dllFile in dllFiles)
                {
                    await ProcessAssemblyAsync(dllFile, result);
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Error scanning directory {directory}: {ex.Message}");
            }
        }

        private async Task ProcessExtensionJsonAsync(string jsonFile, ExtensionDiscoveryResult result)
        {
            try
            {
                var jsonContent = await File.ReadAllTextAsync(jsonFile);
                var extensionJson = JsonSerializer.Deserialize<ExtensionJsonFile>(jsonContent);

                if (extensionJson?.Extension?.Name != null)
                {
                    var extensionDir = Path.GetDirectoryName(jsonFile)!;
                    var assemblyPath = FindAssemblyInDirectory(extensionDir, extensionJson.Extension.Name);

                    if (!string.IsNullOrEmpty(assemblyPath))
                    {
                        var extensionInfo = new ExtensionAssemblyInfo
                        {
                            Name = extensionJson.Extension.Name,
                            Version = extensionJson.Extension.Version ?? "1.0.0",
                            Description = extensionJson.Extension.Description ?? "",
                            Author = extensionJson.Extension.Author ?? "Unknown",
                            AssemblyPath = assemblyPath,
                            ConfigurationPath = jsonFile,
                            JsonConfiguration = extensionJson,
                            DiscoveryMethod = "extension.json"
                        };

                        if (!_discoveredExtensions.ContainsKey(extensionInfo.Name))
                        {
                            _discoveredExtensions[extensionInfo.Name] = extensionInfo;
                            await _platform.WriteLineAsync($"✅ Found extension: {extensionInfo.Name} v{extensionInfo.Version}", ConsoleColor.Green);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                result.Errors.Add($"Error processing extension.json {jsonFile}: {ex.Message}");
            }
        }

        private async Task ProcessAssemblyAsync(string assemblyPath, ExtensionDiscoveryResult result)
        {
            try
            {
                // Skip if already discovered via extension.json
                var fileName = Path.GetFileNameWithoutExtension(assemblyPath);
                if (_discoveredExtensions.Values.Any(e => Path.GetFileNameWithoutExtension(e.AssemblyPath) == fileName))
                {
                    return;
                }

                // Try to inspect the assembly for extension types
                var assembly = Assembly.LoadFrom(assemblyPath);
                var extensionTypes = assembly.GetTypes()
                    .Where(t => !t.IsAbstract && typeof(IExtension).IsAssignableFrom(t))
                    .ToList();

                if (extensionTypes.Any())
                {
                    // Create basic info from first extension type found
                    var extensionType = extensionTypes.First();
                    var extensionInfo = new ExtensionAssemblyInfo
                    {
                        Name = extensionType.Name.Replace("Extension", "").ToLowerInvariant(),
                        Version = assembly.GetName().Version?.ToString() ?? "1.0.0",
                        Description = $"Extension from {Path.GetFileName(assemblyPath)}",
                        Author = "Unknown",
                        AssemblyPath = assemblyPath,
                        DiscoveryMethod = "assembly-scan",
                        ExtensionTypeName = extensionType.FullName!
                    };

                    if (!_discoveredExtensions.ContainsKey(extensionInfo.Name))
                    {
                        _discoveredExtensions[extensionInfo.Name] = extensionInfo;
                        await _platform.WriteLineAsync($"✅ Found extension assembly: {extensionInfo.Name}", ConsoleColor.Green);
                    }
                }
            }
            catch (Exception ex)
            {
                // Silently ignore - many DLLs won't be extensions
                result.Errors.Add($"Could not inspect assembly {assemblyPath}: {ex.Message}");
            }
        }

        private string? FindAssemblyInDirectory(string directory, string extensionName)
        {
            // Common patterns for extension assemblies
            var patterns = new[]
            {
                $"MAK3R.Extensions.{extensionName}.dll",
                $"{extensionName}.dll",
                $"MAK3R.{extensionName}.dll",
            };

            foreach (var pattern in patterns)
            {
                var candidates = new[]
                {
                    Path.Combine(directory, pattern),
                    Path.Combine(directory, "bin", "Debug", "net9.0", pattern),
                    Path.Combine(directory, "bin", "Release", "net9.0", pattern),
                };

                foreach (var candidate in candidates)
                {
                    if (File.Exists(candidate))
                    {
                        return candidate;
                    }
                }
            }

            return null;
        }

        private async Task<IExtension?> LoadExtensionFromAssemblyAsync(ExtensionAssemblyInfo extensionInfo)
        {
            try
            {
                var assembly = Assembly.LoadFrom(extensionInfo.AssemblyPath);
                Type? extensionType = null;

                if (!string.IsNullOrEmpty(extensionInfo.ExtensionTypeName))
                {
                    extensionType = assembly.GetType(extensionInfo.ExtensionTypeName);
                }
                else
                {
                    // Find first extension type
                    extensionType = assembly.GetTypes()
                        .FirstOrDefault(t => !t.IsAbstract && typeof(IExtension).IsAssignableFrom(t));
                }

                if (extensionType != null)
                {
                    var instance = Activator.CreateInstance(extensionType) as IExtension;
                    if (instance != null)
                    {
                        await _platform.WriteLineAsync($"✅ Loaded extension: {extensionInfo.Name}", ConsoleColor.Green);
                        return instance;
                    }
                }

                await _platform.WriteLineAsync($"❌ No valid extension type found in {extensionInfo.AssemblyPath}", ConsoleColor.Red);
                return null;
            }
            catch (Exception ex)
            {
                await _platform.WriteLineAsync($"❌ Failed to load extension from {extensionInfo.AssemblyPath}: {ex.Message}", ConsoleColor.Red);
                return null;
            }
        }

        #endregion
    }

    /// <summary>
    /// Information about a discovered extension assembly
    /// </summary>
    public class ExtensionAssemblyInfo
    {
        public string Name { get; set; } = "";
        public string Version { get; set; } = "";
        public string Description { get; set; } = "";
        public string Author { get; set; } = "";
        public string AssemblyPath { get; set; } = "";
        public string? ConfigurationPath { get; set; }
        public string DiscoveryMethod { get; set; } = "";
        public string? ExtensionTypeName { get; set; }
        public ExtensionJsonFile? JsonConfiguration { get; set; }
        public DateTime DiscoveredAt { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Result of extension discovery operation
    /// </summary>
    public class ExtensionDiscoveryResult
    {
        public List<ExtensionAssemblyInfo> DiscoveredExtensions { get; set; } = new();
        public List<string> Errors { get; set; } = new();
        public DateTime DiscoveryTime { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Complete extension.json file structure
    /// </summary>
    public class ExtensionJsonFile
    {
        public ExtensionJsonConfig Extension { get; set; } = new();
        public Dictionary<string, object> Configuration { get; set; } = new();
        public Dictionary<string, object> Tools { get; set; } = new();
        public Dictionary<string, string> Dependencies { get; set; } = new();
        public Dictionary<string, object> Security { get; set; } = new();
    }

    /// <summary>
    /// Extension configuration from extension.json
    /// </summary>
    public class ExtensionJsonConfig
    {
        public string Name { get; set; } = "";
        public string Version { get; set; } = "";
        public string Description { get; set; } = "";
        public string Author { get; set; } = "";
        public bool Enabled { get; set; } = true;
        public int Priority { get; set; } = 100;
        public string Category { get; set; } = "";
    }
}