/**
 * MAK3R-HUB MCP Services Handler Index
 * Central registry for all MCP service handlers
 */

const SharpUtilMCPService = require('./sharputil-mcp-service');
const SystemDiagnosticsMCPService = require('./system-diagnostics');

class MCPServiceRegistry {
  constructor() {
    this.services = {
      sharputil: new SharpUtilMCPService(),
      systemDiagnostics: new SystemDiagnosticsMCPService()
    };
  }

  /**
     * Discover all available services and their capabilities
     */
  async discoverServices() {
    const discovered = {};
        
    for (const [name, service] of Object.entries(this.services)) {
      try {
        discovered[name] = await service.discoverCapabilities();
      } catch (error) {
        console.error(`Failed to discover ${name} service:`, error.message);
      }
    }
        
    return discovered;
  }

  /**
     * Query specific service
     */
  async queryService(serviceName, method, ...args) {
    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service '${serviceName}' not found`);
    }

    if (typeof service[method] !== 'function') {
      throw new Error(`Method '${method}' not found on service '${serviceName}'`);
    }

    return await service[method](...args);
  }

  /**
     * Get service status
     */
  async getServiceStatus() {
    const status = {};
        
    for (const [name, service] of Object.entries(this.services)) {
      try {
        status[name] = {
          available: true,
          executable: await service.findExecutable?.() || 'N/A',
          lastUpdated: new Date().toISOString()
        };
      } catch (error) {
        status[name] = {
          available: false,
          error: error.message,
          lastUpdated: new Date().toISOString()
        };
      }
    }
        
    return status;
  }
}

module.exports = MCPServiceRegistry;