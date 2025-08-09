/**
 * System Extension
 * Provides system diagnostics and OS-specific safe commands
 */

const { MCPExtension, ExtensionState } = require('../../core/extension-base')
const os = require('os')
const { exec } = require('child_process')
const { promisify } = require('util')
const fs = require('fs-extra')
const path = require('path')

const execAsync = promisify(exec)

class SystemExtension extends MCPExtension {
  constructor() {
    super()
    
    // Extension metadata
    this.name = 'system'
    this.version = '1.0.0'
    this.description = 'System diagnostics and OS-specific safe commands'
    this.author = 'MAK3R Team'
    
    // Define MCP tools
    this.tools = [
      {
        name: 'm3r__system__get_info',
        description: 'Get comprehensive system information',
        inputSchema: { type: 'object', properties: {} },
        handler: this.getSystemInfo.bind(this)
      },
      {
        name: 'm3r__system__check_service',
        description: 'Check if a service or executable is available',
        inputSchema: {
          type: 'object',
          properties: {
            serviceName: { type: 'string', description: 'Service name to check' },
            executablePath: { type: 'string', description: 'Optional executable path' }
          },
          required: ['serviceName']
        },
        handler: this.checkService.bind(this)
      },
      {
        name: 'm3r__system__run_diagnostics',
        description: 'Run comprehensive system diagnostics',
        inputSchema: { type: 'object', properties: {} },
        handler: this.runDiagnostics.bind(this)
      },
      {
        name: 'm3r__system__get_safe_commands',
        description: 'Get OS-specific safe command recommendations',
        inputSchema: { type: 'object', properties: {} },
        handler: this.getSafeCommands.bind(this)
      },
      {
        name: 'm3r__system__execute_safe_command',
        description: 'Execute a command safely with OS-specific validation',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', description: 'Command to execute' },
            args: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Command arguments' 
            }
          },
          required: ['operation']
        },
        handler: this.executeSafeCommand.bind(this)
      }
    ]
  }
  
  async initialize() {
    console.log(`🖥️ System extension initializing...`)
    
    // Check if we can access system info
    try {
      await this.getSystemInfo()
      console.log(`✅ System extension ready (${os.platform()})`)
      return true
    } catch (error) {
      console.error(`❌ System extension failed to initialize:`, error)
      return false
    }
  }
  
  async getSystemInfo() {
    return {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      totalMemory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
      freeMemory: `${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
      cpus: os.cpus().length,
      hostname: os.hostname(),
      uptime: `${Math.round(os.uptime() / 3600)} hours`,
      loadAverage: os.loadavg(),
      timestamp: new Date().toISOString()
    }
  }
  
  async checkService({ serviceName, executablePath }) {
    try {
      if (executablePath) {
        await fs.access(executablePath)
        return { service: serviceName, status: 'available', path: executablePath }
      }
      
      // Check known services
      switch (serviceName.toLowerCase()) {
        case 'sharputil':
          const sharpUtilPath = path.join(process.cwd(), 'batch-ops', 'sharpUtilityGUI.exe')
          try {
            await fs.access(sharpUtilPath)
            return { service: serviceName, status: 'available', path: sharpUtilPath }
          } catch {
            return { service: serviceName, status: 'not found', path: null }
          }
          
        case 'node':
          return { service: serviceName, status: 'available', version: process.version }
          
        case 'git':
          try {
            const { stdout } = await execAsync('git --version')
            return { service: serviceName, status: 'available', version: stdout.trim() }
          } catch {
            return { service: serviceName, status: 'not found' }
          }
          
        default:
          return { service: serviceName, status: 'unknown' }
      }
      
    } catch (error) {
      return { service: serviceName, status: 'error', error: error.message }
    }
  }
  
  async runDiagnostics() {
    const systemInfo = await this.getSystemInfo()
    const services = {}
    
    // Check common services
    const serviceNames = ['node', 'git', 'sharputil']
    for (const serviceName of serviceNames) {
      services[serviceName] = await this.checkService({ serviceName })
    }
    
    const diagnostics = {
      system: systemInfo,
      services,
      recommendations: [],
      status: 'healthy'
    }
    
    // Generate recommendations
    if (services.git.status !== 'available') {
      diagnostics.recommendations.push('Install Git for version control operations')
    }
    
    if (services.sharputil.status !== 'available') {
      diagnostics.recommendations.push('SharpUtility not found - some file operations may be limited')
    }
    
    if (systemInfo.freeMemory < '1 GB') {
      diagnostics.recommendations.push('Low memory detected - consider closing unused applications')
      diagnostics.status = 'warning'
    }
    
    return diagnostics
  }
  
  async getSafeCommands() {
    const isWindows = process.platform === 'win32'
    const isMac = process.platform === 'darwin'
    const isLinux = process.platform === 'linux'
    
    return {
      platform: process.platform,
      fileOperations: isWindows 
        ? ['dir', 'type', 'copy', 'move', 'del', 'md', 'rd']
        : ['ls', 'cat', 'cp', 'mv', 'rm', 'mkdir', 'rmdir'],
        
      processManagement: isWindows 
        ? ['tasklist', 'taskkill']
        : ['ps', 'kill', 'pkill'],
        
      networkOperations: ['ping', 'curl', 'wget'].filter(cmd => {
        // Windows doesn't have wget by default
        return !(isWindows && cmd === 'wget')
      }),
      
      development: ['node', 'npm', 'git', 'dotnet'],
      
      forbidden: isWindows 
        ? ['bash', 'sh', 'ls', 'cat', 'grep', 'find', 'chmod', 'sudo']
        : ['tasklist', 'taskkill', 'dir', 'type', 'copy', 'move', 'del'],
        
      recommendations: isWindows
        ? 'Use Windows-native commands or sharpUtilityGUI for file operations'
        : 'Standard Unix commands available'
    }
  }
  
  async executeSafeCommand({ operation, args = [] }) {
    const safeCommands = await this.getSafeCommands()
    const allSafeCommands = [
      ...safeCommands.fileOperations,
      ...safeCommands.processManagement,
      ...safeCommands.networkOperations,
      ...safeCommands.development
    ]
    
    // Safety check
    if (safeCommands.forbidden.includes(operation)) {
      throw new Error(`Command '${operation}' is forbidden on ${process.platform}`)
    }
    
    if (!allSafeCommands.includes(operation)) {
      throw new Error(`Command '${operation}' is not in the safe commands list`)
    }
    
    try {
      const command = [operation, ...args].join(' ')
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000,
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 // 1MB max output
      })
      
      return {
        command,
        success: true,
        output: stdout.trim(),
        error: stderr.trim() || null,
        platform: process.platform
      }
      
    } catch (error) {
      return {
        command: [operation, ...args].join(' '),
        success: false,
        output: null,
        error: error.message,
        platform: process.platform
      }
    }
  }
  
  async healthCheck() {
    const baseHealth = await super.healthCheck()
    
    // Add system-specific health info
    const systemHealth = {
      ...baseHealth,
      systemLoad: os.loadavg()[0],
      freeMemoryMB: Math.round(os.freemem() / 1024 / 1024),
      uptimeHours: Math.round(os.uptime() / 3600)
    }
    
    // Adjust status based on system metrics
    if (systemHealth.systemLoad > 10 || systemHealth.freeMemoryMB < 100) {
      systemHealth.status = 'degraded'
    }
    
    return systemHealth
  }
}

module.exports = SystemExtension