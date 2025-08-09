/**
 * SharpUtil Extension for MAK3R-HUB
 * Provides comprehensive Windows-native automation and file operations
 */

const { MCPExtension } = require('../../core/extension-base')
const fs = require('fs').promises
const path = require('path')
const { spawn } = require('child_process')

class SharpUtilExtension extends MCPExtension {
  constructor() {
    super()
    
    // Extension metadata
    this.name = 'sharputil'
    this.version = '1.0.0'
    this.description = 'SharpUtility integration extension for MAK3R-HUB - provides robust Windows-native file operations and server management'
    this.author = 'MAK3R Team'
    
    // Extension-specific properties
    this.executable = null
    this.capabilities = null
  }

  async initialize() {
    console.log(`🔧 SharpUtil extension initializing...`)
    
    try {
      // Find and verify executable
      this.executable = await this.findExecutable()
      
      if (!this.executable) {
        console.warn(`⚠️ SharpUtility executable not found - some features may be limited`)
      } else {
        console.log(`✅ SharpUtility found at: ${this.executable}`)
      }
      
      // Initialize capabilities cache
      await this.discoverCapabilities()
      
      // Register tools in the extension
      this.tools = this.getToolDefinitions().map(toolDef => ({
        name: toolDef.name,
        description: toolDef.description,
        inputSchema: toolDef.inputSchema,
        handler: async (args) => await this.executeTool(toolDef.name, args)
      }))
      
      console.log(`✅ SharpUtil extension ready (${process.platform})`)
      return true
      
    } catch (error) {
      console.error(`❌ SharpUtil extension initialization failed:`, error)
      return false
    }
  }

  async executeTool(toolName, args = {}) {
    try {
      switch (toolName) {
        // Query & Discovery Tools
        case 'm3r__sharputil__query_capabilities':
          return await this.queryCapabilities(args.category)
          
        case 'm3r__sharputil__get_command_help':
          return await this.getCommandHelp(args.command)
          
        case 'm3r__sharputil__get_best_practices':
          return await this.getBestPractices()
          
        case 'm3r__sharputil__check_executable':
          return await this.checkExecutable()

        // Project Discovery & Detection
        case 'm3r__sharputil__discover_projects':
          return await this.executeSharpUtilCommand('A', args)
          
        case 'm3r__sharputil__scan_servers':
          return await this.executeSharpUtilCommand('B', args)
          
        case 'm3r__sharputil__analyze_project':
          return await this.executeSharpUtilCommand('C', args)
          
        case 'm3r__sharputil__monitor_servers':
          return await this.executeSharpUtilCommand('D', args)

        // Smart Server Management
        case 'm3r__sharputil__smart_start':
          return await this.executeSharpUtilCommand('E', args)
          
        case 'm3r__sharputil__kill_servers':
          return await this.executeSharpUtilCommand('F', args)
          
        case 'm3r__sharputil__health_check':
          return await this.executeSharpUtilCommand('G', args)
          
        case 'm3r__sharputil__performance_analysis':
          return await this.executeSharpUtilCommand('H', args)

        // Diagnostics & Anomaly Detection
        case 'm3r__sharputil__anomaly_scan':
          return await this.executeSharpUtilCommand('I', args)
          
        case 'm3r__sharputil__resource_analysis':
          return await this.executeSharpUtilCommand('J', args)
          
        case 'm3r__sharputil__dependency_check':
          return await this.executeSharpUtilCommand('K', args)
          
        case 'm3r__sharputil__security_scan':
          return await this.executeSharpUtilCommand('L', args)

        // File Operations
        case 'm3r__sharputil__copy_files':
          return await this.executeSharpUtilCommand('Q', args)
          
        case 'm3r__sharputil__move_files':
          return await this.executeSharpUtilCommand('R', args)
          
        case 'm3r__sharputil__delete_files':
          return await this.executeSharpUtilCommand('S', args)
          
        case 'm3r__sharputil__analyze_filesystem':
          return await this.executeSharpUtilCommand('T', args)
          
        case 'm3r__sharputil__bulk_operations':
          return await this.executeSharpUtilCommand('U', args)
          
        case 'm3r__sharputil__verify_integrity':
          return await this.executeSharpUtilCommand('V', args)

        // GUI & Direct Launch
        case 'm3r__sharputil__launch_gui':
          return await this.executeSharpUtilCommand('GUI', args)
          
        case 'm3r__sharputil__launch_nuxt':
          return await this.executeSharpUtilCommand('Z', args)

        // Direct Command Execution
        case 'm3r__sharputil__execute_command':
          return await this.executeSharpUtilCommand(args.command, args)

        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }
    } catch (error) {
      this.logger?.error(`Tool execution failed`, { toolName, error: error.message })
      throw error
    }
  }

