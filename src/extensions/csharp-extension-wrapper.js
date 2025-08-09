/**
 * C# Extension Wrapper - Adapts C# extensions to Node.js extension interface
 * Provides seamless integration of C# MCP tools with the Node.js hub
 */

const { MCPExtension } = require('../core/extension-base');
const { CSharpExtensionBridge } = require('../bridges/csharp-bridge');

class CSharpExtensionWrapper extends MCPExtension {
    constructor(extensionName, toolDefinitions = [], bridgeOptions = {}) {
        super();
        
        this.name = `csharp-${extensionName}`;
        this.version = '1.0.0';
        this.description = `C# extension wrapper for ${extensionName}`;
        this.author = 'MAK3R-HUB';
        
        this.extensionName = extensionName;
        this.bridge = null;
        this.bridgeOptions = bridgeOptions;
        this._toolDefinitions = toolDefinitions;
        
        // Populate tools array from C# tool definitions
        this.tools = this._createToolsFromDefinitions(toolDefinitions);
    }

    /**
     * Initialize the C# extension wrapper
     */
    async initialize() {
        try {
            // Create and start the C# bridge if not already created
            if (!this.bridge) {
                this.bridge = new CSharpExtensionBridge(this.bridgeOptions);
                
                // Set up error handling
                this.bridge.on('error', (error) => {
                    console.error(`[${this.name}] C# bridge error:`, error);
                });
                
                this.bridge.on('exit', (code) => {
                    console.warn(`[${this.name}] C# bridge exited with code: ${code}`);
                });
            }

            // Start bridge if not already started
            if (!this.bridge.isStarted) {
                await this.bridge.start();
            }

            // Validate that our extension is available
            const extensions = await this.bridge.discoverExtensions();
            const ourExtension = extensions.extensions?.find(ext => ext.name === this.extensionName);
            
            if (!ourExtension) {
                throw new Error(`C# extension '${this.extensionName}' not found in discovered extensions`);
            }

            // Update tool definitions from actual C# extension
            this._updateToolsFromDiscovery(ourExtension.tools || []);
            
            return true;
            
        } catch (error) {
            console.error(`[${this.name}] Initialization failed:`, error);
            return false;
        }
    }

    /**
     * Execute a tool via C# bridge
     */
    async executeTool(toolName, parameters = {}) {
        try {
            if (!this.bridge || !this.bridge.isReady) {
                throw new Error('C# bridge not ready');
            }

            // Strip the m3r__ prefix to get the actual tool name for C#
            const actualToolName = toolName.startsWith('m3r__') ? toolName : `m3r__${this.extensionName}__${toolName}`;
            
            const result = await this.bridge.executeTool(this.extensionName, actualToolName, parameters);
            
            return {
                success: true,
                message: result.message || 'Command executed successfully',
                data: result.data || result,
                executionTime: result.executionTime,
                warnings: result.warnings || []
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                errorCode: error.code || 'CSHARP_EXECUTION_ERROR'
            };
        }
    }

    /**
     * Check health of the C# extension
     */
    async checkHealth() {
        try {
            if (!this.bridge) {
                return {
                    isHealthy: false,
                    status: 'Bridge not initialized',
                    issues: ['C# bridge not created']
                };
            }

            if (!this.bridge.isReady) {
                return {
                    isHealthy: false,
                    status: 'Bridge not ready',
                    issues: ['C# bridge not started or not ready']
                };
            }

            const healthResult = await this.bridge.checkExtensionHealth(this.extensionName);
            
            return {
                isHealthy: healthResult.success && healthResult.isHealthy,
                status: healthResult.status || 'Unknown',
                dependencies: healthResult.dependencies || {},
                issues: healthResult.issues || [],
                responseTime: healthResult.responseTime
            };
            
        } catch (error) {
            return {
                isHealthy: false,
                status: 'Health check failed',
                issues: [error.message]
            };
        }
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        if (this.bridge) {
            try {
                await this.bridge.stop();
            } catch (error) {
                console.error(`[${this.name}] Error stopping bridge:`, error);
            }
            this.bridge = null;
        }
    }

    /**
     * Create tools array from C# tool definitions
     * @private
     */
    _createToolsFromDefinitions(toolDefinitions) {
        return toolDefinitions.map(toolDef => ({
            name: toolDef.name,
            description: toolDef.description || `C# tool: ${toolDef.name}`,
            inputSchema: toolDef.inputSchema || { 
                type: 'object',
                properties: {},
                additionalProperties: true
            },
            category: toolDef.category || 'csharp',
            timeout: toolDef.timeout || 30,
            handler: async (params) => {
                return this.executeTool(toolDef.name, params);
            }
        }));
    }

    /**
     * Update tools from discovered C# extension
     * @private
     */
    _updateToolsFromDiscovery(discoveredTools) {
        // Create a map of existing tools
        const existingTools = new Map(this.tools.map(tool => [tool.name, tool]));
        
        // Update or add tools based on discovery
        const updatedTools = discoveredTools.map(toolDef => {
            const existing = existingTools.get(toolDef.name);
            
            return {
                name: toolDef.name,
                description: toolDef.description || existing?.description || `C# tool: ${toolDef.name}`,
                inputSchema: toolDef.inputSchema || existing?.inputSchema || { 
                    type: 'object',
                    properties: {},
                    additionalProperties: true
                },
                category: toolDef.category || existing?.category || 'csharp',
                timeout: toolDef.timeout || existing?.timeout || 30,
                handler: async (params) => {
                    return this.executeTool(toolDef.name, params);
                }
            };
        });
        
        // Update the tools array
        this.tools = updatedTools;
        
        console.log(`[${this.name}] Updated with ${updatedTools.length} tools from C# discovery`);
    }

    /**
     * Get bridge status for debugging
     */
    getBridgeStatus() {
        return this.bridge ? this.bridge.getStatus() : { isStarted: false, isReady: false };
    }
}

/**
 * Factory function to create C# extension wrappers
 */
async function createCSharpExtensionWrapper(extensionName, options = {}) {
    const bridge = new CSharpExtensionBridge(options.bridgeOptions);
    
    try {
        // Start bridge and discover extensions
        await bridge.start();
        const discovery = await bridge.discoverExtensions();
        
        // Find the specific extension
        const extensionDef = discovery.extensions?.find(ext => ext.name === extensionName);
        if (!extensionDef) {
            await bridge.stop();
            throw new Error(`C# extension '${extensionName}' not found`);
        }

        // Create wrapper with discovered tool definitions
        const wrapper = new CSharpExtensionWrapper(
            extensionName, 
            extensionDef.tools || [],
            options.bridgeOptions
        );
        
        // Use the existing bridge
        wrapper.bridge = bridge;
        wrapper.bridge.isStarted = true;
        wrapper.bridge.isReady = true;
        
        return wrapper;
        
    } catch (error) {
        await bridge.stop();
        throw error;
    }
}

module.exports = { 
    CSharpExtensionWrapper,
    createCSharpExtensionWrapper
};