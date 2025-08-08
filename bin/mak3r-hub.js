#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

// Get the path to the C# automation engine
function getEngineExecutablePath() {
  // Try production build first, then debug build
  const productionPath = path.join(__dirname, '..', 'src-csharp', 'MAK3R.Core', 'publish-win-x64', 'MAK3R.Core.exe');
  const debugPath = path.join(__dirname, '..', 'src-csharp', 'MAK3R.Core', 'bin', 'Debug', 'net9.0', 'win-x64', 'MAK3R.Core.exe');
  
  if (fs.existsSync(productionPath)) {
    return productionPath;
  }
  
  if (fs.existsSync(debugPath)) {
    return debugPath;
  }
  
  console.error(chalk.red('❌ MAK3R-HUB automation engine not found.'));
  console.error(chalk.yellow('📋 Build the engine with: npm run build:csharp'));
  console.error(chalk.yellow('📋 Or for production: npm run build:production'));
  process.exit(1);
}

// Execute the C# automation engine and parse results
async function executeEngine(args) {
  try {
    const enginePath = getEngineExecutablePath();
    const result = execSync(`"${enginePath}" ${args.join(' ')}`, { 
      encoding: 'utf8',
      stdio: ['inherit', 'pipe', 'pipe']
    });
    
    // Parse JSON result from C# engine
    const lines = result.split('\n');
    const resultLine = lines.find(line => line.startsWith('RESULT:'));
    
    if (resultLine) {
      const jsonResult = JSON.parse(resultLine.replace('RESULT:', ''));
      return jsonResult;
    }
    
    return { success: true, output: result };
  } catch (error) {
    console.error(chalk.red(`❌ Engine error: ${error.message}`));
    return { success: false, error: error.message };
  }
}

const program = new Command();

program
  .name('MAK3R-HUB')
  .description('Universal Claude Code force multiplier for website development')
  .version('0.1.0');

// Website creation command
program
  .command('create')
  .alias('c')
  .description('Create a new website project')
  .argument('<name>', 'Project name')
  .option('-t, --type <type>', 'Website type (landing-page|ecommerce|portfolio|blog|saas)', 'landing-page')
  .option('-f, --framework <framework>', 'Framework (react-next|vue-nuxt|svelte-kit|angular)', 'auto')
  .option('-p, --path <path>', 'Custom project path')
  .action(async (name, options) => {
    try {
      const args = [
        'create',
        name,
        '--type', options.type,
        '--framework', options.framework === 'auto' ? await detectOptimalFramework(options.type) : options.framework
      ];
      
      if (options.path) {
        args.push('--output', options.path);
      }
      
      const result = await executeEngine(args);
      
      if (result.success && result.project) {
        console.log(chalk.cyan('🚀 Next steps:'));
        console.log(`   cd ${result.project.name}`);
        console.log(`   MAK3R-HUB dev`);
        console.log(`   MAK3R-HUB deploy`);
      } else if (!result.success) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to create website:'), error.message);
      process.exit(1);
    }
  });

// Development server command
program
  .command('dev')
  .alias('d')
  .description('Start development server')
  .option('-p, --port <port>', 'Port number', '3000')
  .option('-o, --open', 'Open browser automatically', false)
  .action(async (options) => {
    try {
      const args = ['dev', '--port', options.port.toString()];
      const result = await executeEngine(args);
      
      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to start development server:'), error.message);
      process.exit(1);
    }
  });

