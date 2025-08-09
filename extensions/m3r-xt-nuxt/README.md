# m3r-xt-nuxt Extension

## Overview
The `m3r-xt-nuxt` extension provides high-level Vue/Nuxt development command abstractions designed specifically to reduce Claude Code token usage by replacing repetitive manual operations with intelligent single commands.

## Architecture
This extension leverages the existing **SharpUtility** functions to provide Vue/Nuxt workflow automation:

- **Built-in C# Extension**: No external dependencies
- **SharpUtility Integration**: Direct integration with existing ConvertStar tooling
- **Bulletproof Exception Handling**: Hub-level safety prevents crashes
- **JSON Result Format**: Consistent structured output for Claude Code

## Available Commands

### Project Discovery
```bash
# Auto-discover all Vue/Nuxt projects in filesystem
MAK3R-HUB ext m3r-xt-nuxt discover-projects

# Scan for currently running development servers
MAK3R-HUB ext m3r-xt-nuxt scan-running
```

### Server Management
```bash
# Intelligently start best available project
MAK3R-HUB ext m3r-xt-nuxt smart-start

# Terminate all Vue/Nuxt development servers
MAK3R-HUB ext m3r-xt-nuxt kill-servers

# Direct Nuxt Hello World launcher
MAK3R-HUB ext m3r-xt-nuxt direct-nuxt-launch
```

### Health & Diagnostics
```bash
# Comprehensive health check for all projects
MAK3R-HUB ext m3r-xt-nuxt health-check-all

# Deep analysis of project structure and dependencies
MAK3R-HUB ext m3r-xt-nuxt analyze-deep

# Detect development issues and conflicts
MAK3R-HUB ext m3r-xt-nuxt anomaly-scan
```

### System Monitoring
```bash
# Real-time server monitoring
MAK3R-HUB ext m3r-xt-nuxt live-monitor

# System resource usage analysis
MAK3R-HUB ext m3r-xt-nuxt resource-analysis
```

### Extension Management
```bash
# List all loaded extensions
MAK3R-HUB ext-list

# Check extension health
MAK3R-HUB ext-health m3r-xt-nuxt

# Show extension help
MAK3R-HUB ext m3r-xt-nuxt help
```

## Token Efficiency Benefits

### Before (Manual Operations)
```typescript
// Claude Code needs ~200 tokens for manual project discovery
const projects = [];
const searchPaths = ['dev-code/vue-nuxt', '.vibe-code/nuxt-hello-world'];
for (const path of searchPaths) {
    if (fs.existsSync(path)) {
        const packageJson = path.join(path, 'package.json');
        if (fs.existsSync(packageJson)) {
            const content = fs.readFileSync(packageJson, 'utf8');
            if (content.includes('nuxt') || content.includes('vue')) {
                projects.push({name: path, framework: 'Vue/Nuxt'});
            }
        }
    }
}
```

### After (Extension Command)
```bash
# Claude Code needs ~5 tokens
MAK3R-HUB ext m3r-xt-nuxt discover-projects
```

## Result Format
All commands return structured JSON for easy Claude Code integration:

```json
{
    "success": true,
    "message": "Command executed successfully",
    "data": {
        "projects": [
            {
                "name": "vue-nuxt",
                "framework": "Nuxt",
                "path": "C:\\code\\ConvertStar\\dev-code\\vue-nuxt",
                "port": 3000,
                "status": "Discovered"
            }
        ]
    },
    "executionTimeMs": 1250,
    "extension": "m3r-xt-nuxt",
    "command": "discover-projects"
}
```

## Safety Features

### Hub-Level Exception Handling
- **No extension exceptions reach Claude Code** - all errors captured safely
- **Timeout protection** - commands automatically terminate after configured timeout
- **Resource cleanup** - processes properly cleaned up on failure
- **Graceful degradation** - system continues functioning even with extension failures

### Bulletproof Design
- **Process isolation** - extensions run in separate processes
- **Memory protection** - resource limits prevent system exhaustion  
- **Error boundaries** - multiple layers of exception handling
- **Safe defaults** - fallback behavior when extensions unavailable

## Dependencies
- **SharpUtility**: Core Vue/Nuxt tooling (automatically located)
- **Node.js**: Development server runtime
- **npm**: Package management

## Extension Health Check
```bash
MAK3R-HUB ext-health m3r-xt-nuxt
```

Returns comprehensive health status including:
- SharpUtility availability
- Node.js/npm availability  
- Extension execution capability
- Response time metrics

## Integration with Claude Code MCP
The extension is designed for future MCP server integration:

```typescript
// Future MCP integration
const mcpClient = new MCPClient('mak3r-hub-extensions');
await mcpClient.execute('m3r-xt-nuxt', 'discover-projects');
```

## Status
✅ **Production Ready** - Fully implemented with bulletproof safety
- Built-in extension loaded automatically
- Complete SharpUtility integration
- Hub-level exception handling active
- All commands tested and documented

## Performance
- **Cold start**: < 2 seconds (extension initialization)  
- **Command execution**: 1-5 seconds (depending on operation)
- **Memory footprint**: < 50MB (including SharpUtility)
- **Concurrent safety**: Full process isolation