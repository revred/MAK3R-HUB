/**
 * MAK3R-HUB Extension Registry
 * Manages extension discovery, loading, and lifecycle
 * Supports both Node.js and C# extensions
 */

const fs = require('fs-extra')
const path = require('path')
const { ExtensionState, HealthStatus } = require('./extension-base')
const { getBridgeManager } = require('../bridges/csharp-bridge-manager')

class ExtensionRegistry {
  constructor(extensionsPath = './src/extensions') {
    this.extensionsPath = path.resolve(extensionsPath)
    this.extensions = new Map()
    this.tools = new Map()
    this.resources = new Map()
    this.prompts = new Map()
    
    // Registry metadata
    this.loadedAt = null
    this.loadErrors = []
    
    // C# extension support
    this.csharpExtensions = new Map()
    this.bridgeManager = null
    this.enableCSharpExtensions = true
    
    // Size limits for anti-bloat protection
    this.limits = {
      maxExtensions: 50,
      maxToolsPerExtension: 20,
      maxExtensionSizeKB: 100,
      maxTotalSizeKB: 2000
    }
  }
  
  /**
   * Discover and load all extensions
   */
  async discoverAndLoad() {
    console.log(`🔍 Discovering extensions in: ${this.extensionsPath}`)
    
    this.loadErrors = []
    const startTime = Date.now()
    
    try {
      // Find all Node.js extension directories
      const extensionDirs = await this.findExtensionDirectories()
      console.log(`Found ${extensionDirs.length} Node.js extensions`)
      
      // Load each Node.js extension
      const loadPromises = extensionDirs.map(dir => this.loadExtension(dir))
      await Promise.allSettled(loadPromises)
      
      // Discover and load C# extensions if enabled
      let csharpCount = 0;
      if (this.enableCSharpExtensions) {
        try {
          csharpCount = await this.discoverAndLoadCSharpExtensions()
          console.log(`Found ${csharpCount} C# extensions`)
        } catch (error) {
          console.warn('⚠️ C# extension discovery failed:', error.message)
          this.loadErrors.push(`C# extension discovery: ${error.message}`)
        }
      }
      
      // Validate dependencies
      await this.validateDependencies()
      
      // Initialize all extensions
      await this.initializeExtensions()
      
      this.loadedAt = new Date()
      const loadTime = Date.now() - startTime
      
      const totalExtensions = this.extensions.size + csharpCount
      console.log(`✅ Registry loaded ${totalExtensions} extensions (${this.extensions.size} Node.js, ${csharpCount} C#) in ${loadTime}ms`)
      
      if (this.loadErrors.length > 0) {
        console.warn(`⚠️ ${this.loadErrors.length} extensions failed to load:`)
        this.loadErrors.forEach(error => console.warn(`  - ${error}`))
      }
      
      return {
        success: true,
        loadedCount: totalExtensions,
        nodeJsCount: this.extensions.size,
        csharpCount: csharpCount,
        errorCount: this.loadErrors.length,
        loadTime
      }
      
    } catch (error) {
      console.error('❌ Failed to discover extensions:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * Find extension directories
   */
  async findExtensionDirectories() {
    if (!await fs.pathExists(this.extensionsPath)) {
      console.warn(`Extensions directory not found: ${this.extensionsPath}`)
      return []
    }
    
    const entries = await fs.readdir(this.extensionsPath, { withFileTypes: true })
    const extensionDirs = []
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const extensionFile = path.join(this.extensionsPath, entry.name, 'extension.js')
        if (await fs.pathExists(extensionFile)) {
          extensionDirs.push({
            name: entry.name,
            path: path.join(this.extensionsPath, entry.name),
            file: extensionFile
          })
        }
      }
    }
    
    return extensionDirs
  }
  
  /**
   * Load a single extension
   */
  async loadExtension(extensionDir) {
    const { name, path: extPath, file } = extensionDir
    
    try {
      // Check size limits
      await this.validateExtensionSize(extPath)
      
      // Clear require cache for hot reloading
      delete require.cache[require.resolve(file)]
      
      // Load extension class
      const ExtensionClass = require(file)
      const extension = new ExtensionClass()
      
      // Validate extension
      const validationErrors = extension.validate()
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`)
      }
      
      // Load configuration
      const configPath = path.join(extPath, 'config.yml')
      if (await fs.pathExists(configPath)) {
        await extension.loadConfig(configPath)
      }
      
      // Set state
      extension.state = ExtensionState.LOADING
      
      // Register extension
      this.extensions.set(extension.name, {
        instance: extension,
        path: extPath,
        loadedAt: new Date(),
        metadata: extension.getMetadata()
      })
      
      console.log(`📦 Loaded extension: ${extension.name} v${extension.version}`)
      
      return { success: true, extension }
      
    } catch (error) {
      const errorMsg = `Failed to load extension ${name}: ${error.message}`
      this.loadErrors.push(errorMsg)
      console.error(`❌ ${errorMsg}`)
      
      return { success: false, error: errorMsg }
    }
  }
  
  /**
   * Initialize all loaded extensions
   */
  async initializeExtensions() {
    const initPromises = Array.from(this.extensions.values()).map(async (ext) => {
      try {
        ext.instance.state = ExtensionState.INITIALIZING
        const success = await ext.instance.initialize()
        
        if (success) {
          ext.instance.state = ExtensionState.ACTIVE
          ext.instance.initialized = true
          
          // Register tools
          this.registerExtensionTools(ext.instance)
          
          console.log(`✅ Initialized: ${ext.instance.name}`)
        } else {
          ext.instance.state = ExtensionState.ERROR
          console.warn(`⚠️ Failed to initialize: ${ext.instance.name}`)
        }
        
        return { name: ext.instance.name, success }
        
      } catch (error) {
        ext.instance.state = ExtensionState.ERROR
        ext.instance.lastError = error.message
        console.error(`❌ Error initializing ${ext.instance.name}:`, error)
        
        return { name: ext.instance.name, success: false, error: error.message }
      }
    })
    
    const results = await Promise.allSettled(initPromises)
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    
    console.log(`🚀 Initialized ${successful}/${this.extensions.size} extensions`)
  }
  
  /**
   * Discover and load C# extensions
   */
  async discoverAndLoadCSharpExtensions() {
    try {
      console.log('🔍 Discovering C# extensions...')
      
      // Get or create bridge manager
      if (!this.bridgeManager) {
        this.bridgeManager = getBridgeManager()
        
        // Set up bridge event handlers
        this.bridgeManager.on('extension-registered', (extensionInfo) => {
          console.log(`✅ C# extension registered: ${extensionInfo.name}`)
        })
        
        this.bridgeManager.on('extension-unregistered', (info) => {
          console.log(`🗑️ C# extension unregistered: ${info.name}`)
          this.csharpExtensions.delete(info.name)
        })
        
        this.bridgeManager.on('bridge-error', (error) => {
          console.error('❌ C# bridge error:', error)
        })
      }