  getToolDefinitions() {
    return [
      // Query & Discovery Tools
      {
        name: 'm3r__sharputil__query_capabilities',
        description: 'Get all available SharpUtility functions and capabilities',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Optional category filter (discovery, serverManagement, diagnostics, fileOperations, gui)',
              enum: ['discovery', 'serverManagement', 'diagnostics', 'fileOperations', 'gui']
            }
          }
        }
      },
      {
        name: 'm3r__sharputil__get_command_help',
        description: 'Get detailed help for specific SharpUtil command',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command key (A, B, C, etc.)',
              pattern: '^[A-Z]+|GUI$'
            }
          },
          required: ['command']
        }
      },
      {
        name: 'm3r__sharputil__get_best_practices',
        description: 'Get usage best practices and safety protocols',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'm3r__sharputil__check_executable',
        description: 'Check if SharpUtility executable is available',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },

      // Project Discovery & Detection
      {
        name: 'm3r__sharputil__discover_projects',
        description: 'Auto-discover Vue/Nuxt projects on filesystem',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Root path to scan' },
            depth: { type: 'number', description: 'Maximum scan depth', minimum: 1, maximum: 5 }
          }
        }
      },
      {
        name: 'm3r__sharputil__scan_servers',
        description: 'Check active development servers on common ports',
        inputSchema: {
          type: 'object',
          properties: {
            ports: { type: 'array', items: { type: 'number' }, description: 'Custom ports to scan' }
          }
        }
      },
      {
        name: 'm3r__sharputil__analyze_project',
        description: 'Deep analysis of project dependencies and configuration',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to project to analyze' }
          }
        }
      },
      {
        name: 'm3r__sharputil__monitor_servers',
        description: 'Real-time monitoring of active servers',
        inputSchema: {
          type: 'object',
          properties: {
            duration: { type: 'number', description: 'Monitoring duration in seconds', minimum: 10, maximum: 600 }
          }
        }
      },

      // Smart Server Management
      {
        name: 'm3r__sharputil__smart_start',
        description: 'Auto-detect and launch best available project',
        inputSchema: {
          type: 'object',
          properties: {
            projectName: { type: 'string', description: 'Specific project name to start' },
            port: { type: 'number', description: 'Port to use', minimum: 3000, maximum: 9999 }
          }
        }
      },
      {
        name: 'm3r__sharputil__kill_servers',
        description: 'Terminate all Node.js development servers',
        inputSchema: {
          type: 'object',
          properties: {
            force: { type: 'boolean', description: 'Force kill processes', default: false },
            ports: { type: 'array', items: { type: 'number' }, description: 'Specific ports to target' }
          }
        }
      },
      {
        name: 'm3r__sharputil__health_check',
        description: 'Verify health of all discovered projects',
        inputSchema: {
          type: 'object',
          properties: {
            detailed: { type: 'boolean', description: 'Run detailed health checks', default: false }
          }
        }
      },
      {
        name: 'm3r__sharputil__performance_analysis',
        description: 'Analyze system performance metrics',
        inputSchema: {
          type: 'object',
          properties: {
            duration: { type: 'number', description: 'Analysis duration in seconds', minimum: 5, maximum: 300 }
          }
        }
      },

      // Diagnostics & Anomaly Detection
      {
        name: 'm3r__sharputil__anomaly_scan',
        description: 'Detect errors, conflicts, and system issues',
        inputSchema: {
          type: 'object',
          properties: {
            scope: { type: 'string', description: 'Scan scope', enum: ['system', 'projects', 'all'], default: 'all' }
          }
        }
      },
      {
        name: 'm3r__sharputil__resource_analysis',
        description: 'Analyze memory, CPU, and disk usage',
        inputSchema: {
          type: 'object',
          properties: {
            detailed: { type: 'boolean', description: 'Detailed resource analysis', default: true }
          }
        }
      },
      {
        name: 'm3r__sharputil__dependency_check',
        description: 'Validate project dependencies health',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Project path to check' },
            fix: { type: 'boolean', description: 'Attempt to fix issues', default: false }
          }
        }
      },
      {
        name: 'm3r__sharputil__security_scan',
        description: 'Scan for security vulnerabilities',
        inputSchema: {
          type: 'object',
          properties: {
            scope: { type: 'string', description: 'Scan scope', enum: ['dependencies', 'files', 'all'], default: 'all' }
          }
        }
      },

      // File Operations
      {
        name: 'm3r__sharputil__copy_files',
        description: 'Robust file/directory copying with verification',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Source path' },
            destination: { type: 'string', description: 'Destination path' },
            verify: { type: 'boolean', description: 'Verify copy integrity', default: true }
          },
          required: ['source', 'destination']
        }
      },
      {
        name: 'm3r__sharputil__move_files',
        description: 'Safe file/directory moving operations',
        inputSchema: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'Source path' },
            destination: { type: 'string', description: 'Destination path' }
          },
          required: ['source', 'destination']
        }
      },
      {
        name: 'm3r__sharputil__delete_files',
        description: 'Safe deletion with confirmation',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to delete' },
            confirm: { type: 'boolean', description: 'Confirm deletion', default: true }
          },
          required: ['path']
        }
      },
      {
        name: 'm3r__sharputil__analyze_filesystem',
        description: 'Analyze file system structure and usage',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Root path to analyze' },
            depth: { type: 'number', description: 'Analysis depth', minimum: 1, maximum: 5 }
          }
        }
      },
      {
        name: 'm3r__sharputil__bulk_operations',
        description: 'Batch processing of multiple files',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', description: 'Operation type', enum: ['copy', 'move', 'delete'] },
            files: { type: 'array', items: { type: 'string' }, description: 'List of file paths' },
            destination: { type: 'string', description: 'Destination for copy/move operations' }
          },
          required: ['operation', 'files']
        }
      },
      {
        name: 'm3r__sharputil__verify_integrity',
        description: 'Verify file integrity and checksums',
        inputSchema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to verify' },
            algorithm: { type: 'string', description: 'Hash algorithm', enum: ['md5', 'sha1', 'sha256'], default: 'sha256' }
          }
        }
      },

      // GUI & Direct Launch
      {
        name: 'm3r__sharputil__launch_gui',
        description: 'Launch real-time monitoring dashboard',
        inputSchema: {
          type: 'object',
          properties: {
            mode: { type: 'string', description: 'GUI mode', enum: ['monitoring', 'management'], default: 'monitoring' }
          }
        }
      },
      {
        name: 'm3r__sharputil__launch_nuxt',
        description: 'Direct Nuxt Hello World launch',
        inputSchema: {
          type: 'object',
          properties: {
            port: { type: 'number', description: 'Port to use', minimum: 3000, maximum: 9999, default: 3000 }
          }
        }
      },

      // Direct Command Execution
      {
        name: 'm3r__sharputil__execute_command',
        description: 'Execute any SharpUtil command with arguments',
        inputSchema: {
          type: 'object',
          properties: {
            command: { type: 'string', description: 'Command key to execute' },
            args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' },
            timeout: { type: 'number', description: 'Timeout in seconds', minimum: 10, maximum: 300 }
          },
          required: ['command']
        }
      }
    ]
  }

  /**
   * Auto-discover sharpUtility capabilities
   */
  async discoverCapabilities() {
    if (this.capabilities) {
      return this.capabilities
    }

    const capabilities = {
      metadata: {
        name: 'sharpUtility',
        version: await this.getVersion(),
        executable: this.executable,
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
    }

    this.capabilities = capabilities
    return capabilities
  }

  /**
   * Query capabilities with optional category filter
   */
  async queryCapabilities(category = null) {
    const caps = await this.discoverCapabilities()
    
    if (category) {
      return caps.categories[category] || null
    }
    
    return caps
  }

  /**
   * Get detailed help for a specific command
   */
  async getCommandHelp(command) {
    const caps = await this.queryCapabilities()
    
    for (const category of Object.values(caps.categories)) {
      const cmd = category.commands.find(c => c.key === command.toUpperCase())
      if (cmd) {
        return {
          command: cmd.key,
          name: cmd.name,
          description: cmd.description,
          category: category.name,
          usage: `batch-ops\\sharpUtilityGUI.exe ${cmd.key}`,
          example: `batch-ops\\sharpUtilityGUI.exe ${cmd.key}  # ${cmd.description}`
        }
      }
    }

    return null
  }

  /**
   * Get comprehensive best practices
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
    }
  }

  /**
   * Check if executable is available and working
   */
  async checkExecutable() {
    const executable = await this.findExecutable()
    return {
      available: !!executable,
      path: executable || null,
      status: executable ? 'found' : 'not found',
      version: executable ? await this.getVersion() : null
    }
  }

  /**
   * Find the SharpUtility executable
   */
  async findExecutable() {
    if (this.executable) {
      return this.executable
    }

    const possiblePaths = [
      path.resolve('batch-ops', 'sharpUtilityGUI.exe'),
      path.resolve('..', '..', 'batch-ops', 'sharpUtilityGUI.exe'),
      path.resolve('..', '..', '..', 'batch-ops', 'sharpUtilityGUI.exe'),
      path.resolve(__dirname, '..', '..', '..', '..', '..', 'batch-ops', 'sharpUtilityGUI.exe')
    ]

    for (const execPath of possiblePaths) {
      try {
        await fs.access(execPath)
        this.executable = execPath
        return execPath
      } catch {
        continue
      }
    }

    return null
  }

  /**
   * Get version information
   */
  async getVersion() {
    return 'Enhanced SharpUtility with GUI v1.0'
  }

  /**
   * Execute a SharpUtility command
   */
  async executeSharpUtilCommand(command, args = {}) {
    const executable = await this.findExecutable()
    
    if (!executable) {
      throw new Error('SharpUtility executable not found')
    }

    return new Promise((resolve, reject) => {
      const cmdArgs = [command]
      if (args.args && Array.isArray(args.args)) {
        cmdArgs.push(...args.args)
      }

      const process = spawn(executable, cmdArgs, {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: path.dirname(executable)
      })

      let stdout = ''
      let stderr = ''

      process.stdout?.on('data', (data) => {
        stdout += data.toString()
      })

      process.stderr?.on('data', (data) => {
        stderr += data.toString()
      })

      const timeout = args.timeout || 60000
      const timer = setTimeout(() => {
        process.kill('SIGTERM')
        reject(new Error(`Command timed out after ${timeout}ms`))
      }, timeout)

      process.on('close', (code) => {
        clearTimeout(timer)
        
        const result = {
          success: code === 0,
          exitCode: code,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          command: command,
          timestamp: new Date().toISOString()
        }

        if (code === 0) {
          resolve(result)
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`))
        }
      })

      process.on('error', (error) => {
        clearTimeout(timer)
        reject(new Error(`Failed to execute command: ${error.message}`))
      })
    })
  }

  async cleanup() {
    this.capabilities = null
    this.executable = null
  }

  async healthCheck() {
    try {
      const execCheck = await this.checkExecutable()
      return { 
        status: execCheck.available ? 'healthy' : 'unhealthy', 
        executable: execCheck,
        timestamp: new Date().toISOString() 
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date().toISOString() 
      }
    }
  }
}

module.exports = SharpUtilExtension