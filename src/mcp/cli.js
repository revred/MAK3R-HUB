#!/usr/bin/env node

/**
 * MAK3R-HUB MCP CLI
 * Command-line interface for managing MCP service and credentials
 */

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const MAK3RMCPServer = require('./server');
const CredentialManager = require('./credentials/manager');

class MCPClient {
  constructor() {
    this.credentialManager = new CredentialManager();
    this.server = null;
  }

  async initialize() {
    await this.credentialManager.initialize();
  }

  async startServer(options) {
    try {
      console.log(chalk.blue('🚀 Starting MAK3R-HUB MCP Server...'));
      
      this.server = new MAK3RMCPServer({
        port: options.port || 3001,
        host: options.host || 'localhost'
      });

      // Load credentials into server
      const services = await this.credentialManager.listServices();
      for (const service of services) {
        const credentials = await this.credentialManager.getCredentials(service);
        await this.server.setCredentials(service, credentials);
      }

      await this.server.start();
      
      console.log(chalk.green('✅ MCP Server started successfully'));
      console.log(chalk.cyan(`📡 Listening on ${options.host || 'localhost'}:${options.port || 3001}`));
      console.log(chalk.gray(`📋 Configured services: ${services.join(', ')}`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to start MCP server: ${error.message}`));
      process.exit(1);
    }
  }

  async stopServer() {
    if (this.server) {
      console.log(chalk.yellow('🛑 Stopping MCP Server...'));
      // Implementation depends on server shutdown method
      console.log(chalk.green('✅ MCP Server stopped'));
    } else {
      console.log(chalk.gray('No server running'));
    }
  }

  async configureCredentials(service, options) {
    try {
      console.log(chalk.blue(`🔧 Configuring credentials for ${service}`));
      
      const serviceConfigs = {
        stripe: [
          { name: 'api_key', message: 'Stripe API Key (sk_...)', type: 'password' },
          { name: 'webhook_secret', message: 'Webhook Secret (optional)', type: 'password', optional: true },
          { name: 'environment', message: 'Environment', type: 'list', choices: ['test', 'live'], default: 'test' }
        ],
        openai: [
          { name: 'api_key', message: 'OpenAI API Key (sk-...)', type: 'password' },
          { name: 'organization', message: 'Organization ID (optional)', type: 'input', optional: true },
          { name: 'model_preference', message: 'Preferred Model', type: 'list', choices: ['gpt-4', 'gpt-3.5-turbo'], default: 'gpt-4' }
        ],
        github: [
          { name: 'token', message: 'GitHub Token (ghp_...)', type: 'password' },
          { name: 'username', message: 'GitHub Username (optional)', type: 'input', optional: true }
        ],
        aws: [
          { name: 'access_key_id', message: 'AWS Access Key ID', type: 'input' },
          { name: 'secret_access_key', message: 'AWS Secret Access Key', type: 'password' },
          { name: 'region', message: 'AWS Region', type: 'input', default: 'us-east-1' },
          { name: 'role_arn', message: 'IAM Role ARN (optional)', type: 'input', optional: true }
        ],
        vercel: [
          { name: 'token', message: 'Vercel Token', type: 'password' },
          { name: 'team_id', message: 'Team ID (optional)', type: 'input', optional: true }
        ],
        netlify: [
          { name: 'token', message: 'Netlify Token', type: 'password' },
          { name: 'site_id', message: 'Site ID (optional)', type: 'input', optional: true }
        ]
      };

      const config = serviceConfigs[service];
      if (!config) {
        throw new Error(`Unsupported service: ${service}`);
      }

      let credentials = {};

      if (options.interactive !== false) {
        // Interactive mode
        const questions = config.map(field => ({
          type: field.type,
          name: field.name,
          message: field.message,
          choices: field.choices,
          default: field.default,
          when: field.optional ? 
            (answers) => {
              return inquirer.confirm({ 
                message: `Configure ${field.name}?`,
                default: false 
              });
            } : true
        }));

        credentials = await inquirer.prompt(questions);
      } else {
        // Non-interactive mode - read from options or environment
        for (const field of config) {
          const envVar = `MAK3R_${service.toUpperCase()}_${field.name.toUpperCase()}`;
          const value = options[field.name] || process.env[envVar];
          
          if (value) {
            credentials[field.name] = value;
          } else if (!field.optional) {
            throw new Error(`Missing required field: ${field.name}`);
          }
        }
      }

      // Remove undefined/empty values
      credentials = Object.fromEntries(
        Object.entries(credentials).filter(([key, value]) => value !== undefined && value !== '')
      );

      await this.credentialManager.setCredentials(service, credentials);
      
      console.log(chalk.green(`✅ Credentials configured for ${service}`));
      
      // Test connection
      if (options.test !== false) {
        console.log(chalk.blue('🔍 Testing connection...'));
        try {
          const isValid = await this.credentialManager.testConnection(service);
          if (isValid) {
            console.log(chalk.green('✅ Connection test successful'));
          } else {
            console.log(chalk.yellow('⚠️  Connection test failed - please verify credentials'));
          }
        } catch (error) {
          console.log(chalk.yellow(`⚠️  Connection test error: ${error.message}`));
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to configure ${service}: ${error.message}`));
      process.exit(1);
    }
  }

