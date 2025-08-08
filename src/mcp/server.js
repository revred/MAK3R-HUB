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