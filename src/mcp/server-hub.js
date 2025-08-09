#!/usr/bin/env node

/**
 * MAK3R-HUB MCP Server (Hub-Based)
 * Uses the lightweight hub architecture with extensions
 */

const MAK3RHub = require('../core/hub')
const path = require('path')

class HubMCPServer {
  constructor(options = {}) {
    this.options = {
      name: 'mak3r-hub-mcp',
      version: '2.0.0',
      extensionsPath: path.join(__dirname, '..', 'extensions'),
      ...options
    }
    
    this.hub = null
  }
  
  async start() {
    try {
      console.log('🚀 Starting MAK3R-HUB MCP Server (Hub-Based)...')
      
      // Start the lightweight hub
      this.hub = new MAK3RHub(this.options)
      await this.hub.start()
      
      console.log('✅ Hub-based MCP Server started successfully')
      console.log('📡 Server running on stdio transport')
      console.log('📋 Ready to handle MCP requests via extensions')
      
      return { success: true }
      
    } catch (error) {
      console.error('❌ Failed to start hub-based MCP server:', error)
      throw error
    }
  }
  
  async stop() {
    if (this.hub) {
      await this.hub.stop()
    }
  }
  
  async getHealth() {
    return this.hub ? await this.hub.getHealth() : { status: 'stopped' }
  }
  
  async getStats() {
    return this.hub ? this.hub.getStats() : { hub: { started: false } }
  }
}

// If run directly, start the server
if (require.main === module) {
  const server = new HubMCPServer()
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down...')
    await server.stop()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down...')
    await server.stop()
    process.exit(0)
  })
  
  server.start().catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = HubMCPServer