  async listCredentials() {
    try {
      const services = await this.credentialManager.listServices();
      
      if (services.length === 0) {
        console.log(chalk.gray('No credentials configured'));
        return;
      }

      console.log(chalk.blue('📋 Configured Services:'));
      console.log();
      
      for (const service of services) {
        try {
          const isValid = await this.credentialManager.testConnection(service);
          const status = isValid ? chalk.green('✅') : chalk.red('❌');
          console.log(`${status} ${service}`);
        } catch (error) {
          console.log(`${chalk.gray('❓')} ${service} ${chalk.gray('(test not available)')}`);
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to list credentials: ${error.message}`));
    }
  }

  async removeCredentials(service) {
    try {
      const confirm = await inquirer.confirm({
        message: `Are you sure you want to remove credentials for ${service}?`,
        default: false
      });

      if (confirm) {
        await this.credentialManager.removeCredentials(service);
        console.log(chalk.green(`✅ Credentials removed for ${service}`));
      } else {
        console.log(chalk.gray('Operation cancelled'));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to remove credentials: ${error.message}`));
    }
  }

  async testService(service, options) {
    try {
      console.log(chalk.blue(`🧪 Testing ${service} integration...`));
      
      const credentials = await this.credentialManager.getCredentials(service);
      
      // Perform service-specific tests
      switch (service) {
        case 'stripe':
          await this.testStripeService(credentials, options);
          break;
        case 'openai':
          await this.testOpenAIService(credentials, options);
          break;
        case 'github':
          await this.testGitHubService(credentials, options);
          break;
        default:
          console.log(chalk.yellow(`⚠️  No specific test available for ${service}`));
          const isConnected = await this.credentialManager.testConnection(service);
          console.log(isConnected ? 
            chalk.green('✅ Basic connection successful') : 
            chalk.red('❌ Connection failed')
          );
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Test failed for ${service}: ${error.message}`));
    }
  }

  async testStripeService(credentials, options) {
    const stripeHandler = require('./handlers/stripe');
    
    if (options.method === 'list_customers') {
      const result = await stripeHandler.listCustomers({ limit: 3 }, credentials);
      console.log(chalk.green(`✅ Found ${result.data.length} customers`));
      console.log(chalk.gray(JSON.stringify(result.data, null, 2)));
    } else {
      console.log(chalk.green('✅ Stripe API connection successful'));
    }
  }

  async testOpenAIService(credentials, options) {
    const openaiHandler = require('./handlers/openai');
    
    if (options.prompt) {
      const result = await openaiHandler.chatCompletion({
        messages: [{ role: 'user', content: options.prompt }],
        max_tokens: 100
      }, credentials);
      
      console.log(chalk.green('✅ OpenAI API response:'));
      console.log(chalk.cyan(result.choices[0].message.content));
    } else {
      const models = await openaiHandler.listModels(credentials);
      console.log(chalk.green(`✅ OpenAI API connected - ${models.models.length} models available`));
    }
  }

  async testGitHubService(credentials, options) {
    const githubHandler = require('./handlers/github');
    
    const user = await githubHandler.getUser(credentials);
    console.log(chalk.green(`✅ GitHub API connected as ${user.login}`));
    console.log(chalk.gray(`Public repos: ${user.public_repos}, Followers: ${user.followers}`));
  }

  async showLogs(options) {
    const fs = require('fs-extra');
    const path = require('path');
    const os = require('os');
    
    const logPath = path.join(os.homedir(), '.mak3r-hub', 'mcp.log');
    
    try {
      if (!await fs.pathExists(logPath)) {
        console.log(chalk.gray('No logs found'));
        return;
      }

      const logs = await fs.readFile(logPath, 'utf8');
      const lines = logs.split('\\n').filter(line => line.trim());
      
      // Filter by grep pattern if provided
      let filteredLines = lines;
      if (options.grep) {
        const pattern = new RegExp(options.grep, 'i');
        filteredLines = lines.filter(line => pattern.test(line));
      }
      
      // Show last N lines
      const tailLines = options.tail ? 
        filteredLines.slice(-options.tail) : 
        filteredLines;
      
      if (tailLines.length === 0) {
        console.log(chalk.gray('No matching log entries'));
        return;
      }

      console.log(chalk.blue('📋 MCP Service Logs:'));
      console.log();
      
      for (const line of tailLines) {
        try {
          const logEntry = JSON.parse(line);
          const timestamp = new Date(logEntry.timestamp).toLocaleString();
          const level = logEntry.level || 'info';
          const color = level === 'error' ? chalk.red : 
                       level === 'warn' ? chalk.yellow : chalk.gray;
          
          console.log(`${color(timestamp)} ${logEntry.service || 'system'} ${logEntry.action || logEntry.context}`);
          
          if (logEntry.error) {
            console.log(chalk.red(`  Error: ${logEntry.error}`));
          }
        } catch (error) {
          // Non-JSON log line
          console.log(chalk.gray(line));
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to read logs: ${error.message}`));
    }
  }

  async exportConfig(outputPath) {
    try {
      await this.credentialManager.exportCredentials(outputPath);
      console.log(chalk.green(`✅ Credentials exported to ${outputPath}`));
    } catch (error) {
      console.error(chalk.red(`❌ Export failed: ${error.message}`));
    }
  }

  async importConfig(inputPath, options) {
    try {
      await this.credentialManager.importCredentials(inputPath, options.overwrite);
      console.log(chalk.green('✅ Credentials imported successfully'));
    } catch (error) {
      console.error(chalk.red(`❌ Import failed: ${error.message}`));
    }
  }
}

