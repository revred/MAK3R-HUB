# MAK3R-HUB Example Extension

Complete example C# extension demonstrating all MCP integration patterns and best practices.

## Overview

This extension serves as a comprehensive reference implementation showing:
- **MCP Tool Integration**: 4 example tools covering different patterns
- **Error Handling**: Proper error responses and exception management  
- **Parameter Validation**: JSON schema validation and safe parameter parsing
- **Health Checks**: Extension health monitoring and reporting
- **File Operations**: Safe file system operations with proper permissions
- **System Information**: OS and runtime information gathering

## Tools Provided

### `m3r__example__hello`
Simple greeting command demonstrating basic parameter handling.

**Parameters:**
- `name` (string, optional): Name to greet (defaults to "World")

**Example:**
```json
{
  "name": "MAK3R-HUB"
}
```

### `m3r__example__system_info` 
Comprehensive system information gathering.

**Parameters:**
- `includeEnvironment` (boolean, optional): Include safe environment variables

**Example:**
```json
{
  "includeEnvironment": true
}
```

### `m3r__example__file_operations`
Safe file system operations with validation.

**Parameters:**
- `operation` (string, required): Operation type ("list", "create_temp", "read_info")
- `path` (string, optional): Target path for some operations

**Examples:**
```json
// List current directory
{
  "operation": "list"
}

// Create temporary file
{
  "operation": "create_temp"  
}

// Read file/directory info
{
  "operation": "read_info",
  "path": "C:\\temp\\example.txt"
}
```

### `m3r__example__error_demo`
Error handling pattern demonstrations.

**Parameters:**
- `errorType` (string, optional): Error type ("none", "validation", "runtime", "timeout")

**Example:**
```json
{
  "errorType": "validation"
}
```

## Architecture Patterns

### MCP Integration
- Inherits from `MCPExtensionBase` for full MCP compatibility
- Provides JSON schema validation for all tool parameters
- Returns structured JSON responses with consistent error handling

### Safety & Validation
- Parameter parsing with fallback to safe defaults
- File operations restricted to safe directories
- Environment variable filtering for security
- Timeout handling for long-running operations

### Error Handling
- Consistent error response format with error codes
- Exception wrapping with detailed error information
- Graceful degradation for non-critical failures
- Proper logging integration

### Health Monitoring
- Comprehensive health checks covering key functionality
- Resource usage monitoring (memory, file system access)
- Status reporting with detailed diagnostic information

## Configuration

Extension behavior can be customized via `extension.json`:

```json
{
  "configuration": {
    "logLevel": "INFO",
    "enableHealthChecks": true,
    "healthCheckInterval": 60,
    "maxMemoryUsageMB": 50,
    "timeoutSeconds": 30
  }
}
```

## Security Model

- **File Access**: Limited to safe operations (read-only, temp file creation)
- **Network Access**: Disabled by default
- **Registry Access**: Disabled
- **Environment**: Only safe, non-sensitive variables exposed
- **Sandboxing**: Can be enabled via configuration

## Testing

This extension includes comprehensive error handling demonstrations:

1. **Validation Errors**: Proper parameter validation with helpful messages
2. **Runtime Exceptions**: Graceful exception handling with error codes
3. **Timeouts**: Proper timeout handling for long operations
4. **Health Checks**: Regular health monitoring and reporting

## Integration Example

```javascript
// Node.js hub integration
const result = await registry.executeTool('m3r__example__hello', { 
  name: 'MAK3R-HUB User' 
});

console.log(result);
// Output: { success: true, message: "Hello, MAK3R-HUB User! 👋", ... }
```

## Best Practices Demonstrated

1. **Consistent Return Format**: All tools return structured JSON with success/error indication
2. **Parameter Safety**: Safe parameter parsing with type validation
3. **Resource Management**: Proper cleanup and resource disposal
4. **Error Codes**: Structured error reporting with actionable error codes
5. **Documentation**: Comprehensive inline documentation and examples
6. **Testing Integration**: Built-in error simulation for testing scenarios

This extension serves as the reference implementation for creating robust C# extensions in the MAK3R-HUB ecosystem.