const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const os = require('os');

class MCPService {
  constructor() {
    this.app = express();
    this.server = null;
    this.port = 3001;
    this.host = 'localhost';
    this.projectPath = process.cwd();
    this.version = require('../package.json').version;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false // Allow MCP protocol
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1 minute
      max: 60, // limit each IP to 60 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use(limiter);

    // CORS for localhost
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', 'http://localhost:*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.header('X-MCP-Service', 'MAK3R-HUB');
      res.header('X-MCP-Version', '0.5.0');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    // MCP Status endpoint
    this.app.get('/mcp/status', (req, res) => {
      res.json({
        service: 'MAK3R-HUB',
        version: this.version,
        mcp_version: '0.5.0',
        status: 'active',
        uptime: process.uptime(),
        project: this.getProjectContext(),
        capabilities: [
          'os_validation',
          'command_filtering', 
          'token_optimization',
          'project_structure_management'
        ],
        timestamp: new Date().toISOString()
      });
    });

    // Command validation endpoint
    this.app.post('/mcp/validate-command', async (req, res) => {
      try {
        const { command, context } = req.body;
        const validation = await this.validateCommand(command, context);
        res.json(validation);
      } catch (error) {
        res.status(500).json({
          error: 'Command validation failed',
          message: error.message
        });
      }
    });

    // Operation abstraction endpoint
    this.app.post('/mcp/abstract-operation', async (req, res) => {
      try {
        const { operation, parameters } = req.body;
        const abstraction = await this.abstractOperation(operation, parameters);
        res.json(abstraction);
      } catch (error) {
        res.status(500).json({
          error: 'Operation abstraction failed',
          message: error.message
        });
      }
    });

    // Project information endpoint
    this.app.get('/mcp/project-info', (req, res) => {
      const projectInfo = this.getProjectContext();
      res.json(projectInfo);
    });

    // Claude rules endpoint
    this.app.get('/mcp/claude-rules', async (req, res) => {
      try {
        const rules = await this.getClaudeRules();
        res.json(rules);
      } catch (error) {
        res.status(500).json({
          error: 'Failed to load Claude rules',
          message: error.message
        });
      }
    });

    // Token optimization endpoint
    this.app.post('/mcp/optimize-response', (req, res) => {
      try {
        const { content, context } = req.body;
        const optimized = this.optimizeResponse(content, context);
        res.json(optimized);
      } catch (error) {
        res.status(500).json({
          error: 'Response optimization failed',
          message: error.message
        });
      }
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // Default route
    this.app.get('/', (req, res) => {
      res.json({
        service: 'MAK3R-HUB MCP Service',
        version: this.version,
        mcp_version: '0.5.0',
        endpoints: [
          '/mcp/status',
          '/mcp/validate-command',
          '/mcp/abstract-operation', 
          '/mcp/project-info',
          '/mcp/claude-rules',
          '/mcp/optimize-response',
          '/health'
        ],
        documentation: 'https://github.com/revred/MAK3R-HUB#mcp-integration'
      });
    });
  }

  async validateCommand(command, context = {}) {
    const osType = os.platform();
    const isWindows = osType === 'win32';
    const rules = await this.getClaudeRules();
    
    const commandRules = isWindows ? rules.command_rules.windows : rules.command_rules.unix;
    
    // Check if command is blocked
    const isBlocked = commandRules.blocked_patterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(command);
    });

    if (isBlocked) {
      const suggestion = this.getSuggestion(command, commandRules.auto_replacements);
      return {
        valid: false,
        blocked: true,
        reason: `Command '${command}' is not compatible with ${isWindows ? 'Windows' : 'Unix/Linux'} environment`,
        suggestion: suggestion,
        alternative: this.getAlternativeCommand(command, isWindows)
      };
    }

    // Check if command is allowed
    const isAllowed = commandRules.allowed_patterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(command);
    });

    return {
      valid: isAllowed,
      blocked: false,
      os_compatible: true,
      suggestions: isAllowed ? [] : this.getCommandSuggestions(command, isWindows)
    };
  }

  async abstractOperation(operation, parameters = {}) {
    const abstractions = {
      'create_component': {
        command: `MAK3R-HUB create component ${parameters.name || '<name>'}`,
        description: 'Creates a new component with proper structure',
        token_savings: '~200 tokens vs manual file creation'
      },
      'create_page': {
        command: `MAK3R-HUB create page ${parameters.name || '<name>'}`,
        description: 'Creates a new page with routing configuration',
        token_savings: '~300 tokens vs manual setup'
      },
      'start_dev_server': {
        command: this.getProjectContext().launch_command || 'MAK3R-HUB dev',
        description: 'Starts development server with optimal settings',
        token_savings: '~100 tokens vs manual npm commands'
      },
      'build_project': {
        command: 'MAK3R-HUB build',
        description: 'Builds project with error handling and optimization',
        token_savings: '~150 tokens vs manual build process'
      },
      'deploy_project': {
        command: `MAK3R-HUB deploy ${parameters.target || 'production'}`,
        description: 'Deploys to specified target with configuration',
        token_savings: '~500 tokens vs manual deployment setup'
      }
    };

    const abstraction = abstractions[operation];
    if (!abstraction) {
      return {
        available: false,
        operation: operation,
        message: 'No abstraction available for this operation'
      };
    }

    return {
      available: true,
      operation: operation,
      ...abstraction,
      parameters: parameters
    };
  }

  getProjectContext() {
    try {
      const configPath = path.join(this.projectPath, '.mak3r', 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
          name: config.project.name,
          type: config.project.type,
          framework: config.framework.primary,
          os: config.environment.os,
          structure: config.structure,
          ports: config.ports,
          mak3r_managed: true,
          config_version: config.project.mak3r_version
        };
      }
    } catch (error) {
      // Fallback to basic detection
    }

    return {
      name: path.basename(this.projectPath),
      type: 'unknown',
      framework: 'unknown',
      os: os.platform(),
      mak3r_managed: false,
      detection_method: 'fallback'
    };
  }

  async getClaudeRules() {
    try {
      const rulesPath = path.join(this.projectPath, '.mak3r', 'claude-rules.json');
      if (fs.existsSync(rulesPath)) {
        return JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      }
    } catch (error) {
      console.warn('Failed to load project-specific Claude rules:', error.message);
    }

    // Return default rules
    const isWindows = os.platform() === 'win32';
    return {
      version: '1.0.0',
      os_awareness: {
        detected_os: isWindows ? 'windows' : 'unix'
      },
      command_rules: {
        windows: {
          allowed_patterns: ['TASKKILL', 'dir', 'type', 'copy', 'del', 'xcopy', 'npm', 'node'],
          blocked_patterns: ['bash', 'sh', 'ls', 'cat', 'grep', 'chmod', 'kill'],
          auto_replacements: {
            'ls': 'dir',
            'cat': 'type',
            'rm': 'del',
            'cp': 'copy'
          }
        },
        unix: {
          allowed_patterns: ['kill', 'killall', 'ls', 'cat', 'grep', 'cp', 'rm', 'chmod', 'npm', 'node'],
          blocked_patterns: ['TASKKILL', 'dir', 'type', 'del', 'xcopy', 'cmd'],
          auto_replacements: {
            'dir': 'ls',
            'type': 'cat',
            'del': 'rm',
            'copy': 'cp'
          }
        }
      }
    };
  }

  getSuggestion(command, replacements) {
    for (const [wrong, correct] of Object.entries(replacements)) {
      if (command.toLowerCase().includes(wrong.toLowerCase())) {
        return command.replace(new RegExp(wrong, 'gi'), correct);
      }
    }
    return null;
  }

  getAlternativeCommand(command, isWindows) {
    const alternatives = {
      windows: {
        'ls': 'dir',
        'cat': 'type',
        'rm': 'del',
        'cp': 'copy',
        'grep': 'findstr',
        'kill': 'TASKKILL /F /IM',
        'chmod': 'attrib'
      },
      unix: {
        'dir': 'ls',
        'type': 'cat', 
        'del': 'rm',
        'copy': 'cp',
        'findstr': 'grep',
        'TASKKILL': 'kill',
        'attrib': 'chmod'
      }
    };

    const platform = isWindows ? 'windows' : 'unix';
    const platformAlts = alternatives[platform];

    for (const [wrong, correct] of Object.entries(platformAlts)) {
      if (command.toLowerCase().includes(wrong.toLowerCase())) {
        return command.replace(new RegExp(wrong, 'gi'), correct);
      }
    }

    return null;
  }

  getCommandSuggestions(command, isWindows) {
    const suggestions = [];
    
    if (isWindows) {
      suggestions.push('Use Windows commands: TASKKILL, dir, type, copy, del');
      suggestions.push('Avoid Unix commands: bash, sh, ls, cat, grep, chmod, kill');
    } else {
      suggestions.push('Use Unix commands: kill, killall, ls, cat, grep, cp, rm, chmod');
      suggestions.push('Avoid Windows commands: TASKKILL, dir, type, del, xcopy, cmd');
    }
    
    suggestions.push('Consider using MAK3R-HUB abstractions for common operations');
    
    return suggestions;
  }

  optimizeResponse(content, context = {}) {
    let optimized = content;
    let tokensSaved = 0;

    // Remove verbose prefixes/suffixes
    const verbosePhrases = [
      'Let me help you with that.',
      'I\'ll assist you with',
      'Here\'s what I found:',
      'Based on the information provided,',
      'I hope this helps!',
      'Please let me know if you need anything else.'
    ];

    verbosePhrases.forEach(phrase => {
      if (optimized.includes(phrase)) {
        optimized = optimized.replace(phrase, '');
        tokensSaved += phrase.split(' ').length;
      }
    });

    // Replace common operations with abstractions
    const abstractions = {
      'mkdir && cd && npm init && npm install': 'MAK3R-HUB create project',
      'npm install && npm run dev && open browser': 'MAK3R-HUB dev --open',
      'npm run build && deploy to platform': 'MAK3R-HUB deploy'
    };

    Object.entries(abstractions).forEach(([verbose, concise]) => {
      if (optimized.toLowerCase().includes(verbose.toLowerCase())) {
        optimized = optimized.replace(new RegExp(verbose, 'gi'), concise);
        tokensSaved += verbose.split(' ').length - concise.split(' ').length;
      }
    });

    return {
      original_length: content.length,
      optimized_length: optimized.length,
      optimized_content: optimized.trim(),
      tokens_saved_estimate: tokensSaved,
      optimization_applied: tokensSaved > 0
    };
  }

  async start(port = 3001, host = 'localhost') {
    this.port = port;
    this.host = host;

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(port, host, () => {
        console.log(chalk.green(`✅ MAK3R-HUB MCP Service started`));
        console.log(chalk.cyan(`🌐 Endpoint: http://${host}:${port}`));
        console.log(chalk.gray(`📋 Project: ${this.getProjectContext().name}`));
        console.log(chalk.gray(`🔧 OS: ${os.platform()}`));
        resolve({ host, port });
      });

      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(chalk.red(`❌ Port ${port} is already in use`));
          reject(new Error(`Port ${port} is already in use`));
        } else {
          console.error(chalk.red(`❌ Failed to start MCP service: ${error.message}`));
          reject(error);
        }
      });
    });
  }

  async stop() {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log(chalk.yellow('⏹️  MAK3R-HUB MCP Service stopped'));
          resolve();
        });
      });
    }
  }

  getServiceInfo() {
    return {
      service: 'MAK3R-HUB',
      version: this.version,
      mcp_version: '0.5.0',
      running: this.server && this.server.listening,
      host: this.host,
      port: this.port,
      project: this.getProjectContext()
    };
  }
}

module.exports = MCPService;