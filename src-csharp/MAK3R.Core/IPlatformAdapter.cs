using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace MAK3R.Core
{
    /// <summary>
    /// Platform abstraction interface for cross-platform operations
    /// Extracted from SharpUtility patterns, designed for website development automation
    /// </summary>
    public interface IPlatformAdapter
    {
        // File System Operations
        Task<bool> FileExistsAsync(string path);
        Task<bool> DirectoryExistsAsync(string path);
        Task CreateDirectoryAsync(string path);
        Task CopyFileAsync(string source, string destination);
        Task DeleteFileAsync(string path);
        Task DeleteDirectoryAsync(string path, bool recursive = false);
        Task<string> ReadFileAsync(string path);
        Task WriteFileAsync(string path, string content);

        // Process Management
        Task<ProcessResult> ExecuteCommandAsync(string command, string arguments = "", string workingDirectory = "");
        Task<ProcessResult> StartWebServerAsync(string framework, string projectPath, int port = 3000);
        Task<bool> IsPortInUseAsync(int port);
        Task KillProcessByPortAsync(int port);
        Task<ProcessInfo[]> GetRunningProcessesAsync();
        Task<ProcessInfo[]> GetWebServerProcessesAsync();

        // Console Operations (Safe for CI/CD)
        Task ClearConsoleAsync();
        Task WriteLineAsync(string message, ConsoleColor color = ConsoleColor.White);
        Task<string> ReadLineAsync();
        bool IsInteractiveSession { get; }

        // Website Development Specific
        Task<bool> IsNpmAvailableAsync();
        Task<bool> IsNodeAvailableAsync();
        Task<bool> IsDotNetAvailableAsync();
        Task<string> DetectPackageManagerAsync(string projectPath);
        Task<string> DetectWebFrameworkAsync(string projectPath);
        
        // Deployment Operations
        Task<DeploymentResult> DeployToVercelAsync(string projectPath, Dictionary<string, string> config);
        Task<DeploymentResult> DeployToNetlifyAsync(string projectPath, Dictionary<string, string> config);
        Task<bool> ConfigureDomainAsync(string platform, string domain, Dictionary<string, string> config);
    }

    /// <summary>
    /// Process execution result
    /// </summary>
    public class ProcessResult
    {
        public int ExitCode { get; set; }
        public string Output { get; set; } = string.Empty;
        public string Error { get; set; } = string.Empty;
        public bool Success => ExitCode == 0;
        public TimeSpan Duration { get; set; }
    }

    /// <summary>
    /// Running process information
    /// </summary>
    public class ProcessInfo
    {
        public int ProcessId { get; set; }
        public string ProcessName { get; set; } = string.Empty;
        public string CommandLine { get; set; } = string.Empty;
        public int Port { get; set; }
        public bool IsWebServer { get; set; }
        public string Framework { get; set; } = string.Empty;
    }

    /// <summary>
    /// Deployment result information
    /// </summary>
    public class DeploymentResult
    {
        public bool Success { get; set; }
        public string Url { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string DeploymentId { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public Dictionary<string, string> Metadata { get; set; } = new();
    }
}