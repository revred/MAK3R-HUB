# MAK3R-HUB MCP Service Compatibility Fix Tasks

## 🔴 Critical Issues Identified

### 1. **SDK API Mismatch**
- **Issue**: `setRequestHandler` expects a Zod schema object, not a string
- **Location**: `src/mcp/server.js` line 119
- **Error**: "Cannot read properties of undefined (reading 'method')"
- **Current Code**: `this.server.setRequestHandler('tools/call', async (request) => {...})`
- **Expected**: Schema object with shape.method.value property

### 2. **Missing Zod Schema Definitions**
- **Issue**: No schema definitions for request/response validation
- **Required**: Zod schemas for all MCP protocol messages
- **SDK Version**: @modelcontextprotocol/sdk@0.5.0

### 3. **Incorrect Tool Registration**
- **Issue**: Tools should be registered individually, not in a single switch statement
- **Current**: All tools handled in one 'tools/call' handler
- **Required**: Individual tool handlers with proper schemas

## 📋 Task Breakdown

### Phase 1: SDK Understanding and Setup
- [ ] **Task 1.1**: Research MCP SDK v0.5.0 documentation
  - Find official examples of server implementation
  - Understand schema requirements
  - Review breaking changes from previous versions

- [ ] **Task 1.2**: Install required dependencies
  ```bash
  npm install zod
  ```

- [ ] **Task 1.3**: Create schema definitions file
  - Create `src/mcp/schemas.js`
  - Define request/response schemas for each tool

### Phase 2: Fix Request Handler Implementation
- [ ] **Task 2.1**: Update server initialization
  - Import Zod library
  - Create proper schema objects
  - Fix Server constructor parameters

- [ ] **Task 2.2**: Implement correct request handler pattern
  ```javascript
  // Example of correct pattern:
  const toolCallSchema = z.object({
    method: z.literal('tools/call'),
    params: z.object({
      name: z.string(),
      arguments: z.any()
    })
  });
  
  this.server.setRequestHandler(toolCallSchema, async (request) => {
    // handler implementation
  });
  ```

- [ ] **Task 2.3**: Update tool registration
  - Register each M3R tool separately
  - Create individual schemas for each tool
  - Implement proper response formats

### Phase 3: Refactor Tool Handlers
- [ ] **Task 3.1**: Extract tool handlers to separate modules
  - Move system diagnostics handlers to `handlers/system-diagnostics.js`
  - Move sharputil handlers to `handlers/sharputil-mcp-service.js`
  - Move dependency handlers to `handlers/dependency-manager.js`

- [ ] **Task 3.2**: Implement proper tool schemas
  ```javascript
  // For each tool:
  const m3rSystemGetInfoSchema = z.object({
    method: z.literal('m3r__system__get_info'),
    params: z.object({})
  });
  ```

- [ ] **Task 3.3**: Update tool list handler
  - Fix 'tools/list' handler with proper schema
  - Return tools in MCP-compliant format

### Phase 4: Fix Transport and Server Lifecycle
- [ ] **Task 4.1**: Update server start method
  - Fix StdioServerTransport initialization
  - Implement proper connection handling
  - Add error handling for transport failures

- [ ] **Task 4.2**: Fix Express integration
  - Separate MCP server from Express HTTP server
  - MCP uses stdio transport, not HTTP
  - Express can be used for auxiliary endpoints

- [ ] **Task 4.3**: Update CLI integration
  - Fix `mcp start` command in cli.js
  - Remove Express server start from MCP flow
  - Add proper stdio handling

### Phase 5: Testing and Validation
- [ ] **Task 5.1**: Create test harness
  - Write unit tests for each tool handler
  - Test schema validation
  - Mock stdio transport for testing

- [ ] **Task 5.2**: Integration testing
  - Test MCP server startup
  - Verify tool discovery works
  - Test each M3R tool execution

- [ ] **Task 5.3**: Documentation update
  - Update M3R-MCPS.md with working examples
  - Document new schema requirements
  - Add troubleshooting guide

## 🛠️ Implementation Order

1. **Immediate Fix** (Quick workaround):
   - Create minimal schema objects to fix startup error
   - Get basic server running

2. **Proper Implementation** (Complete fix):
   - Research SDK documentation
   - Implement full schema validation
   - Refactor to match MCP protocol spec

3. **Enhancement** (Future-proof):
   - Add comprehensive error handling
   - Implement tool versioning
   - Add capability negotiation

## 📝 Code Examples

### Correct Server Setup:
```javascript
const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

class MAK3RMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mak3r-hub-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );
  }

  setupHandlers() {
    // Correct pattern with schema
    const toolsCallSchema = z.object({
      method: z.literal('tools/call'),
      params: z.object({
        name: z.string(),
        arguments: z.record(z.any()).optional()
      })
    });

    this.server.setRequestHandler(toolsCallSchema, async (request) => {
      const { name, arguments: args } = request.params;
      // Handle tool call
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Server now running on stdio
  }
}
```

## 🎯 Success Criteria

- [ ] MCP server starts without errors
- [ ] All M3R tools are discoverable
- [ ] Each tool executes correctly
- [ ] Proper error messages for failures
- [ ] Documentation is complete and accurate

## 🚨 Risks and Mitigations

1. **SDK Version Incompatibility**
   - Risk: SDK v0.5.0 might have undocumented changes
   - Mitigation: Review SDK source code and examples

2. **Breaking Changes**
   - Risk: Fixing might break existing integrations
   - Mitigation: Version the fix, maintain backward compatibility

3. **Performance Impact**
   - Risk: Schema validation might slow down requests
   - Mitigation: Optimize schemas, cache validation

## 📅 Estimated Timeline

- **Quick Fix**: 1-2 hours
- **Proper Implementation**: 4-6 hours
- **Full Testing**: 2-3 hours
- **Documentation**: 1-2 hours

**Total**: 8-13 hours of development work

## 🔗 Resources

- [MCP SDK Repository](https://github.com/modelcontextprotocol/sdk)
- [Zod Documentation](https://zod.dev/)
- [MCP Protocol Specification](https://modelcontextprotocol.io/docs)

---

*Created: 2025-08-09*
*Status: Ready for Implementation*