#!/usr/bin/env node

/**
 * MAK3R-HUB MCP Server (Fixed Version)
 * Implements proper MCP SDK v0.5.0 compatibility
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const fs = require('fs-extra');
const path = require('path');
const {
  toolsCallRequestSchema,
  toolsListRequestSchema,
  initializeRequestSchema,
  pingRequestSchema,
  toolsListResponseSchema,
  toolCallResponseSchema,
  errorResponseSchema
} = require('./schemas');

// Import handlers
const systemDiagnostics = require('./handlers/system-diagnostics');
const sharpUtilService = require('./handlers/sharputil-mcp-service');
const dependencyManager = require('./handlers/dependency-manager');
const csharpBuilder = require('./handlers/csharp-builder');

class MAK3RMCPServer {
  constructor(options = {}) {
    this.port = options.port || 3001;
    this.host = options.host || 'localhost';
    this.credentialsPath = path.join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.mak3r-hub',
      'credentials.json'
    );
    
    // Initialize server with proper configuration
    this.server = new Server(
      {
        name: 'mak3r-hub-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.credentials = new Map();
    this.setupHandlers();
    this.loadCredentials();
  }

  setupHandlers() {
    // Handle initialize request
    this.server.setRequestHandler(initializeRequestSchema, async (request) => {
      console.log('MCP Client connected:', request.params);
      return {
        protocolVersion: '0.5.0',
        capabilities: {
          tools: {}
        },
        serverInfo: {
          name: 'mak3r-hub-mcp',
          version: '1.0.0'
        }
      };
    });

    // Handle ping request
    this.server.setRequestHandler(pingRequestSchema, async () => {
      return { pong: true };
    });

    // Handle tools/list request
    this.server.setRequestHandler(toolsListRequestSchema, async () => {
      const tools = [
        // System Diagnostics Tools
        {
          name: 'm3r__system__get_info',
          description: 'Get comprehensive system information (Node.js version, OS, memory, etc.)',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'm3r__system__check_service',
          description: 'Check if a service or executable is available',
          inputSchema: {
            type: 'object',
            properties: {
              serviceName: { type: 'string', description: 'Name of service to check' },
              executablePath: { type: 'string', description: 'Optional specific path to executable' }
            },
            required: ['serviceName']
          }
        },
        {
          name: 'm3r__system__run_diagnostics',
          description: 'Run comprehensive system diagnostics with recommendations',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'm3r__system__get_safe_commands',
          description: 'Get OS-specific safe command recommendations',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'm3r__system__execute_safe_command',
          description: 'Execute a command safely with OS-specific validation',
          inputSchema: {
            type: 'object',
            properties: {
              operation: { type: 'string', description: 'Operation to perform' },
              args: { 
                type: 'array', 
                items: { type: 'string' }, 
                description: 'Command arguments' 
              }
            },
            required: ['operation']
          }
        },
        
        // SharpUtility Tools
        {
          name: 'm3r__sharputil__query_capabilities',
          description: 'Query all sharpUtility capabilities - replaces all SHARPUTIL-*.md files',
          inputSchema: {
            type: 'object',
            properties: {
              category: { type: 'string', description: 'Optional category filter' }
            }
          }
        },
        {
          name: 'm3r__sharputil__get_command_help',
          description: 'Get detailed help for specific sharpUtility command',
          inputSchema: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Command key (A-Z)' }
            },
            required: ['command']
          }
        },
        {
          name: 'm3r__sharputil__get_best_practices',
          description: 'Get sharpUtility best practices',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'm3r__sharputil__check_executable',
          description: 'Check if sharpUtilityGUI.exe is available and get status',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'm3r__sharputil__execute_command',
          description: 'Execute a sharpUtility command',
          inputSchema: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Command to execute' },
              args: {
                type: 'array',
                items: { type: 'string' },
                description: 'Command arguments'
              }
            },
            required: ['command']
          }
        },
        
        // Dependency Management Tools
        {
          name: 'm3r__deps__detect_missing',
          description: 'Auto-detect missing dependencies',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'm3r__deps__install_dependency',
          description: 'Auto-install dependencies via package managers',
          inputSchema: {
            type: 'object',
            properties: {
              dependencyName: { type: 'string', description: 'Name of dependency to install' }
            },
            required: ['dependencyName']
          }
        },
        {
          name: 'm3r__deps__store_git_credentials',
          description: 'Securely store Git/GitHub credentials',
          inputSchema: {
            type: 'object',
            properties: {
              username: { type: 'string', description: 'Git username' },
              email: { type: 'string', description: 'Git email' },
              token: { type: 'string', description: 'GitHub personal access token' }
            },
            required: ['username', 'email', 'token']
          }
        },
        {
          name: 'm3r__deps__get_git_credentials',
          description: 'Retrieve stored Git credentials',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        
        // C# Build Tools
        {
          name: 'm3r__csharp__create_project',
          description: 'Create a new C# project',
          inputSchema: {
            type: 'object',
            properties: {
              projectName: { type: 'string', description: 'Name of the project' },
              projectType: { type: 'string', description: 'Type of project (console, classlib, etc.)' },
              targetFramework: { type: 'string', description: 'Target framework (net9.0, etc.)' }
            },
            required: ['projectName', 'projectType']
          }
        },
        {
          name: 'm3r__csharp__build_project',
          description: 'Build a C# project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to project file' },
              configuration: { 
                type: 'string', 
                enum: ['Debug', 'Release'],
                description: 'Build configuration' 
              }
            },
            required: ['projectPath']
          }
        },
        {
          name: 'm3r__csharp__publish_project',
          description: 'Publish a C# project',
          inputSchema: {
            type: 'object',
            properties: {
              projectPath: { type: 'string', description: 'Path to project file' },
              runtime: { type: 'string', description: 'Target runtime' },
              selfContained: { type: 'boolean', description: 'Create self-contained deployment' }
            },
            required: ['projectPath']
          }
        }
      ];

      return { tools };
    });

    // Handle tools/call request
    this.server.setRequestHandler(toolsCallRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        let result;
        
        // Route to appropriate handler based on tool name
        switch (name) {
          // System Diagnostics
          case 'm3r__system__get_info':
            result = await systemDiagnostics.getSystemInfo();
            break;
          case 'm3r__system__check_service':
            result = await systemDiagnostics.checkService(args);
            break;
          case 'm3r__system__run_diagnostics':
            result = await systemDiagnostics.runDiagnostics();
            break;
          case 'm3r__system__get_safe_commands':
            result = await systemDiagnostics.getSafeCommands();
            break;
          case 'm3r__system__execute_safe_command':
            result = await systemDiagnostics.executeSafeCommand(args);
            break;
            
          // SharpUtility
          case 'm3r__sharputil__query_capabilities':
            result = await sharpUtilService.queryCapabilities(args);
            break;
          case 'm3r__sharputil__get_command_help':
            result = await sharpUtilService.getCommandHelp(args);
            break;
          case 'm3r__sharputil__get_best_practices':
            result = await sharpUtilService.getBestPractices();
            break;
          case 'm3r__sharputil__check_executable':
            result = await sharpUtilService.checkExecutable();
            break;
          case 'm3r__sharputil__execute_command':
            result = await sharpUtilService.executeCommand(args);
            break;
            
          // Dependency Management
          case 'm3r__deps__detect_missing':
            result = await dependencyManager.detectMissing();
            break;
          case 'm3r__deps__install_dependency':
            result = await dependencyManager.installDependency(args);
            break;
          case 'm3r__deps__store_git_credentials':
            result = await dependencyManager.storeGitCredentials(args);
            break;
          case 'm3r__deps__get_git_credentials':
            result = await dependencyManager.getGitCredentials();
            break;
            
          // C# Build
          case 'm3r__csharp__create_project':
            result = await csharpBuilder.createProject(args);
            break;
          case 'm3r__csharp__build_project':
            result = await csharpBuilder.buildProject(args);
            break;
          case 'm3r__csharp__publish_project':
            result = await csharpBuilder.publishProject(args);
            break;
            
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        // Format response according to MCP spec
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      } catch (error) {
        console.error(`Error executing tool ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`
            }
          ]
        };
      }
    });
  }

  async loadCredentials() {
    try {
      if (await fs.pathExists(this.credentialsPath)) {
        const data = await fs.readFile(this.credentialsPath, 'utf8');
        const creds = JSON.parse(data);
        for (const [service, credential] of Object.entries(creds)) {
          this.credentials.set(service, credential);
        }
      }
    } catch (error) {
      console.warn('Could not load credentials:', error.message);
    }
  }

  async setCredentials(service, credentials) {
    this.credentials.set(service, credentials);
  }

  async start() {
    try {
      console.log('🚀 Starting MAK3R-HUB MCP Server (Fixed)...');
      
      // Create and connect stdio transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.log('✅ MCP Server started successfully');
      console.log(`📡 Server running on stdio transport`);
      console.log('📋 Ready to handle MCP requests');
      
      // Handle process termination
      process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down MCP server...');
        await this.server.close();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('❌ Failed to start MCP server:', error);
      throw error;
    }
  }

  async stop() {
    if (this.server) {
      await this.server.close();
    }
  }
}

// If run directly, start the server
if (require.main === module) {
  const server = new MAK3RMCPServer();
  server.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = MAK3RMCPServer;