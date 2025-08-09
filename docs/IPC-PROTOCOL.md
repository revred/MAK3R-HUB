# MAK3R-HUB IPC Communication Protocol

## Overview
Inter-Process Communication protocol between Node.js Hub and C# Extension Host (MAK3R.Core.exe).

## Communication Flow
```
[Node.js Hub] <---> [C# Extension Host (MAK3R.Core.exe)]
     ^                          ^
     |                          |
 MCP Tools                 C# Extensions
```

## Protocol Specification

### Transport Layer
- **Method**: JSON over stdin/stdout
- **Encoding**: UTF-8
- **Format**: Line-delimited JSON (JSONL)

### Message Structure
```json
{
  "id": "unique-request-id",
  "type": "request|response|event",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": { /* message-specific data */ }
}
```

## Message Types

### 1. Extension Discovery
**Request (Node.js → C#):**
```json
{
  "id": "req-001",
  "type": "request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": {
    "command": "discover-extensions",
    "parameters": {
      "extensionPath": "./src-csharp/extensions"
    }
  }
}
```

**Response (C# → Node.js):**
```json
{
  "id": "req-001",
  "type": "response", 
  "timestamp": "2024-01-01T00:00:00.001Z",
  "payload": {
    "success": true,
    "extensions": [
      {
        "name": "template-extension",
        "version": "1.0.0",
        "description": "Template C# extension",
        "author": "MAK3R Team",
        "tools": [
          {
            "name": "m3r__template__hello",
            "description": "Simple hello command",
            "inputSchema": { /* JSON schema */ },
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### 2. Tool Execution
**Request (Node.js → C#):**
```json
{
  "id": "req-002",
  "type": "request",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": {
    "command": "execute-tool",
    "parameters": {
      "extensionName": "template-extension",
      "toolName": "m3r__template__hello",
      "arguments": {
        "name": "Claude"
      },
      "timeout": 30
    }
  }
}
```

**Response (C# → Node.js):**
```json
{
  "id": "req-002", 
  "type": "response",
  "timestamp": "2024-01-01T00:00:00.500Z",
  "payload": {
    "success": true,
    "message": "Hello, Claude! Greetings from MAK3R-HUB C# Extension.",
    "data": {
      "greeting": "Hello, Claude!",
      "timestamp": "2024-01-01 00:00:00 UTC"
    },
    "executionTime": 50,
    "warnings": []
  }
}
```

### 3. Health Check
**Request (Node.js → C#):**
```json
{
  "id": "req-003",
  "type": "request", 
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": {
    "command": "health-check",
    "parameters": {
      "extensionName": "template-extension"
    }
  }
}
```

**Response (C# → Node.js):**
```json
{
  "id": "req-003",
  "type": "response",
  "timestamp": "2024-01-01T00:00:00.100Z", 
  "payload": {
    "success": true,
    "isHealthy": true,
    "status": "Healthy",
    "dependencies": {
      "filesystem": true,
      "memory": true,
      "configuration": true
    },
    "responseTime": 10
  }
}
```

### 4. Extension Management
**Load Extension:**
```json
{
  "id": "req-004",
  "type": "request",
  "payload": {
    "command": "load-extension",
    "parameters": {
      "extensionName": "template-extension",
      "assemblyPath": "./MAK3R.Extensions.Template.dll"
    }
  }
}
```

**Unload Extension:**
```json
{
  "id": "req-005", 
  "type": "request",
  "payload": {
    "command": "unload-extension",
    "parameters": {
      "extensionName": "template-extension"
    }
  }
}
```

### 5. Events (C# → Node.js)
**Extension Loaded:**
```json
{
  "id": "evt-001",
  "type": "event",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": {
    "event": "extension-loaded",
    "extensionName": "template-extension",
    "toolCount": 4
  }
}
```

**Extension Error:**
```json
{
  "id": "evt-002",
  "type": "event",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": {
    "event": "extension-error",
    "extensionName": "template-extension",
    "error": "Memory limit exceeded",
    "severity": "warning"
  }
}
```

## Error Handling

### Standard Error Response
```json
{
  "id": "req-xxx",
  "type": "response",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "payload": {
    "success": false,
    "error": "Extension not found: invalid-extension",
    "errorCode": "EXTENSION_NOT_FOUND",
    "suggestions": [
      "Check extension name spelling",
      "Verify extension is loaded"
    ]
  }
}
```

### Error Codes
- `EXTENSION_NOT_FOUND`: Extension doesn't exist
- `TOOL_NOT_FOUND`: Tool doesn't exist in extension
- `INVALID_PARAMETERS`: Parameter validation failed
- `EXECUTION_TIMEOUT`: Tool execution timed out
- `ASSEMBLY_LOAD_ERROR`: Failed to load extension assembly
- `IPC_COMMUNICATION_ERROR`: IPC protocol error

## Performance Specifications

### Timeouts
- **Connection**: 5 seconds
- **Discovery**: 10 seconds  
- **Tool Execution**: 30-300 seconds (configurable)
- **Health Check**: 5 seconds

### Message Limits
- **Maximum Message Size**: 10MB
- **Maximum Queue Size**: 100 messages
- **Maximum Concurrent Requests**: 10

### Process Management
- **C# Host Startup**: 3 seconds max
- **Extension Loading**: 10 seconds max
- **Graceful Shutdown**: 5 seconds max

## Security Considerations

### Input Validation
- All JSON messages validated against schema
- Parameter sanitization before C# execution
- Maximum execution time enforcement

### Sandboxing
- C# extensions run in separate process
- File system access restrictions
- Network access controls
- Memory and CPU limits

### Authentication
- Process identity validation
- Message integrity checks
- Request/response correlation

## Implementation Notes

### Node.js Side
- Use `child_process.spawn()` for C# host
- JSON-RPC style request/response mapping
- Promise-based API with timeout handling
- Event emitter for C# events

### C# Side  
- Console application with JSON stdin/stdout
- Async request processing
- Extension isolation and safety
- Structured logging to stderr

### Error Recovery
- Automatic C# host restart on crash
- Extension reload capabilities
- Circuit breaker pattern for failing extensions
- Fallback to Node.js extensions on C# failure