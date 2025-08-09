/**
 * MAK3R-HUB Extension Base Class
 * Provides the interface contract for all extensions
 */

class MCPExtension {
  constructor() {
    // Required metadata - must be overridden
    this.name = null
    this.version = null
    this.description = null
    this.author = null
    
    // MCP capabilities
    this.tools = []
    this.resources = []
    this.prompts = []
    
    // Extension lifecycle state
    this.state = ExtensionState.DISCOVERED
    this.initialized = false
    this.lastError = null
    
    // Optional configuration
    this.dependencies = []
    this.conflicts = []
    this.config = {}
    
    // Performance metrics
    this.metrics = {
      callCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
      memoryUsage: 0
    }
  }
  
  /**
   * Initialize the extension
   * Override this method to perform setup tasks
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    throw new Error(`Extension ${this.name} must implement initialize()`)
  }
  
  /**
   * Shutdown the extension gracefully
   * Override this method to perform cleanup
   */
  async shutdown() {
    this.initialized = false
    this.state = ExtensionState.DISABLED
  }
  
  /**
   * Health check for the extension
   * @returns {Promise<ExtensionHealth>}
   */
  async healthCheck() {
    return {
      status: this.initialized ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      metrics: this.metrics,
      lastError: this.lastError
    }
  }
  
  /**
   * Validate extension configuration
   * Override to add custom validation
   */
  validate() {
    const errors = []
    
    if (!this.name) errors.push('Extension name is required')
    if (!this.version) errors.push('Extension version is required')
    if (!this.description) errors.push('Extension description is required')
    if (!this.author) errors.push('Extension author is required')
    
    // Validate tools
    for (const tool of this.tools) {
      if (!tool.name) errors.push('Tool name is required')
      if (!tool.description) errors.push('Tool description is required')
      if (!tool.handler) errors.push('Tool handler is required')
      if (typeof tool.handler !== 'function') {
        errors.push(`Tool ${tool.name} handler must be a function`)
      }
    }
    
    return errors
  }
  
  /**
   * Get extension metadata
   */
  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
      state: this.state,
      dependencies: this.dependencies,
      conflicts: this.conflicts,
      toolCount: this.tools.length,
      resourceCount: this.resources.length,
      promptCount: this.prompts.length
    }
  }
  
  /**
   * Get MCP tool definitions for registration
   */
  getMCPTools() {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema || {
        type: 'object',
        properties: {}
      }
    }))
  }
  
  /**
   * Execute a tool with error handling and metrics
   */
  async executeTool(toolName, args = {}) {
    const startTime = Date.now()
    this.metrics.callCount++
    
    try {
      const tool = this.tools.find(t => t.name === toolName)
      if (!tool) {
        throw new Error(`Tool ${toolName} not found in extension ${this.name}`)
      }
      
      // Execute tool handler
      const result = await tool.handler(args)
      
      // Update metrics
      const responseTime = Date.now() - startTime
      this.updateMetrics(responseTime, true)
      
      return result
      
    } catch (error) {
      this.metrics.errorCount++
      this.lastError = {
        tool: toolName,
        error: error.message,
        timestamp: new Date().toISOString()
      }
      
      this.updateMetrics(Date.now() - startTime, false)
      throw error
    }
  }
  
  /**
   * Update performance metrics
   */
  updateMetrics(responseTime, success) {
    // Update average response time (exponential moving average)
    this.metrics.avgResponseTime = this.metrics.avgResponseTime === 0
      ? responseTime
      : (this.metrics.avgResponseTime * 0.9) + (responseTime * 0.1)
    
    // Update memory usage
    this.metrics.memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024 // MB
  }
  
  /**
   * Load configuration from file or object
   */
  async loadConfig(configPath) {
    try {
      if (typeof configPath === 'string') {
        const fs = require('fs-extra')
        const yaml = require('js-yaml')
        
        if (configPath.endsWith('.yml') || configPath.endsWith('.yaml')) {
          const content = await fs.readFile(configPath, 'utf8')
          this.config = yaml.load(content)
        } else {
          this.config = await fs.readJson(configPath)
        }
      } else {
        this.config = configPath
      }
      
      return true
    } catch (error) {
      console.warn(`Failed to load config for ${this.name}:`, error.message)
      return false
    }
  }
  
  /**
   * Get configuration value with default
   */
  getConfig(key, defaultValue = null) {
    const keys = key.split('.')
    let value = this.config
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return defaultValue
      }
    }
    
    return value
  }
}

// Extension states
const ExtensionState = {
  DISCOVERED: 'discovered',
  LOADING: 'loading',
  INITIALIZING: 'initializing',
  INITIALIZED: 'initialized',
  ACTIVE: 'active',
  ERROR: 'error',
  DISABLED: 'disabled',
  SHUTDOWN: 'shutdown'
}

// Extension health status
const HealthStatus = {
  HEALTHY: 'healthy',
  UNHEALTHY: 'unhealthy',
  DEGRADED: 'degraded',
  UNKNOWN: 'unknown'
}

module.exports = {
  MCPExtension,
  ExtensionState,
  HealthStatus
}