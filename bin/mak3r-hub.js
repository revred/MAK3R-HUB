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
  .description('Create a new website project with MAK3R-HUB structure')
  .argument('<name>', 'Project name')
  .option('-t, --type <type>', 'Website type (landing-page|ecommerce|portfolio|blog|saas)', 'landing-page')
  .option('-f, --framework <framework>', 'Framework (react-next|vue-nuxt|svelte-kit)', 'auto')
  .option('-p, --path <path>', 'Custom project path')
  .option('--skip-install', 'Skip npm install after creation')
  .action(async (name, options) => {
    try {
      console.log(chalk.blue('🎯 MAK3R-HUB Project Creator'));
      console.log(chalk.gray(`Creating ${options.type} with ${options.framework === 'auto' ? 'optimal framework' : options.framework}`));
      
      // Use JavaScript implementation for project creation
      const ProjectCreator = require('../lib/project-creator');
      const creator = new ProjectCreator();
      
      const framework = options.framework === 'auto' ? 
        await detectOptimalFramework(options.type) : 
        options.framework;
      
      const projectOptions = {
        type: options.type,
        framework: framework,
        path: options.path,
        skipInstall: options.skipInstall
      };
      
      const result = await creator.createProject(name, projectOptions);
      
      if (result.success) {
        console.log(chalk.green('\n✅ Project creation completed!'));
        console.log(chalk.cyan('🚀 Next steps:'));
        console.log(chalk.gray(`   cd ${name}`));
        
        if (!options.skipInstall) {
          console.log(chalk.gray(`   cd ${result.project.active_dir} && npm install`));
        }
        
        console.log(chalk.gray(`   ${result.project.launch_command}`));
        console.log(chalk.gray(`   # Access: http://localhost:${result.project.default_port}`));
        console.log(chalk.cyan('\n📚 Documentation:'));
        console.log(chalk.gray('   • Read CLAUDE.md for AI development guidance'));
        console.log(chalk.gray(`   • MCP service available on port ${result.project.mcp_port}`));
        console.log(chalk.gray('   • All OS-specific commands pre-configured'));
        
      } else {
        console.error(chalk.red(`❌ Project creation failed: ${result.error}`));
        process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Failed to create project:'), error.message);
      console.error(chalk.yellow('💡 Falling back to C# engine...'));
      
      // Fallback to C# engine
      try {
        const args = ['create', name, '--type', options.type, '--framework', framework];
        if (options.path) args.push('--output', options.path);
        
        const result = await executeEngine(args);
        if (!result.success) process.exit(1);
        
      } catch (engineError) {
        console.error(chalk.red('❌ Both JavaScript and C# engines failed'));
        process.exit(1);
      }
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
  .description('Manage MCP service (start|stop|status|info|validate)')
  .option('-p, --port <port>', 'MCP server port', '3001')
  .option('-h, --host <host>', 'MCP server host', 'localhost')
  .option('-c, --command <command>', 'Command to validate')
  .option('-d, --daemon', 'Run as daemon (background process)')
  .action(async (action, options) => {
    try {
      const MCPService = require('../lib/mcp-service');
      const service = new MCPService();
      
      switch (action) {
        case 'start':
          console.log(chalk.blue('🚀 Starting MAK3R-HUB MCP Service...'));
          await service.start(parseInt(options.port), options.host);
          
          if (!options.daemon) {
            console.log(chalk.gray('\nPress Ctrl+C to stop the service\n'));
            process.on('SIGINT', async () => {
              console.log(chalk.yellow('\n⏹️  Stopping MCP service...'));
              await service.stop();
              process.exit(0);
            });
            
            // Keep process alive
            setInterval(() => {}, 1000);
          }
          break;
          
        case 'stop':
          // For now, just show how to stop (since we need PID tracking for proper daemon support)
          console.log(chalk.yellow('⏹️  To stop MCP service:'));
          console.log(chalk.gray('   • Press Ctrl+C if running in foreground'));
          console.log(chalk.gray('   • Use process manager if running as daemon'));
          console.log(chalk.gray(`   • Kill process on port ${options.port}: netstat -ano | findstr :${options.port}`));
          break;
          
        case 'status':
          try {
            const axios = require('axios');
            const response = await axios.get(`http://${options.host}:${options.port}/mcp/status`, {
              timeout: 2000
            });
            
            console.log(chalk.green('✅ MCP Service is running'));
            console.log(chalk.cyan('📊 Service Information:'));
            console.log(chalk.gray(`   • Version: ${response.data.version}`));
            console.log(chalk.gray(`   • MCP Version: ${response.data.mcp_version}`));
            console.log(chalk.gray(`   • Uptime: ${Math.round(response.data.uptime)}s`));
            console.log(chalk.gray(`   • Project: ${response.data.project.name}`));
            console.log(chalk.gray(`   • Framework: ${response.data.project.framework}`));
            console.log(chalk.gray(`   • OS: ${response.data.project.os}`));
            
          } catch (error) {
            console.log(chalk.red('❌ MCP Service is not running'));
            console.log(chalk.gray(`   Checked: http://${options.host}:${options.port}`));
            console.log(chalk.cyan(`   Start with: MAK3R-HUB mcp start --port ${options.port}`));
          }
          break;
          
        case 'info':
          const info = service.getServiceInfo();
          console.log(chalk.blue('📋 MAK3R-HUB MCP Service Info'));
          console.log(chalk.gray(`   Service: ${info.service} v${info.version}`));
          console.log(chalk.gray(`   MCP Version: ${info.mcp_version}`));
          console.log(chalk.gray(`   Running: ${info.running ? 'Yes' : 'No'}`));
          console.log(chalk.gray(`   Endpoint: http://${info.host}:${info.port}`));
          console.log(chalk.gray(`   Project: ${info.project.name} (${info.project.framework})`));
          break;
          
        case 'validate':
          if (!options.command) {
            console.error(chalk.red('❌ Command required for validation. Use --command <cmd>'));
            process.exit(1);
          }
          
          try {
            const axios = require('axios');
            const response = await axios.post(`http://${options.host}:${options.port}/mcp/validate-command`, {
              command: options.command,
              context: { source: 'cli' }
            });
            
            const result = response.data;
            if (result.valid) {
              console.log(chalk.green(`✅ Command "${options.command}" is valid`));
            } else {
              console.log(chalk.red(`❌ Command "${options.command}" is not valid`));
              console.log(chalk.yellow(`   Reason: ${result.reason}`));
              if (result.suggestion) {
                console.log(chalk.cyan(`   Suggestion: ${result.suggestion}`));
              }
              if (result.alternative) {
                console.log(chalk.cyan(`   Alternative: ${result.alternative}`));
              }
            }
          } catch (error) {
            console.error(chalk.red('❌ Failed to validate command - MCP service may not be running'));
            console.log(chalk.gray(`   Start MCP service: MAK3R-HUB mcp start`));
          }
          break;
          
        default:
          console.error(chalk.red(`❌ Unknown MCP action: ${action}`));
          console.log(chalk.cyan('Available actions: start, stop, status, info, validate'));
          console.log(chalk.gray('\nExamples:'));
          console.log(chalk.gray('   MAK3R-HUB mcp start'));
          console.log(chalk.gray('   MAK3R-HUB mcp status'));
          console.log(chalk.gray('   MAK3R-HUB mcp validate --command "ls -la"'));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ MCP ${action} failed: ${error.message}`));
      if (error.message.includes('Cannot find module')) {
        console.log(chalk.yellow('💡 Install missing dependencies: npm install axios'));
      }
      process.exit(1);
    }
  });

// Configuration management
program
  .command('config <action>')
  .description('Manage MAK3R-HUB configuration (init|show|update|validate|reset)')
  .option('-k, --key <key>', 'Configuration key for get/set operations')
  .option('-v, --value <value>', 'Configuration value for set operations')
  .option('-t, --template <template>', 'Configuration template (default|minimal|advanced)', 'default')
  .option('-f, --format <format>', 'Output format (json|yaml)', 'json')
  .action(async (action, options) => {
    try {
      const ConfigManager = require('../lib/config-manager');
      const config = new ConfigManager();
      
      switch (action) {
        case 'init':
          console.log(chalk.blue('🔧 Initializing MAK3R-HUB configuration...'));
          const initialized = await config.initialize();
          if (initialized) {
            console.log(chalk.green('✅ Configuration initialized successfully'));
            const info = config.getProjectInfo();
            console.log(chalk.gray(`   Project: ${info.name}`));
            console.log(chalk.gray(`   OS: ${config.getEnvironmentInfo().os}`));
            console.log(chalk.gray(`   Config: .mak3r/config.json`));
          } else {
            console.error(chalk.red('❌ Configuration initialization failed'));
            process.exit(1);
          }
          break;
          
        case 'show':
          await config.initialize();
          const currentConfig = config.getConfiguration();
          
          if (options.key) {
            const value = config.getNestedValue(currentConfig, options.key);
            if (value !== undefined) {
              console.log(JSON.stringify(value, null, 2));
            } else {
              console.error(chalk.red(`❌ Configuration key not found: ${options.key}`));
              process.exit(1);
            }
          } else {
            console.log(chalk.blue('📋 Current MAK3R-HUB Configuration:'));
            console.log(JSON.stringify(currentConfig, null, 2));
          }
          break;
          
        case 'update':
          await config.initialize();
          
          if (options.key && options.value) {
            const updates = {};
            setNestedValue(updates, options.key, parseValue(options.value));
            const success = await config.updateConfiguration(updates);
            
            if (success) {
              console.log(chalk.green(`✅ Updated ${options.key} = ${options.value}`));
            } else {
              console.error(chalk.red('❌ Failed to update configuration'));
              process.exit(1);
            }
          } else {
            console.error(chalk.red('❌ Both --key and --value are required for updates'));
            console.log(chalk.cyan('Example: MAK3R-HUB config update --key project.name --value "My Project"'));
            process.exit(1);
          }
          break;
          
        case 'validate':
          await config.initialize();
          const validation = await config.validateConfiguration();
          
          console.log(chalk.blue('🔍 Configuration Validation Results:'));
          
          if (validation.valid) {
            console.log(chalk.green('✅ Configuration is valid'));
          } else {
            console.log(chalk.red('❌ Configuration has errors'));
            validation.errors.forEach(error => {
              console.log(chalk.red(`   • ${error}`));
            });
          }
          
          if (validation.warnings.length > 0) {
            console.log(chalk.yellow('\n⚠️  Warnings:'));
            validation.warnings.forEach(warning => {
              console.log(chalk.yellow(`   • ${warning}`));
            });
          }
          
          if (validation.suggestions.length > 0) {
            console.log(chalk.cyan('\n💡 Suggestions:'));
            validation.suggestions.forEach(suggestion => {
              console.log(chalk.cyan(`   • ${suggestion}`));
            });
          }
          
          if (!validation.valid) {
            process.exit(1);
          }
          break;
          
        case 'reset':
          await config.initialize();
          console.log(chalk.yellow(`⚠️  Resetting configuration to ${options.template} template...`));
          
          const newConfig = await config.resetConfiguration(options.template);
          console.log(chalk.green('✅ Configuration reset completed'));
          break;
          
        case 'report':
          await config.initialize();
          const report = await config.generateConfigurationReport();
          
          console.log(chalk.blue('📊 Configuration Report:'));
          console.log(chalk.gray(`   Generated: ${report.generated}`));
          console.log(chalk.gray(`   Project: ${report.project.name} v${report.project.version}`));
          console.log(chalk.gray(`   OS: ${report.environment.os}`));
          console.log(chalk.gray(`   Framework: ${report.project.framework || 'Not specified'}`));
          
          console.log(chalk.cyan('\n🔧 Features Enabled:'));
          report.features_enabled.forEach(feature => {
            console.log(chalk.gray(`   ✓ ${feature.replace(/_/g, ' ')}`));
          });
          
          if (report.recommendations.length > 0) {
            console.log(chalk.yellow('\n💡 Recommendations:'));
            report.recommendations.forEach(rec => {
              console.log(chalk.yellow(`   • ${rec}`));
            });
          }
          break;
          
        case 'export':
          await config.initialize();
          const exportPath = await config.exportConfiguration(options.format);
          console.log(chalk.green(`✅ Configuration exported to: ${exportPath}`));
          break;
          
        default:
          console.error(chalk.red(`❌ Unknown config action: ${action}`));
          console.log(chalk.cyan('Available actions: init, show, update, validate, reset, report, export'));
          console.log(chalk.gray('\nExamples:'));
          console.log(chalk.gray('   MAK3R-HUB config init'));
          console.log(chalk.gray('   MAK3R-HUB config show --key project.name'));
          console.log(chalk.gray('   MAK3R-HUB config update --key ports.dev_server --value 3001'));
          console.log(chalk.gray('   MAK3R-HUB config validate'));
          process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`❌ Config ${action} failed: ${error.message}`));
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

// Extension management command
program
  .command('extension <action> [name]')
  .alias('ext')
  .description('Manage extensions (list|mount|unmount|info|exec)')
  .option('--command <cmd>', 'Command to execute with ext exec')
  .action(async (action, name, options) => {
    try {
      console.log(chalk.blue('🔧 MAK3R-HUB Extension Manager'));
      
      const ExtensionManager = require('../lib/extension-manager');
      const manager = new ExtensionManager();
      
      switch (action.toLowerCase()) {
        case 'list':
        case 'ls':
          const extensions = await manager.listExtensions();
          console.log(chalk.cyan('\n📦 Available Extensions:'));
          if (extensions.length === 0) {
            console.log(chalk.gray('   No extensions found in tools/ directory'));
            return;
          }
          extensions.forEach(ext => {
            const status = ext.mounted ? chalk.green('[MOUNTED]') : chalk.gray('[AVAILABLE]');
            console.log(`   ${status} ${chalk.white(ext.name)} v${ext.version} - ${ext.description}`);
            if (ext.platform && ext.platform !== process.platform) {
              console.log(chalk.yellow(`     ⚠️  Platform: ${ext.platform} (current: ${process.platform})`));
            }
          });
          break;
          
        case 'mount':
          if (!name) {
            console.error(chalk.red('❌ Extension name required: mak3r-hub ext mount <name>'));
            process.exit(1);
          }
          console.log(chalk.cyan(`\n🔗 Mounting extension: ${name}`));
          const mountResult = await manager.mount(name);
          if (mountResult.success) {
            console.log(chalk.green(`✅ ${name} extension mounted successfully`));
            if (mountResult.symlinks) {
              console.log(chalk.gray('   Created symlinks:'));
              mountResult.symlinks.forEach(link => {
                console.log(chalk.gray(`     ${link.from} → ${link.to}`));
              });
            }
          } else {
            console.error(chalk.red(`❌ Failed to mount ${name}: ${mountResult.error}`));
            process.exit(1);
          }
          break;
          
        case 'unmount':
        case 'umount':
          if (!name) {
            console.error(chalk.red('❌ Extension name required: mak3r-hub ext unmount <name>'));
            process.exit(1);
          }
          console.log(chalk.cyan(`\n🔗 Unmounting extension: ${name}`));
          const unmountResult = await manager.unmount(name);
          if (unmountResult.success) {
            console.log(chalk.green(`✅ ${name} extension unmounted successfully`));
          } else {
            console.error(chalk.red(`❌ Failed to unmount ${name}: ${unmountResult.error}`));
            process.exit(1);
          }
          break;
          
        case 'info':
          if (!name) {
            console.error(chalk.red('❌ Extension name required: mak3r-hub ext info <name>'));
            process.exit(1);
          }
          const info = await manager.getExtensionInfo(name);
          if (info) {
            console.log(chalk.cyan(`\n📋 Extension: ${info.name}`));
            console.log(`   Version: ${info.version}`);
            console.log(`   Description: ${info.description}`);
            console.log(`   Platform: ${info.platform || 'any'}`);
            console.log(`   Status: ${info.mounted ? chalk.green('MOUNTED') : chalk.gray('AVAILABLE')}`);
            if (info.capabilities) {
              console.log(`   Capabilities: ${info.capabilities.join(', ')}`);
            }
            if (info.commands) {
              console.log('   Commands:');
              Object.entries(info.commands).forEach(([cmd, desc]) => {
                console.log(`     ${cmd}: ${desc.description || desc}`);
              });
            }
          } else {
            console.error(chalk.red(`❌ Extension ${name} not found`));
            process.exit(1);
          }
          break;
          
        case 'exec':
        case 'execute':
          if (!name) {
            console.error(chalk.red('❌ Extension name required: mak3r-hub ext exec <name> --command <cmd>'));
            process.exit(1);
          }
          if (!options.command) {
            console.error(chalk.red('❌ Command required: mak3r-hub ext exec <name> --command <cmd>'));
            process.exit(1);
          }
          console.log(chalk.cyan(`\n⚡ Executing ${options.command} on ${name}`));
          const execResult = await manager.execute(name, options.command);
          if (execResult.success) {
            console.log(chalk.green('✅ Command executed successfully'));
            if (execResult.output) {
              console.log(execResult.output);
            }
          } else {
            console.error(chalk.red(`❌ Command failed: ${execResult.error}`));
            process.exit(1);
          }
          break;
          
        default:
          console.error(chalk.red(`❌ Unknown action: ${action}`));
          console.log(chalk.yellow('Available actions: list, mount, unmount, info, exec'));
          process.exit(1);
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Extension manager error:'), error.message);
      process.exit(1);
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

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current)) {
      current[keys[i]] = {};
    }
    current = current[keys[i]];
  }
  
  current[keys[keys.length - 1]] = value;
}

function parseValue(value) {
  // Try to parse as JSON first
  try {
    return JSON.parse(value);
  } catch {
    // If JSON parsing fails, check for boolean strings
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Check for numbers
    const num = Number(value);
    if (!isNaN(num) && isFinite(num)) return num;
    
    // Return as string
    return value;
  }
}

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  console.log(chalk.blue('🚀 MAK3R-HUB: Universal Claude Code Force Multiplier'));
  console.log(chalk.gray('Create professional websites 10x faster\n'));
  program.outputHelp();
}