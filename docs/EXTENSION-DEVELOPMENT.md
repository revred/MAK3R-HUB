# MAK3R-HUB Extension Development Guide

## 🏗️ Architecture Overview

MAK3R-HUB uses a lightweight extension-based architecture to prevent core bloat while enabling powerful functionality through modular extensions. Each extension is self-contained and exposes its functionality through the MCP (Model Context Protocol).

### Core Principles

1. **Lightweight Core**: Hub core stays under 50KB total
2. **Extension Isolation**: Extensions are completely isolated from each other
3. **Dynamic Discovery**: Extensions are auto-discovered at startup
4. **MCP Integration**: All functionality exposed through standardized MCP tools
5. **Anti-Bloat Safeguards**: Built-in size and complexity limits

## 📁 Extension Structure

Each extension follows a standardized structure:

```
src/extensions/your-extension/
├── extension.js          # Main extension class
├── package.json         # Extension metadata & dependencies
├── config.yml          # Configuration & tool definitions
├── README.md           # Extension documentation
└── tests/              # Extension-specific tests
    └── extension.test.js
```

### Required Files

#### 1. extension.js - Main Extension Class

```javascript
const MCPExtension = require('../../core/extension-base')

class YourExtension extends MCPExtension {
  constructor() {
    super('your-extension', '1.0.0')
  }

  async initialize() {
    // Load configuration, set up resources
    console.log(`✅ ${this.name} extension initialized`)
  }

  async executeTool(toolName, args = {}) {
    switch (toolName) {
      case 'your__tool__action':
        return await this.handleAction(args)
      
      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }

  async handleAction(args) {
    // Your tool logic here
    return {
      success: true,
      result: 'Action completed'
    }
  }

  getToolDefinitions() {
    return [
      {
        name: 'your__tool__action',
        description: 'Performs a specific action',
        inputSchema: {
          type: 'object',
          properties: {
            param1: {
              type: 'string',
              description: 'First parameter'
            }
          }
        }
      }
    ]
  }

  async cleanup() {
    // Clean up resources when extension stops
  }
}

module.exports = YourExtension
```

#### 2. package.json - Extension Metadata

```json
{
  "name": "@mak3r/extension-your-name",
  "version": "1.0.0",
  "description": "Description of your extension",
  "private": true,
  "main": "extension.js",
  "dependencies": {
    "your-deps": "^1.0.0"
  },
  "peerDependencies": {
    "@mak3r/hub-core": "^1.0.0"
  },
  "keywords": ["mcp", "mak3r", "extension"],
  "author": "Your Name",
  "license": "MIT"
}
```

#### 3. config.yml - Configuration

```yaml
extension:
  name: your-extension
  enabled: true
  priority: 1

tools:
  your__tool__action:
    enabled: true
    cache_ttl: 60  # Cache results for 60 seconds
    timeout: 10000  # 10 second timeout

settings:
  max_concurrent_operations: 5
  safe_mode: true

security:
  allowed_operations:
    - read
    - process
  forbidden_operations:
    - delete
    - format
```

## 🔧 Development Workflow

### 1. Create Extension Structure

```bash
# Create extension directory
mkdir src/extensions/your-extension
cd src/extensions/your-extension

# Create required files
touch extension.js package.json config.yml README.md
mkdir tests
touch tests/extension.test.js
```

### 2. Implement Extension Class

- Extend `MCPExtension` base class
- Implement required methods: `initialize()`, `executeTool()`
- Define MCP tools in `getToolDefinitions()`
- Handle cleanup in `cleanup()` method

### 3. Tool Naming Convention

Follow the pattern: `namespace__category__action`

Examples:
- `m3r__system__get_info`
- `m3r__sharputil__copy_file`
- `m3r__deploy__azure_publish`

### 4. Test Your Extension

```bash
# Test extension in isolation
node -e "
const Extension = require('./src/extensions/your-extension/extension.js');
const ext = new Extension();
ext.initialize().then(() => {
  return ext.executeTool('your__tool__action', { param1: 'test' });
}).then(result => {
  console.log('Test result:', result);
}).catch(console.error);
"

# Test with full hub
node test-hub-architecture.js
```

## 📋 Extension Guidelines

### Performance Guidelines

1. **Startup Time**: Extensions should initialize in < 100ms
2. **Memory Usage**: Keep peak memory under 50MB per extension
3. **Tool Response Time**: Most tools should respond within 5 seconds
4. **Caching**: Use intelligent caching for expensive operations

### Security Guidelines

1. **Input Validation**: Always validate all input parameters
2. **Safe Operations**: Use safe operations by default
3. **Forbidden Commands**: Never expose dangerous system operations
4. **Sandboxing**: Keep extension operations contained

### Code Quality Guidelines

1. **Error Handling**: Comprehensive error handling with meaningful messages
2. **Logging**: Use structured logging with appropriate levels
3. **Documentation**: Document all tools and their parameters
4. **Testing**: Minimum 80% code coverage with unit tests

## 🧪 Testing Extensions

### Unit Testing Template

