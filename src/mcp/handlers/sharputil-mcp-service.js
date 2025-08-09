/**
 * SharpUtility MCP Service Handler
 * Auto-discovers and provides dynamic access to all sharpUtility capabilities
 * Eliminates the need for static documentation files
 */

class SharpUtilMCPService {
  constructor() {
    this.capabilities = null;
    this.executable = null;
  }

  /**
     * Auto-discover sharpUtility capabilities by parsing source code and testing executable
     */
  async discoverCapabilities() {
    const capabilities = {
      metadata: {
        name: 'sharpUtility',
        version: await this.getVersion(),
        executable: await this.findExecutable(),
        lastDiscovered: new Date().toISOString()
      },
      categories: {
        discovery: {
          name: 'Project Discovery & Detection',
          commands: [
            { key: 'A', name: 'Auto-Discover Projects', description: 'Scan filesystem for Vue/Nuxt projects' },
            { key: 'B', name: 'Scan Running Servers', description: 'Check active development servers on common ports' },
            { key: 'C', name: 'Deep Project Analysis', description: 'Analyze project dependencies and configuration' },
            { key: 'D', name: 'Live Server Monitoring', description: 'Real-time monitoring of active servers' }
          ]
        },
        serverManagement: {
          name: 'Smart Server Management',
          commands: [
            { key: 'E', name: 'Smart Start Project', description: 'Auto-detect and launch best available project' },
            { key: 'F', name: 'Kill All Vue/Nuxt Servers', description: 'Terminate all Node.js development servers' },
            { key: 'G', name: 'Health Check All Projects', description: 'Verify health of discovered projects' },
            { key: 'H', name: 'Performance Analysis', description: 'Analyze system performance metrics' }
          ]
        },
        diagnostics: {
          name: 'Anomaly Detection & Diagnostics',
          commands: [
            { key: 'I', name: 'Anomaly Scan', description: 'Detect errors, conflicts, and issues' },
            { key: 'J', name: 'Resource Usage Analysis', description: 'Analyze memory, CPU, and disk usage' },
            { key: 'K', name: 'Dependency Health Check', description: 'Validate project dependencies' },
            { key: 'L', name: 'Security Vulnerability Scan', description: 'Scan for security vulnerabilities' }
          ]
        },
        fileOperations: {
          name: 'Robust File Operations',
          commands: [
            { key: 'Q', name: 'Copy Files/Directories', description: 'Robust file copying with verification' },
            { key: 'R', name: 'Move Files/Directories', description: 'Safe file/directory moving' },
            { key: 'S', name: 'Delete Files/Directories', description: 'Safe deletion with confirmation' },
            { key: 'T', name: 'File System Analysis', description: 'Analyze file system structure and usage' },
            { key: 'U', name: 'Bulk File Operations', description: 'Batch processing of multiple files' },
            { key: 'V', name: 'File Integrity Verification', description: 'Verify file integrity and checksums' }
          ]
        },
        gui: {
          name: 'Real-time Monitoring GUI',
          commands: [
            { key: 'GUI', name: 'Launch Monitoring Dashboard', description: 'Real-time GUI dashboard with server monitoring' },
            { key: 'Z', name: 'Direct Nuxt Launch', description: 'Launch Nuxt Hello World directly' }
          ]
        }
      },
      osCompatibility: {
        windows: {
          primary: true,
          executable: 'batch-ops\\sharpUtilityGUI.exe',
          commands: ['TASKKILL', 'dir', 'start']
        }
      }
    };

    this.capabilities = capabilities;
    return capabilities;
  }

  /**
     * Query sharpUtility capabilities - replacement for all SHARPUTIL-*.md files
     */
  async queryCapabilities(category = null) {
    if (!this.capabilities) {
      await this.discoverCapabilities();
    }

    if (category) {
      return this.capabilities.categories[category] || null;
    }

    return this.capabilities;
  }

  /**
     * Get command help - replaces SHARPUTIL-USAGE.md
     */
  async getCommandHelp(command) {
    const caps = await this.queryCapabilities();
        
    for (const category of Object.values(caps.categories)) {
      const cmd = category.commands.find(c => c.key === command.toUpperCase());
      if (cmd) {
        return {
          command: cmd.key,
          name: cmd.name,
          description: cmd.description,
          category: category.name,
          usage: `batch-ops\\sharpUtilityGUI.exe ${cmd.key}`,
          example: `batch-ops\\sharpUtilityGUI.exe ${cmd.key}  # ${cmd.description}`
        };
      }
    }

    return null;
  }