async function main() {
  const program = new Command();
  const client = new MCPClient();

  await client.initialize();

  program
    .name('MAK3R-HUB MCP')
    .description('Model Context Protocol service for secure API integrations')
    .version('1.0.0');

  // Server management
  program
    .command('start')
    .description('Start MCP server')
    .option('-p, --port <port>', 'Server port', '3001')
    .option('-h, --host <host>', 'Server host', 'localhost')
    .action(async (options) => {
      await client.startServer(options);
    });

  program
    .command('stop')
    .description('Stop MCP server')
    .action(async () => {
      await client.stopServer();
    });

  // Credential management
  program
    .command('config <service>')
    .description('Configure credentials for a service')
    .option('--api-key <key>', 'API key')
    .option('--token <token>', 'Access token')
    .option('--no-interactive', 'Non-interactive mode')
    .option('--no-test', 'Skip connection test')
    .action(async (service, options) => {
      await client.configureCredentials(service, options);
    });

  program
    .command('list')
    .alias('ls')
    .description('List configured services')
    .action(async () => {
      await client.listCredentials();
    });

  program
    .command('remove <service>')
    .alias('rm')
    .description('Remove credentials for a service')
    .action(async (service) => {
      await client.removeCredentials(service);
    });

  // Testing
  program
    .command('test <service>')
    .description('Test service integration')
    .option('--method <method>', 'Test method to call')
    .option('--prompt <prompt>', 'Test prompt for AI services')
    .action(async (service, options) => {
      await client.testService(service, options);
    });

  // Logs
  program
    .command('logs')
    .description('Show MCP service logs')
    .option('--tail <lines>', 'Show last N lines', '100')
    .option('--grep <pattern>', 'Filter logs by pattern')
    .action(async (options) => {
      await client.showLogs(options);
    });

  // Import/Export
  program
    .command('export <path>')
    .description('Export credentials to encrypted file')
    .action(async (outputPath) => {
      await client.exportConfig(outputPath);
    });

  program
    .command('import <path>')
    .description('Import credentials from encrypted file')
    .option('--overwrite', 'Overwrite existing credentials')
    .action(async (inputPath, options) => {
      await client.importConfig(inputPath, options);
    });

  // Status
  program
    .command('status')
    .description('Show MCP service status')
    .action(async () => {
      console.log(chalk.blue('📊 MAK3R-HUB MCP Status'));
      await client.listCredentials();
      // Add server status check here
    });

  // Parse command line
  program.parse();

  // Show help if no command provided
  if (!process.argv.slice(2).length) {
    console.log(chalk.blue('🔗 MAK3R-HUB MCP Service'));
    console.log(chalk.gray('Secure gateway for external API integrations\\n'));
    program.outputHelp();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('❌ MCP CLI error:'), error.message);
    process.exit(1);
  });
}

module.exports = MCPClient;