```javascript
// tests/extension.test.js
const YourExtension = require('../extension')

describe('YourExtension', () => {
  let extension

  beforeEach(async () => {
    extension = new YourExtension()
    await extension.initialize()
  })

  afterEach(async () => {
    await extension.cleanup()
  })

  test('should initialize correctly', () => {
    expect(extension.name).toBe('your-extension')
    expect(extension.version).toBe('1.0.0')
  })

  test('should execute tool correctly', async () => {
    const result = await extension.executeTool('your__tool__action', {
      param1: 'test'
    })
    
    expect(result.success).toBe(true)
    expect(result.result).toBeDefined()
  })

  test('should provide tool definitions', () => {
    const tools = extension.getToolDefinitions()
    expect(tools).toHaveLength(1)
    expect(tools[0].name).toBe('your__tool__action')
  })
})
```

### Integration Testing

Extensions are automatically tested with the hub architecture:

```bash
# Run architecture validation
node test-hub-architecture.js
```

## 📊 Anti-Bloat Safeguards

### Automated Size Monitoring

The hub automatically monitors extension sizes and complexity:

```javascript
// Built-in safeguards
const EXTENSION_LIMITS = {
  MAX_FILE_SIZE: 100 * 1024,    // 100KB per extension file
  MAX_DEPENDENCIES: 10,          // Max 10 dependencies
  MAX_TOOLS: 20,                // Max 20 tools per extension
  MAX_STARTUP_TIME: 1000        // Max 1 second startup
}
```

### Architecture Validation Rules

1. **Core Size Limit**: Hub core must stay under 50KB
2. **Extension Isolation**: No cross-extension dependencies
3. **Standard Structure**: All extensions follow the same pattern
4. **Tool Registration**: Only properly defined tools are registered

## 📚 Best Practices

### 1. Extension Design

- **Single Responsibility**: Each extension should have one clear purpose
- **Minimal Dependencies**: Use as few dependencies as possible
- **Configuration Driven**: Make behavior configurable via config.yml
- **Graceful Degradation**: Handle failures gracefully

### 2. Tool Implementation

- **Idempotent Operations**: Tools should be safe to call multiple times
- **Progress Reporting**: For long operations, report progress
- **Cleanup**: Always clean up resources after operations
- **Error Context**: Provide helpful error messages with context

### 3. Configuration Management

- **Environment Aware**: Support different configs for dev/prod
- **Validation**: Validate all configuration values
- **Defaults**: Provide sensible defaults for all settings
- **Documentation**: Document all configuration options

## 🔍 Debugging Extensions

### Debug Mode

```bash
# Run hub in debug mode
DEBUG=mak3r:* node src/core/hub.js
```

### Extension Logging

```javascript
// Use structured logging
this.logger.info('Tool executed', { 
  toolName, 
  args, 
  executionTime: Date.now() - startTime 
})

this.logger.error('Tool failed', { 
  toolName, 
  error: error.message, 
  stack: error.stack 
})
```

### Health Checks

Extensions automatically support health checking:

```javascript
async healthCheck() {
  try {
    // Test critical functionality
    await this.testConnection()
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } catch (error) {
    return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() }
  }
}
```

## 📦 Extension Distribution

### Publishing Extensions

Extensions can be distributed as npm packages or git repositories:

```bash
# Option 1: npm package
npm publish

# Option 2: git repository
git tag v1.0.0
git push --tags
```

### Installing Extensions

```bash
# Install from npm
npm install @mak3r/extension-your-name

# Install from git
git clone https://github.com/user/mak3r-extension-name.git src/extensions/your-name
```

## 🚀 Advanced Features

### Custom MCP Protocols

Extensions can implement custom MCP protocols:

```javascript
getCustomProtocols() {
  return {
    'your-custom-protocol/1.0': {
      capabilities: ['streaming', 'progress'],
      handler: this.handleCustomProtocol.bind(this)
    }
  }
}
```

### Extension Dependencies

Extensions can declare dependencies on other extensions:

```yaml
# config.yml
dependencies:
  required:
    - system
    - sharputil
  optional:
    - deployment
```

### Hot Reloading

Development mode supports hot reloading of extensions:

```javascript
// Automatically reload extension when files change
process.env.NODE_ENV === 'development' && 
  this.watchForChanges()
```

## ❓ Troubleshooting

### Common Issues

1. **Extension Not Loading**: Check file structure and main entry point
2. **Tool Not Registered**: Verify tool definition in `getToolDefinitions()`
3. **Configuration Errors**: Validate YAML syntax in config.yml
4. **Performance Issues**: Check for blocking operations in tools

### Debug Checklist

- [ ] Extension follows standard structure
- [ ] All required files present
- [ ] package.json has correct main entry
- [ ] Extension class extends MCPExtension
- [ ] Tools follow naming convention
- [ ] Configuration is valid YAML
- [ ] Tests pass

## 🎯 Migration Guide

### From Legacy Handlers

If migrating from the old handler-based system:

1. Create new extension structure
2. Move handler logic to extension class
3. Update tool definitions for MCP
4. Add proper configuration
5. Test with new hub architecture

### Breaking Changes

Version 2.0 of MAK3R-HUB introduces breaking changes:
- Handler system removed
- All tools must be in extensions
- New MCP protocol required
- Configuration format changed

---

**Generated by MAK3R-HUB v2.0.0** 🚀

*Building the future of AI-assisted development, one extension at a time*