// Deployment command
program
  .command('deploy')
  .description('Deploy website to production')
  .option('-p, --platform <platform>', 'Deployment platform (vercel|netlify|aws|auto)', 'auto')
  .option('-d, --domain <domain>', 'Custom domain')
  .action(async (options) => {
    try {
      const args = ['deploy', '--platform', options.platform];
      if (options.domain) {
        args.push('--domain', options.domain);
      }
      
      const result = await executeEngine(args);
      
      if (result.success && result.url) {
        console.log(chalk.green('✅ Deployment successful!'));
        console.log(chalk.cyan(`🌐 Live URL: ${result.url}`));
      } else if (!result.success) {
        console.error(chalk.red(`❌ Deployment failed: ${result.error || result.message}`));
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to deploy website:'), error.message);
      process.exit(1);
    }
  });

// Claude Code integration command
program
  .command('claude')
  .description('Claude Code integration utilities')
  .option('-i, --init', 'Initialize Claude Code integration')
  .option('-o, --optimize', 'Optimize project for Claude Code')
  .option('-c, --context', 'Generate context documentation')
  .action(async (options) => {
    try {
      const args = ['claude'];
      
      if (options.init) {
        args.push('--init');
      }
      if (options.optimize) {
        args.push('--optimize');
      }
      if (options.context) {
        args.push('--context');
      }
      
      const result = await executeEngine(args);
      
      if (result.success) {
        console.log(chalk.green('✅ Claude Code integration completed!'));
      } else {
        console.log(chalk.yellow('⚠️  Implementation in progress...'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Implementation in progress...'));
    }
  });

// Template management
program
  .command('templates')
  .alias('t')
  .description('Manage website templates')
  .option('-l, --list', 'List available templates')
  .option('-i, --install <name>', 'Install community template')
  .option('-c, --create <name>', 'Create custom template')
  .action(async (options) => {
    try {
      const args = ['templates'];
      
      if (options.list) {
        args.push('--list');
      }
      if (options.install) {
        args.push('--install', options.install);
      }
      if (options.create) {
        args.push('--create', options.create);
      }
      
      const result = await executeEngine(args);
      
      if (result.success && result.templates) {
        console.log(chalk.cyan('Available templates:'));
        result.templates.forEach(template => {
          console.log(`  - ${template.name}: ${template.description}`);
        });
      } else {
        console.log(chalk.yellow('⚠️  Implementation in progress...'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Implementation in progress...'));
    }
  });

// MCP Service Management
program
  .command('mcp <action>')
  .description('Manage MCP service (start|stop|config|list|test)')
  .option('-p, --port <port>', 'MCP server port', '3001')
  .option('-h, --host <host>', 'MCP server host', 'localhost')
  .option('-s, --service <service>', 'Service name for config/test operations')
  .option('--api-key <key>', 'API key for service configuration')
  .option('--token <token>', 'Access token for service configuration')
  .action(async (action, options) => {
    try {
      const MCPClient = require('../src/mcp/cli');
      const client = new MCPClient();
      await client.initialize();
      
      switch (action) {
        case 'start':
          await client.startServer({ port: options.port, host: options.host });
          break;
        case 'stop':
          await client.stopServer();
          break;
        case 'config':
          if (!options.service) {
            console.error(chalk.red('❌ Service name required for config. Use --service <name>'));
            process.exit(1);
          }
          await client.configureCredentials(options.service, options);
          break;
        case 'list':
          await client.listCredentials();
          break;
        case 'test':
          if (!options.service) {
            console.error(chalk.red('❌ Service name required for test. Use --service <name>'));
            process.exit(1);
          }
          await client.testService(options.service, options);
          break;
        case 'logs':
          await client.showLogs({ tail: 50 });
          break;
        case 'status':
          console.log(chalk.blue('📊 MAK3R-HUB MCP Status'));
          await client.listCredentials();
          break;
        default:
          console.error(chalk.red(`❌ Unknown MCP action: ${action}`));
          console.log(chalk.cyan('Available actions: start, stop, config, list, test, logs, status'));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ MCP ${action} failed: ${error.message}`));
      process.exit(1);
    }
  });

// System utilities
program
  .command('doctor')
  .description('Check system health and requirements')
  .action(async () => {
    try {
      const result = await executeEngine(['doctor']);
      
      if (!result.success) {
        console.log(chalk.yellow('⚠️  Some system checks failed'));
      }
    } catch (error) {
      console.log(chalk.blue('🔍 MAK3R-HUB System Check'));
      
      // Fallback to local checks
      const nodeVersion = process.version;
      console.log(chalk.green(`✅ Node.js: ${nodeVersion}`));
      
      try {
        const { execSync } = require('child_process');
        const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
        console.log(chalk.green(`✅ npm: v${npmVersion}`));
      } catch (error) {
        console.log(chalk.red('❌ npm not found'));
      }
      
      try {
        const { execSync } = require('child_process');
        const dotnetVersion = execSync('dotnet --version', { encoding: 'utf8' }).trim();
        console.log(chalk.green(`✅ .NET: v${dotnetVersion}`));
      } catch (error) {
        console.log(chalk.yellow('⚠️  .NET not found (required for full automation)'));
      }
      
      console.log(chalk.red('❌ C# automation engine not available'));
      console.log(chalk.cyan('\n🎯 System Status: Limited functionality'));
    }
  });

// Utility functions
async function detectOptimalFramework(websiteType) {
  const frameworks = {
    'landing-page': 'vue-nuxt',
    'ecommerce': 'react-next', 
    'portfolio': 'svelte-kit',
    'blog': 'vue-nuxt',
    'saas': 'react-next'
  };
  
  return frameworks[websiteType] || 'vue-nuxt';
}

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  console.log(chalk.blue('🚀 MAK3R-HUB: Universal Claude Code Force Multiplier'));
  console.log(chalk.gray('Create professional websites 10x faster\n'));
  program.outputHelp();
}