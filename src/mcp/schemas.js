/**
 * MCP Protocol Schema Definitions
 * Defines Zod schemas for all MCP requests and responses
 */

const { z } = require('zod');

// Base request schema
const baseRequestSchema = z.object({
  jsonrpc: z.literal('2.0').optional(),
  id: z.union([z.string(), z.number()]).optional(),
});

// Tools/call request schema
const toolsCallRequestSchema = baseRequestSchema.extend({
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.record(z.any()).optional().default({})
  })
});

// Tools/list request schema
const toolsListRequestSchema = baseRequestSchema.extend({
  method: z.literal('tools/list'),
  params: z.object({}).optional()
});

// Initialize request schema
const initializeRequestSchema = baseRequestSchema.extend({
  method: z.literal('initialize'),
  params: z.object({
    protocolVersion: z.string(),
    capabilities: z.object({
      tools: z.object({}).optional(),
      resources: z.object({}).optional(),
      prompts: z.object({}).optional()
    }).optional()
  })
});

// Ping request schema
const pingRequestSchema = baseRequestSchema.extend({
  method: z.literal('ping'),
  params: z.object({}).optional()
});

// Response schemas
const toolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()).optional(),
    required: z.array(z.string()).optional()
  })
});

const toolsListResponseSchema = z.object({
  tools: z.array(toolSchema)
});

const toolCallResponseSchema = z.object({
  content: z.array(z.object({
    type: z.enum(['text', 'image', 'resource']),
    text: z.string().optional(),
    data: z.string().optional(),
    mimeType: z.string().optional(),
    uri: z.string().optional()
  }))
});

const errorResponseSchema = z.object({
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  })
});

// Individual M3R tool schemas
const m3rToolSchemas = {
  // System tools
  'm3r__system__get_info': z.object({
    method: z.literal('m3r__system__get_info'),
    params: z.object({}).optional()
  }),
  
  'm3r__system__check_service': z.object({
    method: z.literal('m3r__system__check_service'),
    params: z.object({
      serviceName: z.string(),
      executablePath: z.string().optional()
    })
  }),
  
  'm3r__system__run_diagnostics': z.object({
    method: z.literal('m3r__system__run_diagnostics'),
    params: z.object({}).optional()
  }),
  
  'm3r__system__get_safe_commands': z.object({
    method: z.literal('m3r__system__get_safe_commands'),
    params: z.object({}).optional()
  }),
  
  'm3r__system__execute_safe_command': z.object({
    method: z.literal('m3r__system__execute_safe_command'),
    params: z.object({
      operation: z.string(),
      args: z.array(z.string()).optional()
    })
  }),
  
  // SharpUtil tools
  'm3r__sharputil__query_capabilities': z.object({
    method: z.literal('m3r__sharputil__query_capabilities'),
    params: z.object({
      category: z.string().optional()
    }).optional()
  }),
  
  'm3r__sharputil__get_command_help': z.object({
    method: z.literal('m3r__sharputil__get_command_help'),
    params: z.object({
      command: z.string()
    })
  }),
  
  'm3r__sharputil__get_best_practices': z.object({
    method: z.literal('m3r__sharputil__get_best_practices'),
    params: z.object({}).optional()
  }),
  
  'm3r__sharputil__check_executable': z.object({
    method: z.literal('m3r__sharputil__check_executable'),
    params: z.object({}).optional()
  }),
  
  'm3r__sharputil__execute_command': z.object({
    method: z.literal('m3r__sharputil__execute_command'),
    params: z.object({
      command: z.string(),
      args: z.array(z.string()).optional()
    })
  }),
  
  // Dependency tools
  'm3r__deps__detect_missing': z.object({
    method: z.literal('m3r__deps__detect_missing'),
    params: z.object({}).optional()
  }),
  
  'm3r__deps__install_dependency': z.object({
    method: z.literal('m3r__deps__install_dependency'),
    params: z.object({
      dependencyName: z.string()
    })
  }),
  
  'm3r__deps__store_git_credentials': z.object({
    method: z.literal('m3r__deps__store_git_credentials'),
    params: z.object({
      username: z.string(),
      email: z.string(),
      token: z.string()
    })
  }),
  
  'm3r__deps__get_git_credentials': z.object({
    method: z.literal('m3r__deps__get_git_credentials'),
    params: z.object({}).optional()
  }),
  
  // C# tools
  'm3r__csharp__create_project': z.object({
    method: z.literal('m3r__csharp__create_project'),
    params: z.object({
      projectName: z.string(),
      projectType: z.string(),
      targetFramework: z.string().optional()
    })
  }),
  
  'm3r__csharp__build_project': z.object({
    method: z.literal('m3r__csharp__build_project'),
    params: z.object({
      projectPath: z.string(),
      configuration: z.enum(['Debug', 'Release']).optional()
    })
  }),
  
  'm3r__csharp__publish_project': z.object({
    method: z.literal('m3r__csharp__publish_project'),
    params: z.object({
      projectPath: z.string(),
      runtime: z.string().optional(),
      selfContained: z.boolean().optional()
    })
  })
};

module.exports = {
  // Request schemas
  toolsCallRequestSchema,
  toolsListRequestSchema,
  initializeRequestSchema,
  pingRequestSchema,
  
  // Response schemas
  toolsListResponseSchema,
  toolCallResponseSchema,
  errorResponseSchema,
  toolSchema,
  
  // M3R tool schemas
  m3rToolSchemas
};