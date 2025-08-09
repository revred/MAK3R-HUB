/**
 * MAK3R-HUB Core
 * Lightweight orchestration layer (< 150 lines)
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js')
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js')
const ExtensionRegistry = require('./extension-registry')
const { 
  toolsCallRequestSchema,
  toolsListRequestSchema,
  initializeRequestSchema,
  pingRequestSchema
} = require('../mcp/schemas')

class MAK3RHub {
  constructor(options = {}) {
    this.name = options.name || 'mak3r-hub'
    this.version = options.version || '1.0.0'
    this.extensionsPath = options.extensionsPath || './src/extensions'
    
    // Core components (lightweight)
    this.registry = new ExtensionRegistry(this.extensionsPath)
    this.mcpServer = null
    
    // State
    this.started = false
    this.startTime = null
    
    console.log(`🚀 MAK3R-HUB Core initialized`)
  }
  
  /**
   * Start the hub
   */
  async start() {
    if (this.started) {
      console.warn('Hub already started')
      return
    }
    
    console.log('🏁 Starting MAK3R-HUB...')
    this.startTime = Date.now()
    
    try {
      // 1. Load extensions
      await this.registry.discoverAndLoad()
      
      // 2. Start MCP server
      await this.startMCPServer()
      
      this.started = true
      const startupTime = Date.now() - this.startTime
      
      console.log(`✅ MAK3R-HUB started in ${startupTime}ms`)
      console.log(`📊 Extensions: ${this.registry.extensions.size}, Tools: ${this.registry.tools.size}`)
      
      return { success: true, startupTime }
      
    } catch (error) {
      console.error('❌ Failed to start MAK3R-HUB:', error)
      throw error
    }
  }
  
  /**
   * Start MCP Server with extension-provided tools
   */
  async startMCPServer() {
    this.mcpServer = new Server(
      {
        name: this.name,
        version: this.version
      },
      {
        capabilities: {
          tools: {}
        }
      }
    )
    
    // Register MCP handlers (delegated to extensions)
    this.setupMCPHandlers()
    
    // Connect to stdio transport
    const transport = new StdioServerTransport()
    await this.mcpServer.connect(transport)
    
    console.log('📡 MCP Server connected')
  }
  
  /**
   * Setup MCP request handlers (pure delegation)
   */
  setupMCPHandlers() {
    // Initialize
    this.mcpServer.setRequestHandler(initializeRequestSchema, async (request) => {
      const stats = this.registry.getStats()
      
      return {
        protocolVersion: '0.5.0',
        capabilities: { tools: {} },
        serverInfo: {
          name: this.name,
          version: this.version,
          extensions: stats.totalExtensions,
          nodeJsExtensions: stats.nodeJsExtensions,
          csharpExtensions: stats.csharpExtensions,
          tools: stats.totalTools
        }
      }
    })
    
    // Ping
    this.mcpServer.setRequestHandler(pingRequestSchema, async () => ({ pong: true }))
    
    // Tools list (delegated to registry)
    this.mcpServer.setRequestHandler(toolsListRequestSchema, async () => {
      return { tools: this.registry.getAllMCPTools() }
    })
    
    // Tool calls (delegated to registry)
    this.mcpServer.setRequestHandler(toolsCallRequestSchema, async (request) => {
      const { name, arguments: args } = request.params
      
      try {
        const result = await this.registry.executeTool(name, args || {})
        
        return {
          content: [{
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }]
        }
        
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Error: ${error.message}`
          }]
        }
      }
    })
  }
  
  /**
   * Stop the hub gracefully
   */
  async stop() {
    if (!this.started) return
    
    console.log('🛑 Stopping MAK3R-HUB...')
    
    try {
      // Shutdown extensions
      const extensions = Array.from(this.registry.extensions.values())
      await Promise.allSettled(
        extensions.map(ext => ext.instance.shutdown())
      )
      
      // Close MCP server
      if (this.mcpServer) {
        await this.mcpServer.close()
      }
      
      this.started = false
      console.log('✅ MAK3R-HUB stopped')
      
    } catch (error) {
      console.error('❌ Error stopping hub:', error)
    }
  }
  
  /**
   * Get hub health status
   */
  async getHealth() {
    const registryHealth = await this.registry.getHealth()
    
    return {
      status: registryHealth.status,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      extensions: registryHealth.extensionCount,
      tools: registryHealth.toolCount,
      registry: registryHealth,
      memory: process.memoryUsage()
    }
  }
  
  /**
   * Reload an extension (hot reload)
   */
  async reloadExtension(extensionName) {
    return await this.registry.reloadExtension(extensionName)
  }
  
  /**
   * Get hub statistics
   */
  getStats() {
    return {
      hub: {
        name: this.name,
        version: this.version,
        started: this.started,
        uptime: this.startTime ? Date.now() - this.startTime : 0
      },
      registry: this.registry.getStats(),
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        cpu: process.cpuUsage()
      }
    }
  }
}

module.exports = MAK3RHub

// Helper function for standalone execution
async function startHub(options = {}) {
  const hub = new MAK3RHub(options)
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...')
    await hub.stop()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...')
    await hub.stop()
    process.exit(0)
  })
  
  await hub.start()
  return hub
}

// Export for CLI usage
module.exports.startHub = startHub