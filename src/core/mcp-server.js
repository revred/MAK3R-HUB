/**
 * MAK3R-HUB MCP Server
 * Modular, testable MCP server with dependency injection
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const ConfigurationManager = require('./configuration-manager');
const ExpressServer = require('./express-server');
const ToolRegistry = require('./tool-registry');
const CredentialManager = require('./credential-manager');

// Import API handlers
const stripeHandler = require('../mcp/handlers/stripe');
const openaiHandler = require('../mcp/handlers/openai');
const cloudHandler = require('../mcp/handlers/cloud');
const githubHandler = require('../mcp/handlers/github');
const systemHandler = require('../mcp/handlers/system-diagnostics');
const sharpUtilHandler = require('../mcp/handlers/sharputil-mcp-service');
const depsHandler = require('../mcp/handlers/dependency-manager');
const csharpHandler = require('../mcp/handlers/csharp-builder');

class MAK3RMCPServer {
  constructor(options = {}) {
    this.config = options.config || new ConfigurationManager();
    this.expressServer = options.expressServer || new ExpressServer(this.config);
    this.toolRegistry = options.toolRegistry || new ToolRegistry();
    this.credentialManager = options.credentialManager || new CredentialManager(this.config);
    
    this.logger = options.logger || console;
    this.logPath = this.config.get('logging.logPath');
    
    this.server = new Server(
      {
        name: 'mak3r-hub-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
    this.setupApiRoutes();
  }

  async initialize() {
    await this.credentialManager.loadCredentials();
    this.syncCredentials();
    return this;
  }

  setupHandlers() {
    // Register tool handlers with the tool registry
    this.registerSystemHandlers();
    this.registerSharpUtilHandlers();
    this.registerDependencyHandlers();
    this.registerCSharpHandlers();
    this.registerLegacyHandlers();

    // Setup MCP request handlers
    this.server.setRequestHandler('tools/call', async (request) => {
      return await this.handleToolCall(request);
    });

    this.server.setRequestHandler('tools/list', async () => {
      return { tools: this.toolRegistry.getTools() };
    });
  }

  registerSystemHandlers() {
    this.toolRegistry.registerHandler('m3r__system__get_info', 
      (args) => systemHandler.getSystemInfo(args));
    this.toolRegistry.registerHandler('m3r__system__check_service', 
      (args) => systemHandler.checkService(args));
    this.toolRegistry.registerHandler('m3r__system__run_diagnostics', 
      (args) => systemHandler.runDiagnostics(args));
    this.toolRegistry.registerHandler('m3r__system__get_safe_commands', 
      (args) => systemHandler.getSafeCommands(args));
    this.toolRegistry.registerHandler('m3r__system__execute_safe_command', 
      (args) => systemHandler.executeSafeCommand(args));
  }

  registerSharpUtilHandlers() {
    this.toolRegistry.registerHandler('m3r__sharputil__query_capabilities', 
      (args) => sharpUtilHandler.queryCapabilities(args));
    this.toolRegistry.registerHandler('m3r__sharputil__get_command_help', 
      (args) => sharpUtilHandler.getCommandHelp(args));
    this.toolRegistry.registerHandler('m3r__sharputil__get_best_practices', 
      (args) => sharpUtilHandler.getBestPractices(args));
    this.toolRegistry.registerHandler('m3r__sharputil__check_executable', 
      (args) => sharpUtilHandler.checkExecutable(args));
    this.toolRegistry.registerHandler('m3r__sharputil__execute_command', 
      (args) => sharpUtilHandler.executeCommand(args));
  }

  registerDependencyHandlers() {
    this.toolRegistry.registerHandler('m3r__deps__detect_missing', 
      (args) => depsHandler.detectMissing(args));
    this.toolRegistry.registerHandler('m3r__deps__install_dependency', 
      (args) => depsHandler.installDependency(args));
    this.toolRegistry.registerHandler('m3r__deps__store_git_credentials', 
      async (args) => this.credentialManager.storeGitCredentials(args.username, args.token, args.service));
    this.toolRegistry.registerHandler('m3r__deps__get_git_credentials', 
      async (args) => this.credentialManager.getGitCredentials(args.service));
  }

  registerCSharpHandlers() {
    this.toolRegistry.registerHandler('m3r__csharp__create_project', 
      (args) => csharpHandler.createProject(args));
    this.toolRegistry.registerHandler('m3r__csharp__build_project', 
      (args) => csharpHandler.buildProject(args));
    this.toolRegistry.registerHandler('m3r__csharp__publish_project', 
      (args) => csharpHandler.publishProject(args));
    this.toolRegistry.registerHandler('m3r__csharp__add_nuget_package', 
      (args) => csharpHandler.addNuGetPackage(args));
    this.toolRegistry.registerHandler('m3r__csharp__run_tests', 
      (args) => csharpHandler.runTests(args));
  }

  registerLegacyHandlers() {
    // Legacy MCP handlers for backward compatibility
    this.toolRegistry.registerHandler('mcp__stripe__create_payment_intent', 
      async (args) => {
        const credentials = this.credentialManager.getCredentials('stripe');
        return stripeHandler.handle('POST', '/payment_intents', args, credentials);
      });

    this.toolRegistry.registerHandler('mcp__openai__chat_completion', 
      async (args) => {
        const credentials = this.credentialManager.getCredentials('openai');
        return openaiHandler.handle('POST', '/chat/completions', args, credentials);
      });

    this.toolRegistry.registerHandler('mcp__github__create_repo', 
      async (args) => {
        const credentials = this.credentialManager.getCredentials('github');
        return githubHandler.handle('POST', '/user/repos', args, credentials);
      });
  }

  setupApiRoutes() {
    this.expressServer.addApiRoute('/api/stripe', 'stripe', stripeHandler);
    this.expressServer.addApiRoute('/api/openai', 'openai', openaiHandler);
    this.expressServer.addApiRoute('/api/cloud', 'cloud', cloudHandler);
    this.expressServer.addApiRoute('/api/github', 'github', githubHandler);
  }

  async handleToolCall(request) {
    const { name, arguments: args } = request.params;
    
    try {
      // Validate arguments
      const validation = this.toolRegistry.validateArgs(name, args);
      if (!validation.valid) {
        throw new Error(`Invalid arguments: ${validation.errors.join(', ')}`);
      }

      // Execute handler
      const result = await this.toolRegistry.executeHandler(name, args);
      
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      this.logError(name, error);
      return {
        content: [
          {
            type: 'text',
            text: `Error executing ${name}: ${error.message}`
          }
        ]
      };
    }
  }

  syncCredentials() {
    // Sync credentials from credential manager to express server
    for (const service of this.credentialManager.listServices()) {
      const credentials = this.credentialManager.getCredentials(service);
      this.expressServer.setCredentials(service, credentials);
    }
  }

  async setCredentials(service, credentials) {
    await this.credentialManager.setCredentials(service, credentials);
    this.expressServer.setCredentials(service, credentials);
  }

  getServiceStatus() {
    const services = {};
    
    // Get credential status
    const credentialSummary = this.credentialManager.getCredentialsSummary();
    for (const [service, summary] of Object.entries(credentialSummary)) {
      services[service] = {
        status: summary.hasCredentials ? 'configured' : 'not_configured',
        fields: summary.fieldCount
      };
    }

    // Add system status
    services.mcp_server = {
      status: 'running',
      tools: this.toolRegistry.getTools().length,
      version: '1.0.0'
    };

    return services;
  }

  logError(context, error) {
    this.logger.error(`[${context}] ${error.message}`);
    if (error.stack && this.config.get('development.debugMode')) {
      this.logger.error(error.stack);
    }
  }

  async start() {
    const port = this.config.get('server.port');
    const host = this.config.get('server.host');

    return new Promise((resolve, reject) => {
      try {
        // Start Express server
        this.httpServer = this.expressServer.listen(port, host, () => {
          this.logger.info(`MAK3R-HUB MCP Server running on http://${host}:${port}`);
          resolve(this);
        });

        // Start MCP transport
        const transport = new StdioServerTransport();
        this.server.connect(transport);

      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    if (this.httpServer) {
      await new Promise(resolve => this.httpServer.close(resolve));
    }
    
    if (this.server) {
      await this.server.close();
    }
  }

  // Getters for testing
  getConfig() { return this.config; }
  getExpressServer() { return this.expressServer; }
  getToolRegistry() { return this.toolRegistry; }
  getCredentialManager() { return this.credentialManager; }
}

module.exports = MAK3RMCPServer;