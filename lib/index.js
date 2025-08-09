/**
 * MAK3R-HUB - Universal Claude Code force multiplier
 * Main entry point for the library
 */

const MAK3RMCPServer = require('../src/core/mcp-server');
const ConfigurationManager = require('../src/core/configuration-manager');
const ExpressServer = require('../src/core/express-server');
const ToolRegistry = require('../src/core/tool-registry');
const CredentialManager = require('../src/core/credential-manager');

module.exports = {
  MAK3RMCPServer,
  ConfigurationManager,
  ExpressServer,
  ToolRegistry,
  CredentialManager,
  
  // Convenience method to create a server with default configuration
  createServer: (options = {}) => {
    const config = options.config || new ConfigurationManager();
    return new MAK3RMCPServer({
      config,
      ...options
    });
  },

  // Version info
  version: '0.1.0'
};