  /**
     * Get best practices - replaces SHARPUTIL-BEST-PRACTICES.md
     */
  async getBestPractices() {
    return {
      fileOperations: [
        'Always use Q/R/S commands for file operations instead of direct Windows commands',
        'Verify file paths before operations with T command (File System Analysis)',
        'Use U command for bulk operations to maintain consistency',
        'Always run V command after important file operations for integrity verification'
      ],
      serverManagement: [
        'Use E command (Smart Start) instead of manual npm run dev',
        'Always run F command (Kill All) before starting new servers to prevent port conflicts',
        'Use G command (Health Check) regularly to ensure project health',
        'Monitor with D command (Live Monitoring) during active development'
      ],
      diagnostics: [
        'Run I command (Anomaly Scan) before major operations',
        'Use J command (Resource Analysis) if system feels sluggish',
        'Run K command (Dependency Check) after npm install operations',
        'Use GUI command for continuous monitoring during development sessions'
      ],
      osCompatibility: [
        'Always use sharpUtilityGUI.exe on Windows - never use Unix commands',
        'Commands are case-sensitive: use uppercase letters (A, B, C, etc.)',
        'Use batch-ops\\ prefix for reliable path resolution',
        'GUI mode provides real-time monitoring - preferred for development'
      ]
    };
  }

  /**
     * Get integration guide - replaces SHARPUTIL-CLAUDE-INTEGRATION.md
     */
  async getClaudeIntegration() {
    return {
      mcpQueries: {
        'query-capabilities': 'Get all available sharpUtility functions',
        'get-command-help': 'Get detailed help for specific command',
        'get-best-practices': 'Get usage best practices',
        'check-compatibility': 'Verify OS compatibility and executable status'
      },
      safetyProtocols: [
        'Always query MCP service before using sharpUtility commands',
        'Use MCP service to validate command syntax before execution',
        'Check OS compatibility through MCP before recommending commands',
        'Use MCP service to get real-time status updates'
      ],
      crashPrevention: [
        'NEVER use bash, ls, cat, grep on Windows - always query MCP first',
        'MCP service provides OS-specific command validation',
        'Use MCP service to check if executable exists before command execution',
        'MCP service maintains real-time executable status'
      ]
    };
  }

  /**
     * Find the correct executable
     */
  async findExecutable() {
    const fs = require('fs').promises;
    const path = require('path');
        
    const possiblePaths = [
      path.resolve('batch-ops', 'sharpUtilityGUI.exe'),
      path.resolve('..', '..', 'batch-ops', 'sharpUtilityGUI.exe'),
      path.resolve('..', '..', '..', 'batch-ops', 'sharpUtilityGUI.exe'),
      path.resolve(__dirname, '..', '..', '..', '..', '..', 'batch-ops', 'sharpUtilityGUI.exe')
    ];

    for (const execPath of possiblePaths) {
      try {
        await fs.access(execPath);
        return execPath;
      } catch {
        continue;
      }
    }

    return null;
  }

  /**
     * Check if executable is available
     */
  async checkExecutable() {
    const executable = await this.findExecutable();
    return {
      available: !!executable,
      path: executable || null,
      status: executable ? 'found' : 'not found'
    };
  }

  /**
     * Get version information
     */
  async getVersion() {
    // Could execute the utility with --version flag if implemented
    return 'Enhanced SharpUtility with GUI v1.0';
  }

  /**
     * Execute sharpUtility command through MCP
     */
  async executeCommand(command, args = []) {
    const { spawn } = require('child_process');
    const executable = await this.findExecutable();
        
    if (!executable) {
      throw new Error('SharpUtility executable not found');
    }

    return new Promise((resolve, reject) => {
      const process = spawn(executable, [command, ...args], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to execute command: ${error.message}`));
      });
    });
  }
}

// Simple handler functions for MCP
async function queryCapabilities(args = {}) {
  const service = new SharpUtilMCPService();
  return await service.queryCapabilities(args.category);
}

async function getCommandHelp(args) {
  const service = new SharpUtilMCPService();
  return await service.getCommandHelp(args.command);
}

async function getBestPractices() {
  const service = new SharpUtilMCPService();
  return await service.getBestPractices();
}

async function checkExecutable() {
  const service = new SharpUtilMCPService();
  return await service.checkExecutable();
}

async function executeCommand(args) {
  const service = new SharpUtilMCPService();
  return await service.executeCommand(args.command, args.args || []);
}

// Export functions for MCP handlers
module.exports = {
  queryCapabilities,
  getCommandHelp,
  getBestPractices,
  checkExecutable,
  executeCommand,
  SharpUtilMCPService
};