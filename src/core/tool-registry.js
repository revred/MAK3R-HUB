/**
 * Tool Registry
 * Centralized management of MCP tools and their schemas
 */

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.handlers = new Map();
    this.initializeTools();
  }

  initializeTools() {
    // System Diagnostics M3R Tools
    this.registerTool('m3r__system__get_info', {
      description: 'Get comprehensive system information (Node.js version, OS, memory, etc.)',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    });

    this.registerTool('m3r__system__check_service', {
      description: 'Check if a service or executable is available',
      inputSchema: {
        type: 'object',
        properties: {
          serviceName: { type: 'string', description: 'Name of service to check' },
          executablePath: { type: 'string', description: 'Optional specific path to executable' }
        },
        required: ['serviceName']
      }
    });

    this.registerTool('m3r__system__run_diagnostics', {
      description: 'Run comprehensive system diagnostics with recommendations',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    });

    this.registerTool('m3r__system__get_safe_commands', {
      description: 'Get OS-specific safe command recommendations',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    });

    this.registerTool('m3r__system__execute_safe_command', {
      description: 'Execute a command safely with OS-specific validation',
      inputSchema: {
        type: 'object',
        properties: {
          operation: { type: 'string', description: 'Operation to perform' },
          args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' }
        },
        required: ['operation']
      }
    });

    // SharpUtility M3R Tools
    this.registerTool('m3r__sharputil__query_capabilities', {
      description: 'Query all sharpUtility capabilities - replaces all SHARPUTIL-*.md files',
      inputSchema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Optional category filter (discovery, serverManagement, etc.)' }
        }
      }
    });

    this.registerTool('m3r__sharputil__get_command_help', {
      description: 'Get detailed help for specific sharpUtility command - replaces SHARPUTIL-USAGE.md',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command key (A-Z)' }
        },
        required: ['command']
      }
    });

    this.registerTool('m3r__sharputil__get_best_practices', {
      description: 'Get sharpUtility best practices - replaces SHARPUTIL-BEST-PRACTICES.md',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    });

    this.registerTool('m3r__sharputil__check_executable', {
      description: 'Check if sharpUtilityGUI.exe is available and get status',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    });

    this.registerTool('m3r__sharputil__execute_command', {
      description: 'Execute sharpUtility command with arguments',
      inputSchema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command key (A-Z)' },
          args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' }
        },
        required: ['command']
      }
    });

    // Dependency Management M3R Tools
    this.registerTool('m3r__deps__detect_missing', {
      description: 'Detect missing development dependencies',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    });

    this.registerTool('m3r__deps__install_dependency', {
      description: 'Install missing development dependencies',
      inputSchema: {
        type: 'object',
        properties: {
          dependency: { type: 'string', description: 'Dependency name (git, node, dotnet)' },
          version: { type: 'string', description: 'Optional version specification' }
        },
        required: ['dependency']
      }
    });

    this.registerTool('m3r__deps__store_git_credentials', {
      description: 'Securely store Git credentials',
      inputSchema: {
        type: 'object',
        properties: {
          username: { type: 'string', description: 'Git username' },
          token: { type: 'string', description: 'Git personal access token' },
          service: { type: 'string', description: 'Git service (github, gitlab, etc.)' }
        },
        required: ['username', 'token']
      }
    });

    this.registerTool('m3r__deps__get_git_credentials', {
      description: 'Retrieve stored Git credentials',
      inputSchema: {
        type: 'object',
        properties: {
          service: { type: 'string', description: 'Git service (github, gitlab, etc.)' }
        }
      }
    });

    // C# Build Management M3R Tools
    this.registerTool('m3r__csharp__create_project', {
      description: 'Create new C# project with specified configuration',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Project name' },
          type: { type: 'string', description: 'Project type (console, web, classlib)' },
          framework: { type: 'string', description: 'Target framework (net9.0, net8.0)' },
          outputPath: { type: 'string', description: 'Output directory path' }
        },
        required: ['name', 'type']
      }
    });

    this.registerTool('m3r__csharp__build_project', {
      description: 'Build C# project with specified configuration',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Path to project or solution file' },
          configuration: { type: 'string', description: 'Build configuration (Debug, Release)' },
          verbosity: { type: 'string', description: 'MSBuild verbosity level' }
        },
        required: ['projectPath']
      }
    });

    this.registerTool('m3r__csharp__publish_project', {
      description: 'Publish C# project for deployment',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Path to project file' },
          outputPath: { type: 'string', description: 'Publish output directory' },
          runtime: { type: 'string', description: 'Target runtime (win-x64, linux-x64)' },
          selfContained: { type: 'boolean', description: 'Create self-contained deployment' },
          singleFile: { type: 'boolean', description: 'Publish as single file' }
        },
        required: ['projectPath']
      }
    });

    this.registerTool('m3r__csharp__add_nuget_package', {
      description: 'Add NuGet package to C# project',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Path to project file' },
          packageName: { type: 'string', description: 'NuGet package name' },
          version: { type: 'string', description: 'Package version' }
        },
        required: ['projectPath', 'packageName']
      }
    });

    this.registerTool('m3r__csharp__run_tests', {
      description: 'Run unit tests for C# project',
      inputSchema: {
        type: 'object',
        properties: {
          projectPath: { type: 'string', description: 'Path to test project' },
          configuration: { type: 'string', description: 'Build configuration' },
          verbosity: { type: 'string', description: 'Test output verbosity' }
        },
        required: ['projectPath']
      }
    });

    // Legacy MCP Tools (for backwards compatibility)
    this.registerTool('mcp__stripe__create_payment_intent', {
      description: 'Create Stripe payment intent',
      inputSchema: {
        type: 'object',
        properties: {
          amount: { type: 'number', description: 'Payment amount in cents' },
          currency: { type: 'string', description: 'Currency code' },
          customerId: { type: 'string', description: 'Optional customer ID' }
        },
        required: ['amount', 'currency']
      }
    });

    this.registerTool('mcp__openai__chat_completion', {
      description: 'OpenAI chat completion',
      inputSchema: {
        type: 'object',
        properties: {
          messages: { type: 'array', description: 'Chat messages' },
          model: { type: 'string', description: 'OpenAI model' },
          maxTokens: { type: 'number', description: 'Maximum tokens' }
        },
        required: ['messages']
      }
    });
  }

  registerTool(name, config) {
    this.tools.set(name, {
      name,
      ...config
    });
  }

  registerHandler(toolName, handler) {
    this.handlers.set(toolName, handler);
  }

  getTools() {
    return Array.from(this.tools.values());
  }

  getTool(name) {
    return this.tools.get(name);
  }

  getHandler(name) {
    return this.handlers.get(name);
  }

  hasHandler(name) {
    return this.handlers.has(name);
  }

  async executeHandler(name, args) {
    const handler = this.getHandler(name);
    if (!handler) {
      throw new Error(`No handler registered for tool: ${name}`);
    }

    if (typeof handler === 'function') {
      return await handler(args);
    }

    if (handler.execute && typeof handler.execute === 'function') {
      return await handler.execute(args);
    }

    throw new Error(`Invalid handler for tool: ${name}`);
  }

  getToolsByCategory(category) {
    const categoryPrefix = category ? `m3r__${category}__` : 'm3r__';
    return this.getTools().filter(tool => 
      tool.name.startsWith(categoryPrefix)
    );
  }

  validateArgs(toolName, args) {
    const tool = this.getTool(toolName);
    if (!tool || !tool.inputSchema) {
      return { valid: true, errors: [] };
    }

    const errors = [];
    const schema = tool.inputSchema;

    if (schema.required) {
      for (const required of schema.required) {
        if (!(required in args)) {
          errors.push(`Missing required parameter: ${required}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = ToolRegistry;