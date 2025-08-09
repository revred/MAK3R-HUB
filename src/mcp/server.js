#!/usr/bin/env node

/**
 * MAK3R-HUB MCP Server
 * Secure gateway for external API integrations
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Import API handlers
const stripeHandler = require('./handlers/stripe');
const openaiHandler = require('./handlers/openai');
const cloudHandler = require('./handlers/cloud');
const githubHandler = require('./handlers/github');
const MCPServiceRegistry = require('./handlers/index');

class MAK3RMCPServer {
  constructor(options = {}) {
    this.port = options.port || 3001;
    this.host = options.host || 'localhost';
    this.credentialsPath = path.join(process.env.HOME || process.env.USERPROFILE, '.mak3r-hub', 'credentials.json');
    this.logPath = path.join(process.env.HOME || process.env.USERPROFILE, '.mak3r-hub', 'mcp.log');
    
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

    this.expressApp = express();
    this.credentials = new Map();
    this.serviceRegistry = new MCPServiceRegistry();
    this.setupExpress();
    this.setupHandlers();
    this.loadCredentials();
  }

  setupExpress() {
    // Security middleware
    this.expressApp.use(helmet());
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP'
    });
    this.expressApp.use('/api/', limiter);

    // JSON parsing
    this.expressApp.use(express.json({ limit: '10mb' }));

    // Health check endpoint
    this.expressApp.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        services: this.getServiceStatus()
      });
    });

    // API routes
    this.expressApp.use('/api/stripe', this.createApiRouter('stripe', stripeHandler));
    this.expressApp.use('/api/openai', this.createApiRouter('openai', openaiHandler));
    this.expressApp.use('/api/cloud', this.createApiRouter('cloud', cloudHandler));
    this.expressApp.use('/api/github', this.createApiRouter('github', githubHandler));
  }

  createApiRouter(serviceName, handler) {
    const router = express.Router();
    
    // Middleware to validate credentials
    router.use((req, res, next) => {
      const credentials = this.credentials.get(serviceName);
      if (!credentials) {
        return res.status(401).json({ 
          error: `No credentials configured for ${serviceName}` 
        });
      }
      req.credentials = credentials;
      next();
    });

    // Proxy all requests to the handler
    router.all('/*', async (req, res) => {
      try {
        const result = await handler.handle(req.method, req.path, req.body, req.credentials);
        res.json(result);
      } catch (error) {
        this.logError(serviceName, error);
        res.status(500).json({ 
          error: error.message,
          service: serviceName
        });
      }
    });

    return router;
  }

  setupHandlers() {
    // Stripe tools
    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        switch (name) {
        // System Diagnostics M3R Tools
        case 'm3r__system__get_info':
          return await this.handleSystemGetInfo(args);
        case 'm3r__system__check_service':
          return await this.handleSystemCheckService(args);
        case 'm3r__system__run_diagnostics':
          return await this.handleSystemRunDiagnostics(args);
        case 'm3r__system__get_safe_commands':
          return await this.handleSystemGetSafeCommands(args);
        case 'm3r__system__execute_safe_command':
          return await this.handleSystemExecuteSafeCommand(args);
            
          // SharpUtility M3R Tools
        case 'm3r__sharputil__query_capabilities':
          return await this.handleSharpUtilQueryCapabilities(args);
        case 'm3r__sharputil__get_command_help':
          return await this.handleSharpUtilCommandHelp(args);
        case 'm3r__sharputil__get_best_practices':
          return await this.handleSharpUtilBestPractices(args);
        case 'm3r__sharputil__check_executable':
          return await this.handleSharpUtilCheckExecutable(args);
        case 'm3r__sharputil__execute_command':
          return await this.handleSharpUtilExecuteCommand(args);
            
          // Dependency Management M3R Tools
        case 'm3r__deps__detect_missing':
          return await this.handleDepsDetectMissing(args);
        case 'm3r__deps__install_dependency':
          return await this.handleDepsInstallDependency(args);
        case 'm3r__deps__store_git_credentials':
          return await this.handleDepsStoreGitCredentials(args);
        case 'm3r__deps__get_git_credentials':
          return await this.handleDepsGetGitCredentials(args);
            
          // C# Build Management M3R Tools
        case 'm3r__csharp__create_project':
          return await this.handleCSharpCreateProject(args);
        case 'm3r__csharp__build_project':
          return await this.handleCSharpBuildProject(args);
        case 'm3r__csharp__publish_project':
          return await this.handleCSharpPublishProject(args);
        case 'm3r__csharp__add_nuget_package':
          return await this.handleCSharpAddNuGetPackage(args);
        case 'm3r__csharp__run_tests':
          return await this.handleCSharpRunTests(args);
            
        case 'mcp__stripe__create_payment_intent':
          return await this.handleStripePaymentIntent(args);
        case 'mcp__stripe__list_customers':
          return await this.handleStripeListCustomers(args);
        case 'mcp__stripe__create_subscription':
          return await this.handleStripeSubscription(args);
            
        case 'mcp__openai__chat_completion':
          return await this.handleOpenAIChat(args);
        case 'mcp__openai__analyze_code':
          return await this.handleOpenAICodeAnalysis(args);
            
        case 'mcp__github__create_repo':
          return await this.handleGitHubCreateRepo(args);
        case 'mcp__github__create_pr':
          return await this.handleGitHubCreatePR(args);
            
        case 'mcp__aws__deploy_lambda':
          return await this.handleAWSDeployLambda(args);
        case 'mcp__vercel__deploy_site':
          return await this.handleVercelDeploy(args);
            
        default:
          throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logError(name, error);
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

    // List available tools
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          // System Diagnostics M3R Tools
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
                args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' }
              },
              required: ['operation']
            }
          },
          
          // SharpUtility M3R Tools
          {
            name: 'm3r__sharputil__query_capabilities',
            description: 'Query all sharpUtility capabilities - replaces all SHARPUTIL-*.md files',
            inputSchema: {
              type: 'object',
              properties: {
                category: { type: 'string', description: 'Optional category filter (discovery, serverManagement, etc.)' }
              }
            }
          },
          {
            name: 'm3r__sharputil__get_command_help',
            description: 'Get detailed help for specific sharpUtility command - replaces SHARPUTIL-USAGE.md',
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
            description: 'Get sharpUtility best practices - replaces SHARPUTIL-BEST-PRACTICES.md',
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
            description: 'Execute sharpUtility command safely',
            inputSchema: {
              type: 'object',
              properties: {
                command: { type: 'string', description: 'Command key (A-Z)' },
                args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' }
              },
              required: ['command']
            }
          },
          
          // Dependency Management M3R Tools
          {
            name: 'm3r__deps__detect_missing',
            description: 'Detect missing development dependencies (Git, Node.js, Python, etc.)',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'm3r__deps__install_dependency',
            description: 'Auto-install missing dependency with user consent',
            inputSchema: {
              type: 'object',
              properties: {
                dependencyName: { type: 'string', description: 'Name of dependency to install (git, nodejs, python, dotnet)' },
                version: { type: 'string', description: 'Version to install (default: latest)' },
                force: { type: 'boolean', description: 'Skip user consent prompt', default: false }
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
                token: { type: 'string', description: 'GitHub personal access token' },
                provider: { type: 'string', description: 'Git provider (github, gitlab, etc.)', default: 'github' }
              },
              required: ['username', 'email', 'token']
            }
          },
          {
            name: 'm3r__deps__get_git_credentials',
            description: 'Retrieve stored Git credentials',
            inputSchema: {
              type: 'object',
              properties: {
                provider: { type: 'string', description: 'Git provider', default: 'github' }
              }
            }
          },
          
          // Stripe Tools
          {
            name: 'mcp__stripe__create_payment_intent',
            description: 'Create a Stripe payment intent',
            inputSchema: {
              type: 'object',
              properties: {
                amount: { type: 'number', description: 'Amount in cents' },
                currency: { type: 'string', default: 'usd' },
                customer_id: { type: 'string', description: 'Customer ID' }
              },
              required: ['amount']
            }
          },
          {
            name: 'mcp__stripe__list_customers',
            description: 'List Stripe customers',
            inputSchema: {
              type: 'object',
              properties: {
                limit: { type: 'number', default: 10 },
                starting_after: { type: 'string' }
              }
            }
          },
          {
            name: 'mcp__stripe__create_subscription',
            description: 'Create a Stripe subscription',
            inputSchema: {
              type: 'object',
              properties: {
                customer_id: { type: 'string' },
                price_id: { type: 'string' },
                trial_days: { type: 'number' }
              },
              required: ['customer_id', 'price_id']
            }
          },
          
          // OpenAI Tools
          {
            name: 'mcp__openai__chat_completion',
            description: 'Get OpenAI chat completion',
            inputSchema: {
              type: 'object',
              properties: {
                messages: { 
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                      content: { type: 'string' }
                    }
                  }
                },
                model: { type: 'string', default: 'gpt-4' },
                max_tokens: { type: 'number', default: 1000 }
              },
              required: ['messages']
            }
          },
          {
            name: 'mcp__openai__analyze_code',
            description: 'Analyze code using OpenAI',
            inputSchema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                language: { type: 'string' },
                analysis_type: { type: 'string', enum: ['security', 'performance', 'style', 'bugs'] }
              },
              required: ['code']
            }
          },
          
          // GitHub Tools
          {
            name: 'mcp__github__create_repo',
            description: 'Create a GitHub repository',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                private: { type: 'boolean', default: false },
                auto_init: { type: 'boolean', default: true }
              },
              required: ['name']
            }
          },
          {
            name: 'mcp__github__create_pr',
            description: 'Create a GitHub pull request',
            inputSchema: {
              type: 'object',
              properties: {
                owner: { type: 'string' },
                repo: { type: 'string' },
                title: { type: 'string' },
                body: { type: 'string' },
                head: { type: 'string' },
                base: { type: 'string', default: 'main' }
              },
              required: ['owner', 'repo', 'title', 'head']
            }
          },
          
          // Cloud Tools
          {
            name: 'mcp__aws__deploy_lambda',
            description: 'Deploy AWS Lambda function',
            inputSchema: {
              type: 'object',
              properties: {
                function_name: { type: 'string' },
                zip_file: { type: 'string', description: 'Base64 encoded zip file' },
                runtime: { type: 'string', default: 'nodejs18.x' },
                handler: { type: 'string', default: 'index.handler' }
              },
              required: ['function_name', 'zip_file']
            }
          },
          {
            name: 'mcp__vercel__deploy_site',
            description: 'Deploy site to Vercel',
            inputSchema: {
              type: 'object',
              properties: {
                project_path: { type: 'string' },
                build_command: { type: 'string' },
                output_directory: { type: 'string' }
              },
              required: ['project_path']
            }
          }
        ]
      };
    });
  }

  // System Diagnostics Handler implementations
  async handleSystemGetInfo(args) {
    try {
      const systemInfo = await this.serviceRegistry.queryService('systemDiagnostics', 'getSystemInfo');
      this.logActivity('system', 'get_info', {});
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(systemInfo, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting system info: ${error.message}`
          }
        ]
      };
    }
  }

  async handleSystemCheckService(args) {
    try {
      const serviceStatus = await this.serviceRegistry.queryService('systemDiagnostics', 'checkServiceAvailability', args.serviceName, args.executablePath);
      this.logActivity('system', 'check_service', { serviceName: args.serviceName });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(serviceStatus, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error checking service: ${error.message}`
          }
        ]
      };
    }
  }

  async handleSystemRunDiagnostics(args) {
    try {
      const diagnostics = await this.serviceRegistry.queryService('systemDiagnostics', 'runDiagnostics');
      this.logActivity('system', 'run_diagnostics', {});
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(diagnostics, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error running diagnostics: ${error.message}`
          }
        ]
      };
    }
  }

  async handleSystemGetSafeCommands(args) {
    try {
      const safeCommands = await this.serviceRegistry.queryService('systemDiagnostics', 'getSafeCommands');
      this.logActivity('system', 'get_safe_commands', {});
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(safeCommands, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting safe commands: ${error.message}`
          }
        ]
      };
    }
  }

  async handleSystemExecuteSafeCommand(args) {
    try {
      const result = await this.serviceRegistry.queryService('systemDiagnostics', 'executeSafeCommand', args.operation, ...(args.args || []));
      this.logActivity('system', 'execute_safe_command', { operation: args.operation });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing safe command: ${error.message}`
          }
        ]
      };
    }
  }

  // SharpUtility Handler implementations
  async handleSharpUtilQueryCapabilities(args) {
    try {
      const capabilities = await this.serviceRegistry.queryService('sharputil', 'queryCapabilities', args.category);
      this.logActivity('sharputil', 'query_capabilities', { category: args.category });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(capabilities, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error querying sharpUtil capabilities: ${error.message}`
          }
        ]
      };
    }
  }

  async handleSharpUtilCommandHelp(args) {
    try {
      const help = await this.serviceRegistry.queryService('sharputil', 'getCommandHelp', args.command);
      this.logActivity('sharputil', 'get_command_help', { command: args.command });
      
      return {
        content: [
          {
            type: 'text',
            text: help ? JSON.stringify(help, null, 2) : `No help found for command: ${args.command}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting command help: ${error.message}`
          }
        ]
      };
    }
  }

  async handleSharpUtilBestPractices(args) {
    try {
      const practices = await this.serviceRegistry.queryService('sharputil', 'getBestPractices');
      this.logActivity('sharputil', 'get_best_practices', {});
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(practices, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting best practices: ${error.message}`
          }
        ]
      };
    }
  }

  async handleSharpUtilCheckExecutable(args) {
    try {
      const executable = await this.serviceRegistry.queryService('sharputil', 'findExecutable');
      const status = await this.serviceRegistry.getServiceStatus();
      this.logActivity('sharputil', 'check_executable', {});
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              executable: executable,
              available: executable !== null,
              serviceStatus: status.sharputil
            }, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error checking executable: ${error.message}`
          }
        ]
      };
    }
  }

  async handleSharpUtilExecuteCommand(args) {
    try {
      const result = await this.serviceRegistry.queryService('sharputil', 'executeCommand', args.command, args.args || []);
      this.logActivity('sharputil', 'execute_command', { command: args.command });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing command: ${error.message}`
          }
        ]
      };
    }
  }

  // Dependency Management Handler implementations
  async handleDepsDetectMissing(args) {
    try {
      const dependencyManager = this.serviceRegistry.services.get('dependencyManager') || 
                               this.serviceRegistry.registerService('dependencyManager', new (require('./handlers/dependency-manager')).DependencyManager());
      
      const result = await dependencyManager.detectMissingDependencies();
      this.logActivity('deps', 'detect_missing', {});
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error detecting dependencies: ${error.message}`
          }
        ]
      };
    }
  }

  async handleDepsInstallDependency(args) {
    try {
      const dependencyManager = this.serviceRegistry.services.get('dependencyManager') || 
                               this.serviceRegistry.registerService('dependencyManager', new (require('./handlers/dependency-manager')).DependencyManager());
      
      const result = await dependencyManager.installDependency(args.dependencyName, {
        version: args.version,
        force: args.force
      });
      this.logActivity('deps', 'install_dependency', { dependency: args.dependencyName });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error installing dependency: ${error.message}`
          }
        ]
      };
    }
  }

  async handleDepsStoreGitCredentials(args) {
    try {
      const dependencyManager = this.serviceRegistry.services.get('dependencyManager') || 
                               this.serviceRegistry.registerService('dependencyManager', new (require('./handlers/dependency-manager')).DependencyManager());
      
      const result = await dependencyManager.storeGitCredentials({
        username: args.username,
        email: args.email,
        token: args.token,
        provider: args.provider || 'github'
      });
      this.logActivity('deps', 'store_git_credentials', { provider: args.provider });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error storing Git credentials: ${error.message}`
          }
        ]
      };
    }
  }

  async handleDepsGetGitCredentials(args) {
    try {
      const dependencyManager = this.serviceRegistry.services.get('dependencyManager') || 
                               this.serviceRegistry.registerService('dependencyManager', new (require('./handlers/dependency-manager')).DependencyManager());
      
      const result = await dependencyManager.getGitCredentials(args.provider || 'github');
      this.logActivity('deps', 'get_git_credentials', { provider: args.provider });
      
      // Don't log the actual token for security
      const safeResult = { ...result };
      if (safeResult.token) {
        safeResult.token = '***REDACTED***';
      }
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(safeResult, null, 2)
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error retrieving Git credentials: ${error.message}`
          }
        ]
      };
    }
  }

  // Handler implementations
  async handleStripePaymentIntent(args) {
    const credentials = this.credentials.get('stripe');
    if (!credentials) throw new Error('Stripe credentials not configured');
    
    const result = await stripeHandler.createPaymentIntent(args, credentials);
    this.logActivity('stripe', 'create_payment_intent', args);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleStripeListCustomers(args) {
    const credentials = this.credentials.get('stripe');
    const result = await stripeHandler.listCustomers(args, credentials);
    this.logActivity('stripe', 'list_customers', args);
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${result.data.length} customers:\\n${JSON.stringify(result.data, null, 2)}`
        }
      ]
    };
  }

  async handleStripeSubscription(args) {
    const credentials = this.credentials.get('stripe');
    const result = await stripeHandler.createSubscription(args, credentials);
    this.logActivity('stripe', 'create_subscription', args);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  }

  async handleOpenAIChat(args) {
    const credentials = this.credentials.get('openai');
    const result = await openaiHandler.chatCompletion(args, credentials);
    this.logActivity('openai', 'chat_completion', { message_count: args.messages.length });
    
    return {
      content: [
        {
          type: 'text',
          text: result.choices[0].message.content
        }
      ]
    };
  }

  async handleOpenAICodeAnalysis(args) {
    const credentials = this.credentials.get('openai');
    const result = await openaiHandler.analyzeCode(args, credentials);
    this.logActivity('openai', 'analyze_code', { language: args.language });
    
    return {
      content: [
        {
          type: 'text',
          text: result.choices[0].message.content
        }
      ]
    };
  }

  async handleGitHubCreateRepo(args) {
    const credentials = this.credentials.get('github');
    const result = await githubHandler.createRepo(args, credentials);
    this.logActivity('github', 'create_repo', { name: args.name });
    
    return {
      content: [
        {
          type: 'text',
          text: `Repository created: ${result.html_url}`
        }
      ]
    };
  }

  async handleGitHubCreatePR(args) {
    const credentials = this.credentials.get('github');
    const result = await githubHandler.createPR(args, credentials);
    this.logActivity('github', 'create_pr', { repo: `${args.owner}/${args.repo}` });
    
    return {
      content: [
        {
          type: 'text',
          text: `Pull request created: ${result.html_url}`
        }
      ]
    };
  }

  async handleAWSDeployLambda(args) {
    const credentials = this.credentials.get('aws');
    const result = await cloudHandler.deployLambda(args, credentials);
    this.logActivity('aws', 'deploy_lambda', { function_name: args.function_name });
    
    return {
      content: [
        {
          type: 'text',
          text: `Lambda function deployed: ${result.FunctionArn}`
        }
      ]
    };
  }

  async handleVercelDeploy(args) {
    const credentials = this.credentials.get('vercel');
    const result = await cloudHandler.deployVercel(args, credentials);
    this.logActivity('vercel', 'deploy_site', { project_path: args.project_path });
    
    return {
      content: [
        {
          type: 'text',
          text: `Site deployed: ${result.url}`
        }
      ]
    };
  }

  async loadCredentials() {
    try {
      if (await fs.pathExists(this.credentialsPath)) {
        const encryptedData = await fs.readFile(this.credentialsPath, 'utf8');
        const decryptedData = this.decrypt(encryptedData);
        const credentials = JSON.parse(decryptedData);
        
        for (const [service, creds] of Object.entries(credentials)) {
          this.credentials.set(service, creds);
        }
        
        console.log(`Loaded credentials for ${this.credentials.size} services`);
      }
    } catch (error) {
      console.warn('Failed to load credentials:', error.message);
    }
  }

  async saveCredentials() {
    try {
      await fs.ensureDir(path.dirname(this.credentialsPath));
      
      const credentials = {};
      for (const [service, creds] of this.credentials.entries()) {
        credentials[service] = creds;
      }
      
      const encryptedData = this.encrypt(JSON.stringify(credentials));
      await fs.writeFile(this.credentialsPath, encryptedData, 'utf8');
      
      console.log('Credentials saved securely');
    } catch (error) {
      console.error('Failed to save credentials:', error.message);
    }
  }

  encrypt(text) {
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-cbc', key);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(text) {
    const key = this.getEncryptionKey();
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = parts.join(':');
    const decipher = crypto.createDecipher('aes-256-cbc', key);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  getEncryptionKey() {
    return process.env.MAK3R_HUB_ENCRYPTION_KEY || 'default-key-change-in-production';
  }

  getServiceStatus() {
    const status = {};
    for (const service of this.credentials.keys()) {
      status[service] = 'configured';
    }
    return status;
  }

  logActivity(service, action, metadata = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      service,
      action,
      metadata: { ...metadata, ip: 'localhost' }
    };
    
    fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\\n')
      .catch(console.error);
  }

  logError(context, error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      context,
      error: error.message,
      stack: error.stack
    };
    
    fs.appendFile(this.logPath, JSON.stringify(logEntry) + '\\n')
      .catch(console.error);
  }

  async setCredentials(service, credentials) {
    this.credentials.set(service, credentials);
    await this.saveCredentials();
    console.log(`Credentials configured for ${service}`);
  }

  async start() {
    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Start HTTP API server
    this.expressApp.listen(this.port, this.host, () => {
      console.log(`MAK3R-HUB MCP Server running on ${this.host}:${this.port}`);
      console.log(`Configured services: ${Array.from(this.credentials.keys()).join(', ')}`);
    });
  }
}

// CLI interface
if (require.main === module) {
  const server = new MAK3RMCPServer();
  server.start().catch(console.error);
}

module.exports = MAK3RMCPServer;