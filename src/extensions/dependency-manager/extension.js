/**
 * Dependency Manager Extension for MAK3R-HUB
 * Auto-install and manage development dependencies
 */

const { MCPExtension } = require('../../core/extension-base')
const { execSync } = require('child_process')
const fs = require('fs-extra')

class DependencyManagerExtension extends MCPExtension {
  constructor() {
    super()
    
    // Extension metadata
    this.name = 'dependency-manager'
    this.version = '1.0.0' 
    this.description = 'Dependency Manager extension for MAK3R-HUB - auto-install and manage development dependencies'
    this.author = 'MAK3R Team'
    
    // Extension-specific properties
    this.platform = process.platform
  }

  async initialize() {
    console.log(`📦 Dependency Manager extension initializing...`)
    
    try {
      // Register tools
      this.tools = this.getToolDefinitions().map(toolDef => ({
        name: toolDef.name,
        description: toolDef.description,
        inputSchema: toolDef.inputSchema,
        handler: async (args) => await this.executeTool(toolDef.name, args)
      }))
      
      console.log(`✅ Dependency Manager extension ready (${this.platform})`)
      return true
      
    } catch (error) {
      console.error(`❌ Dependency Manager extension initialization failed:`, error)
      return false
    }
  }

  async executeTool(toolName, args = {}) {
    try {
      switch (toolName) {
        case 'm3r__deps__detect_missing':
          return await this.detectMissingDependencies()
          
        case 'm3r__deps__install_dependency':
          return await this.installDependency(args)
          
        case 'm3r__deps__verify_installation':
          return await this.verifyInstallation(args.dependencyName)
          
        case 'm3r__deps__get_package_manager':
          return await this.getPackageManager()

        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }
    } catch (error) {
      this.logger?.error(`Dependency Manager tool execution failed`, { toolName, error: error.message })
      throw error
    }
  }

  getToolDefinitions() {
    return [
      {
        name: 'm3r__deps__detect_missing',
        description: 'Detect all missing development dependencies',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'm3r__deps__install_dependency',
        description: 'Auto-install missing dependency',
        inputSchema: {
          type: 'object',
          properties: {
            dependencyName: { type: 'string', description: 'Name of dependency to install', enum: ['git', 'nodejs', 'npm', 'python', 'dotnet', 'vscode'] },
            version: { type: 'string', description: 'Version to install', default: 'latest' },
            force: { type: 'boolean', description: 'Force installation without user prompt', default: false }
          },
          required: ['dependencyName']
        }
      },
      {
        name: 'm3r__deps__verify_installation',
        description: 'Verify if dependency is properly installed',
        inputSchema: {
          type: 'object',
          properties: {
            dependencyName: { type: 'string', description: 'Name of dependency to verify' }
          },
          required: ['dependencyName']
        }
      },
      {
        name: 'm3r__deps__get_package_manager',
        description: 'Get available package managers for platform',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      }
    ]
  }

  // Implementation methods
  async detectMissingDependencies() {
    const dependencies = {
      git: await this.checkGit(),
      nodejs: await this.checkNodeJS(),
      npm: await this.checkNPM(),
      python: await this.checkPython(),
      dotnet: await this.checkDotNet(),
      vscode: await this.checkVSCode()
    }

    const missing = Object.entries(dependencies)
      .filter(([name, status]) => !status.installed)
      .map(([name, status]) => ({ name, ...status }))

    return {
      platform: this.platform,
      dependencies,
      missing,
      canAutoInstall: this.canAutoInstall(),
      packageManager: await this.getPackageManager()
    }
  }

  async installDependency(options) {
    const { dependencyName, version = 'latest', force = false } = options

    if (!force) {
      return {
        success: false,
        error: 'User consent required for installation',
        suggestion: 'Set force: true to proceed with installation'
      }
    }

    try {
      const result = await this.performInstallation(dependencyName, version)
      const verification = await this.verifyInstallation(dependencyName)

      return {
        success: verification.installed,
        dependency: dependencyName,
        version: verification.version,
        path: verification.path,
        installMethod: result.method,
        message: `${dependencyName} installed successfully via ${result.method}`
      }
    } catch (error) {
      return {
        success: false,
        dependency: dependencyName,
        error: error.message
      }
    }
  }

  async verifyInstallation(dependencyName) {
    switch (dependencyName) {
      case 'git':
        return await this.checkGit()
      case 'nodejs':
        return await this.checkNodeJS()
      case 'npm':
        return await this.checkNPM()
      case 'python':
        return await this.checkPython()
      case 'dotnet':
        return await this.checkDotNet()
      case 'vscode':
        return await this.checkVSCode()
      default:
        return { installed: false, error: 'Unknown dependency' }
    }
  }

  async getPackageManager() {
    const managers = {
      chocolatey: false,
      winget: false,
      scoop: false,
      manual: true
    }

    if (this.platform === 'win32') {
      try {
        execSync('choco --version', { stdio: 'ignore' })
        managers.chocolatey = true
      } catch {}

      try {
        execSync('winget --version', { stdio: 'ignore' })
        managers.winget = true
      } catch {}

      try {
        execSync('scoop --version', { stdio: 'ignore' })
        managers.scoop = true
      } catch {}
    }

    return {
      platform: this.platform,
      managers,
      recommended: managers.winget ? 'winget' : managers.chocolatey ? 'chocolatey' : 'manual'
    }
  }

  // Helper methods for checking dependencies
  async checkGit() {
    try {
      const version = execSync('git --version', { encoding: 'utf8' }).trim()
      return { installed: true, version, path: 'git' }
    } catch {
      return { installed: false, error: 'Git not found in PATH' }
    }
  }

  async checkNodeJS() {
    try {
      const version = execSync('node --version', { encoding: 'utf8' }).trim()
      return { installed: true, version, path: 'node' }
    } catch {
      return { installed: false, error: 'Node.js not found in PATH' }
    }
  }

  async checkNPM() {
    try {
      const version = execSync('npm --version', { encoding: 'utf8' }).trim()
      return { installed: true, version, path: 'npm' }
    } catch {
      return { installed: false, error: 'npm not found in PATH' }
    }
  }

  async checkPython() {
    try {
      const version = execSync('python --version', { encoding: 'utf8' }).trim()
      return { installed: true, version, path: 'python' }
    } catch {
      return { installed: false, error: 'Python not found in PATH' }
    }
  }

  async checkDotNet() {
    try {
      const version = execSync('dotnet --version', { encoding: 'utf8' }).trim()
      return { installed: true, version, path: 'dotnet' }
    } catch {
      return { installed: false, error: '.NET SDK not found in PATH' }
    }
  }

  async checkVSCode() {
    try {
      const version = execSync('code --version', { encoding: 'utf8' }).split('\n')[0]
      return { installed: true, version, path: 'code' }
    } catch {
      return { installed: false, error: 'VS Code not found in PATH' }
    }
  }

  canAutoInstall() {
    return this.platform === 'win32' && process.env.NODE_ENV !== 'production'
  }

  async performInstallation(dependencyName, version) {
    // Mock implementation - in reality would use package managers
    return {
      method: 'manual',
      message: `Please install ${dependencyName} manually`
    }
  }

  async cleanup() {
    // Cleanup resources
  }

  async healthCheck() {
    try {
      return { 
        status: 'healthy',
        platform: this.platform,
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

module.exports = DependencyManagerExtension