/**
 * C# Bridge Manager - Efficiently manages shared C# extension bridge
 * Provides singleton bridge instance for multiple C# extensions
 */

const { CSharpExtensionBridge } = require('./csharp-bridge');
const { EventEmitter } = require('events');

class CSharpBridgeManager extends EventEmitter {
    constructor() {
        super();
        this.bridge = null;
        this.refCount = 0;
        this.extensions = new Map();
        this.isInitializing = false;
        this.initPromise = null;
    }

    /**
     * Get or create the shared C# bridge instance
     */
    async getBridge(options = {}) {
        if (this.bridge && this.bridge.isReady) {
            this.refCount++;
            return this.bridge;
        }

        if (this.isInitializing) {
            return this.initPromise;
        }

        this.isInitializing = true;
        this.initPromise = this._createBridge(options);
        
        try {
            this.bridge = await this.initPromise;
            this.refCount = 1;
            this.isInitializing = false;
            return this.bridge;
        } catch (error) {
            this.isInitializing = false;
            this.initPromise = null;
            throw error;
        }
    }

    /**
     * Release a reference to the bridge
     */
    async releaseBridge() {
        if (!this.bridge) {
            return;
        }

        this.refCount = Math.max(0, this.refCount - 1);
        
        // Stop bridge if no more references
        if (this.refCount === 0) {
            try {
                await this.bridge.stop();
            } catch (error) {
                console.error('Error stopping C# bridge:', error);
            }
            this.bridge = null;
        }
    }

    /**
     * Register a C# extension with the manager
     */
    async registerExtension(extensionName, options = {}) {
        if (this.extensions.has(extensionName)) {
            return this.extensions.get(extensionName);
        }

        try {
            const bridge = await this.getBridge(options.bridgeOptions);
            
            // Discover extensions to validate it exists
            const discovery = await bridge.discoverExtensions();
            const extensionDef = discovery.extensions?.find(ext => ext.name === extensionName);
            
            if (!extensionDef) {
                await this.releaseBridge();
                throw new Error(`C# extension '${extensionName}' not found`);
            }

            const extensionInfo = {
                name: extensionName,
                definition: extensionDef,
                bridge,
                registeredAt: new Date()
            };

            this.extensions.set(extensionName, extensionInfo);
            this.emit('extension-registered', extensionInfo);
            
            return extensionInfo;
            
        } catch (error) {
            throw new Error(`Failed to register C# extension '${extensionName}': ${error.message}`);
        }
    }

    /**
     * Unregister a C# extension
     */
    async unregisterExtension(extensionName) {
        if (!this.extensions.has(extensionName)) {
            return;
        }

        this.extensions.delete(extensionName);
        await this.releaseBridge();
        
        this.emit('extension-unregistered', { name: extensionName });
    }

    /**
     * Execute a tool from a registered C# extension
     */
    async executeTool(extensionName, toolName, parameters = {}) {
        const extensionInfo = this.extensions.get(extensionName);
        if (!extensionInfo) {
            throw new Error(`C# extension '${extensionName}' not registered`);
        }

        return extensionInfo.bridge.executeTool(extensionName, toolName, parameters);
    }

    /**
     * Check health of a registered C# extension
     */
    async checkExtensionHealth(extensionName) {
        const extensionInfo = this.extensions.get(extensionName);
        if (!extensionInfo) {
            throw new Error(`C# extension '${extensionName}' not registered`);
        }

        return extensionInfo.bridge.checkExtensionHealth(extensionName);
    }

    /**
     * Get all registered C# extensions
     */
    getRegisteredExtensions() {
        return Array.from(this.extensions.values()).map(info => ({
            name: info.name,
            version: info.definition.version,
            description: info.definition.description,
            author: info.definition.author,
            tools: info.definition.tools || [],
            registeredAt: info.registeredAt
        }));
    }

    /**
     * Get manager status
     */
    getStatus() {
        return {
            bridgeStatus: this.bridge ? this.bridge.getStatus() : { isStarted: false, isReady: false },
            refCount: this.refCount,
            registeredExtensions: this.extensions.size,
            isInitializing: this.isInitializing
        };
    }

    /**
     * Cleanup all resources
     */
    async cleanup() {
        // Unregister all extensions
        const extensionNames = Array.from(this.extensions.keys());
        for (const name of extensionNames) {
            await this.unregisterExtension(name);
        }

        // Force stop the bridge
        if (this.bridge) {
            try {
                await this.bridge.stop();
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
            this.bridge = null;
        }

        this.refCount = 0;
        this.isInitializing = false;
        this.initPromise = null;
    }

    /**
     * Create and initialize a new bridge
     * @private
     */
    async _createBridge(options = {}) {
        const bridge = new CSharpExtensionBridge({
            enableLogging: true,
            ...options
        });

        // Forward bridge events
        bridge.on('error', (error) => {
            this.emit('bridge-error', error);
        });

        bridge.on('exit', (code) => {
            this.emit('bridge-exit', code);
            // Reset bridge state
            this.bridge = null;
            this.refCount = 0;
            this.extensions.clear();
        });

        bridge.on('log', (logEntry) => {
            this.emit('log', logEntry);
        });

        await bridge.start();
        return bridge;
    }
}

// Singleton instance
let instance = null;

/**
 * Get the singleton bridge manager instance
 */
function getBridgeManager() {
    if (!instance) {
        instance = new CSharpBridgeManager();
        
        // Handle process exit
        process.on('exit', () => {
            if (instance) {
                instance.cleanup().catch(console.error);
            }
        });
        
        process.on('SIGINT', async () => {
            if (instance) {
                await instance.cleanup();
            }
            process.exit(0);
        });
    }
    return instance;
}

module.exports = { 
    CSharpBridgeManager, 
    getBridgeManager 
};