      // Get the shared bridge and discover C# extensions
      const bridge = await this.bridgeManager.getBridge()
      const discovery = await bridge.discoverExtensions()
      
      let loadedCount = 0
      
      if (discovery.extensions && discovery.extensions.length > 0) {
        // Register each discovered C# extension
        for (const extensionDef of discovery.extensions) {
          try {
            await this.registerCSharpExtension(extensionDef)
            loadedCount++
          } catch (error) {
            console.error(`❌ Failed to register C# extension ${extensionDef.name}:`, error.message)
            this.loadErrors.push(`C# extension ${extensionDef.name}: ${error.message}`)
          }
        }
      }
      
      return loadedCount
      
    } catch (error) {
      console.error('❌ C# extension discovery failed:', error)
      throw error
    }
  }
  
  /**
   * Register a C# extension with the registry
   */
  async registerCSharpExtension(extensionDef) {
    const extensionName = `csharp-${extensionDef.name}`
    
    // Create extension info
    const extensionInfo = {
      name: extensionName,
      originalName: extensionDef.name,
      version: extensionDef.version,
      description: extensionDef.description,
      author: extensionDef.author,
      type: 'csharp',
      tools: extensionDef.tools || [],
      bridgeManager: this.bridgeManager,
      registeredAt: new Date(),
      state: ExtensionState.LOADED
    }
    
    // Store in C# extensions map
    this.csharpExtensions.set(extensionName, extensionInfo)
    
    // Register tools with the global tool registry
    this.registerCSharpExtensionTools(extensionInfo)
    
    console.log(`🎯 Registered C# extension: ${extensionName} (${extensionDef.tools?.length || 0} tools)`)
  }
  
  /**
   * Register tools from a C# extension
   */
  registerCSharpExtensionTools(extensionInfo) {
    for (const tool of extensionInfo.tools) {
      if (this.tools.has(tool.name)) {
        console.warn(`⚠️ Tool name collision: ${tool.name} (from C# extension ${extensionInfo.name})`)
        continue
      }
      
      this.tools.set(tool.name, {
        extension: extensionInfo.name,
        type: 'csharp',
        handler: async (args) => {
          return await this.bridgeManager.executeTool(extensionInfo.originalName, tool.name, args)
        },
        definition: {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema || { type: 'object', properties: {} },
          category: tool.category || 'csharp',
          timeout: tool.timeout || 30
        }
      })
    }
    
    console.log(`🔧 Registered ${extensionInfo.tools.length} C# tools from ${extensionInfo.name}`)
  }
  
  /**
   * Register tools from an extension
   */
  registerExtensionTools(extension) {
    for (const tool of extension.tools) {
      if (this.tools.has(tool.name)) {
        console.warn(`⚠️ Tool name collision: ${tool.name} (from ${extension.name})`)
        continue
      }
      
      this.tools.set(tool.name, {
        extension: extension.name,
        handler: async (args) => await extension.executeTool(tool.name, args),
        definition: {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema || { type: 'object', properties: {} }
        }
      })
    }
    
    console.log(`🔧 Registered ${extension.tools.length} tools from ${extension.name}`)
  }
  
  /**
   * Get extension by name (Node.js extensions)
   */
  getExtension(name) {
    const ext = this.extensions.get(name)
    return ext ? ext.instance : null
  }
  
  /**
   * Get C# extension by name
   */
  getCSharpExtension(name) {
    return this.csharpExtensions.get(name) || null
  }
  
  /**
   * Get all extensions (both Node.js and C#)
   */
  getAllExtensions() {
    const nodeExtensions = Array.from(this.extensions.values()).map(ext => ({
      name: ext.name,
      version: ext.instance.version,
      description: ext.instance.description,
      author: ext.instance.author,
      type: 'nodejs',
      state: ext.state,
      toolCount: ext.instance.tools?.length || 0
    }))
    
    const csharpExtensions = Array.from(this.csharpExtensions.values()).map(ext => ({
      name: ext.name,
      version: ext.version,
      description: ext.description,
      author: ext.author,
      type: 'csharp',
      state: ext.state,
      toolCount: ext.tools?.length || 0
    }))
    
    return [...nodeExtensions, ...csharpExtensions]
  }
  
  /**
   * Get registry statistics
   */
  getStats() {
    return {
      totalExtensions: this.extensions.size + this.csharpExtensions.size,
      nodeJsExtensions: this.extensions.size,
      csharpExtensions: this.csharpExtensions.size,
      totalTools: this.tools.size,
      loadErrors: this.loadErrors.length,
      loadedAt: this.loadedAt
    }
  }
  
  /**
   * Get all MCP tool definitions
   */
  getAllMCPTools() {
    return Array.from(this.tools.values()).map(tool => tool.definition)
  }
  
  /**
   * Execute a tool by name
   */
  async executeTool(toolName, args = {}) {
    const tool = this.tools.get(toolName)
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`)
    }
    
    return await tool.handler(args)
  }
  
  /**
   * Get registry health status
   */
  async getHealth() {
    const extensions = Array.from(this.extensions.values())
    const healthChecks = await Promise.allSettled(
      extensions.map(ext => ext.instance.healthCheck())
    )
    
    const healthy = healthChecks.filter(h => 
      h.status === 'fulfilled' && h.value.status === 'healthy'
    ).length
    
    const status = healthy === extensions.length 
      ? HealthStatus.HEALTHY
      : healthy > 0 
        ? HealthStatus.DEGRADED
        : HealthStatus.UNHEALTHY
    
    return {
      status,
      extensionCount: extensions.length,
      healthyExtensions: healthy,
      toolCount: this.tools.size,
      loadedAt: this.loadedAt,
      uptime: this.loadedAt ? Date.now() - this.loadedAt.getTime() : 0
    }
  }
  
  /**
   * Reload an extension
   */
  async reloadExtension(extensionName) {
    console.log(`🔄 Reloading extension: ${extensionName}`)
    
    const ext = this.extensions.get(extensionName)
    if (!ext) {
      throw new Error(`Extension not found: ${extensionName}`)
    }
    
    try {
      // Shutdown existing extension
      await ext.instance.shutdown()
      
      // Unregister tools
      this.unregisterExtensionTools(ext.instance)
      
      // Reload extension
      const result = await this.loadExtension({
        name: extensionName,
        path: ext.path,
        file: path.join(ext.path, 'extension.js')
      })
      
      if (result.success) {
        // Initialize the reloaded extension
        const newExt = this.extensions.get(extensionName)
        await newExt.instance.initialize()
        this.registerExtensionTools(newExt.instance)
        
        console.log(`✅ Reloaded: ${extensionName}`)
      }
      
      return result
      
    } catch (error) {
      console.error(`❌ Failed to reload ${extensionName}:`, error)
      throw error
    }
  }
  
  /**
   * Unregister tools from an extension
   */
  unregisterExtensionTools(extension) {
    for (const tool of extension.tools) {
      this.tools.delete(tool.name)
    }
  }
  
  /**
   * Validate extension size for anti-bloat protection
   */
  async validateExtensionSize(extensionPath) {
    const stats = await this.getDirectoryStats(extensionPath)
    
    if (stats.sizeKB > this.limits.maxExtensionSizeKB) {
      throw new Error(
        `Extension exceeds size limit: ${stats.sizeKB}KB > ${this.limits.maxExtensionSizeKB}KB`
      )
    }
    
    if (stats.fileCount > 50) {
      throw new Error(
        `Extension has too many files: ${stats.fileCount} > 50`
      )
    }
  }
  
  /**
   * Get directory statistics
   */
  async getDirectoryStats(dirPath) {
    const files = await fs.readdir(dirPath, { recursive: true, withFileTypes: true })
    let totalSize = 0
    let fileCount = 0
    
    for (const file of files) {
      if (file.isFile()) {
        const filePath = path.join(dirPath, file.name)
        const stats = await fs.stat(filePath)
        totalSize += stats.size
        fileCount++
      }
    }
    
    return {
      sizeKB: Math.round(totalSize / 1024),
      fileCount
    }
  }
  
  /**
   * Validate extension dependencies
   */
  async validateDependencies() {
    // Check for conflicts
    const extensions = Array.from(this.extensions.values())
    
    for (const ext1 of extensions) {
      for (const ext2 of extensions) {
        if (ext1 === ext2) continue
        
        // Check conflicts
        if (ext1.instance.conflicts.includes(ext2.instance.name)) {
          console.warn(`⚠️ Extension conflict: ${ext1.instance.name} conflicts with ${ext2.instance.name}`)
        }
      }
    }
  }
  
  /**
   * Clean up all extensions and resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up extension registry...')
    
    try {
      // Cleanup Node.js extensions
      const nodeCleanupPromises = Array.from(this.extensions.values()).map(async (ext) => {
        try {
          if (ext.instance && typeof ext.instance.shutdown === 'function') {
            await ext.instance.shutdown()
          }
        } catch (error) {
          console.warn(`⚠️ Error shutting down extension ${ext.name}:`, error.message)
        }
      })
      
      await Promise.allSettled(nodeCleanupPromises)
      
      // Cleanup C# extensions and bridge
      if (this.bridgeManager) {
        try {
          await this.bridgeManager.cleanup()
          this.bridgeManager = null
        } catch (error) {
          console.warn('⚠️ Error cleaning up C# bridge manager:', error.message)
        }
      }
      
      // Clear all maps
      this.extensions.clear()
      this.csharpExtensions.clear()
      this.tools.clear()
      this.resources.clear()
      this.prompts.clear()
      
      console.log('✅ Extension registry cleanup completed')
      
    } catch (error) {
      console.error('❌ Error during extension registry cleanup:', error)
      throw error
    }
  }
}

module.exports = ExtensionRegistry