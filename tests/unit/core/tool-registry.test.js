/**
 * ToolRegistry Unit Tests
 * Testing MCP tool registration, validation, and execution
 */

const ToolRegistry = require('../../../src/core/tool-registry');

describe('ToolRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('constructor', () => {
    it('should initialize tools and handlers maps', () => {
      expect(registry.tools).toBeInstanceOf(Map);
      expect(registry.handlers).toBeInstanceOf(Map);
    });

    it('should register default M3R tools', () => {
      const tools = registry.getTools();
      const m3rTools = tools.filter(tool => tool.name.startsWith('m3r__'));
      
      expect(m3rTools.length).toBeGreaterThan(10);
      expect(m3rTools.some(tool => tool.name === 'm3r__system__get_info')).toBe(true);
      expect(m3rTools.some(tool => tool.name === 'm3r__sharputil__query_capabilities')).toBe(true);
      expect(m3rTools.some(tool => tool.name === 'm3r__deps__detect_missing')).toBe(true);
      expect(m3rTools.some(tool => tool.name === 'm3r__csharp__create_project')).toBe(true);
    });

    it('should register legacy MCP tools', () => {
      const tools = registry.getTools();
      const legacyTools = tools.filter(tool => tool.name.startsWith('mcp__'));
      
      expect(legacyTools.length).toBeGreaterThan(0);
      expect(legacyTools.some(tool => tool.name === 'mcp__stripe__create_payment_intent')).toBe(true);
      expect(legacyTools.some(tool => tool.name === 'mcp__openai__chat_completion')).toBe(true);
    });
  });

  describe('registerTool', () => {
    it('should register new tool with configuration', () => {
      const toolConfig = {
        description: 'Test tool',
        inputSchema: {
          type: 'object',
          properties: {
            param: { type: 'string' }
          }
        }
      };

      registry.registerTool('test__tool', toolConfig);
      
      const tool = registry.getTool('test__tool');
      expect(tool).toMatchObject({
        name: 'test__tool',
        description: 'Test tool',
        inputSchema: toolConfig.inputSchema
      });
    });

    it('should update existing tool configuration', () => {
      registry.registerTool('test__tool', { description: 'Original' });
      registry.registerTool('test__tool', { description: 'Updated' });
      
      const tool = registry.getTool('test__tool');
      expect(tool.description).toBe('Updated');
    });
  });

  describe('registerHandler', () => {
    it('should register function handler', () => {
      const handler = jest.fn();
      registry.registerHandler('test__tool', handler);
      
      expect(registry.getHandler('test__tool')).toBe(handler);
      expect(registry.hasHandler('test__tool')).toBe(true);
    });

    it('should register object handler', () => {
      const handler = {
        execute: jest.fn()
      };
      registry.registerHandler('test__tool', handler);
      
      expect(registry.getHandler('test__tool')).toBe(handler);
      expect(registry.hasHandler('test__tool')).toBe(true);
    });
  });

  describe('getTools', () => {
    it('should return all registered tools as array', () => {
      const tools = registry.getTools();
      
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.every(tool => tool.name && tool.description)).toBe(true);
    });
  });

  describe('getTool', () => {
    it('should return specific tool configuration', () => {
      const tool = registry.getTool('m3r__system__get_info');
      
      expect(tool).toBeDefined();
      expect(tool.name).toBe('m3r__system__get_info');
      expect(tool.description).toContain('system information');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should return undefined for non-existent tool', () => {
      const tool = registry.getTool('non__existent__tool');
      expect(tool).toBeUndefined();
    });
  });

  describe('executeHandler', () => {
    it('should execute function handler', async () => {
      const handler = jest.fn().mockResolvedValue({ result: 'success' });
      registry.registerHandler('test__tool', handler);
      
      const result = await registry.executeHandler('test__tool', { param: 'value' });
      
      expect(result).toEqual({ result: 'success' });
      expect(handler).toHaveBeenCalledWith({ param: 'value' });
    });

    it('should execute object handler with execute method', async () => {
      const handler = {
        execute: jest.fn().mockResolvedValue({ result: 'success' })
      };
      registry.registerHandler('test__tool', handler);
      
      const result = await registry.executeHandler('test__tool', { param: 'value' });
      
      expect(result).toEqual({ result: 'success' });
      expect(handler.execute).toHaveBeenCalledWith({ param: 'value' });
    });

    it('should throw error for non-existent handler', async () => {
      await expect(registry.executeHandler('non__existent', {}))
        .rejects.toThrow('No handler registered for tool: non__existent');
    });

    it('should throw error for invalid handler', async () => {
      registry.registerHandler('invalid__handler', { notExecute: true });
      
      await expect(registry.executeHandler('invalid__handler', {}))
        .rejects.toThrow('Invalid handler for tool: invalid__handler');
    });
  });

  describe('getToolsByCategory', () => {
    it('should return tools by category prefix', () => {
      const systemTools = registry.getToolsByCategory('system');
      
      expect(systemTools.length).toBeGreaterThan(0);
      expect(systemTools.every(tool => tool.name.startsWith('m3r__system__'))).toBe(true);
    });

    it('should return tools by sharputil category', () => {
      const sharpUtilTools = registry.getToolsByCategory('sharputil');
      
      expect(sharpUtilTools.length).toBeGreaterThan(0);
      expect(sharpUtilTools.every(tool => tool.name.startsWith('m3r__sharputil__'))).toBe(true);
    });

    it('should return all M3R tools when no category specified', () => {
      const allM3RTools = registry.getToolsByCategory();
      
      expect(allM3RTools.length).toBeGreaterThan(0);
      expect(allM3RTools.every(tool => tool.name.startsWith('m3r__'))).toBe(true);
    });
  });

  describe('validateArgs', () => {
    it('should validate required arguments', () => {
      const validation = registry.validateArgs('m3r__system__check_service', {
        serviceName: 'git'
      });
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect missing required arguments', () => {
      const validation = registry.validateArgs('m3r__system__check_service', {});
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required parameter: serviceName');
    });

    it('should return valid for tools without schema', () => {
      registry.registerTool('no__schema__tool', { description: 'No schema' });
      
      const validation = registry.validateArgs('no__schema__tool', {});
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should return valid for non-existent tool', () => {
      const validation = registry.validateArgs('non__existent', {});
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should validate complex tool arguments', () => {
      const validation = registry.validateArgs('m3r__csharp__create_project', {
        name: 'TestProject',
        type: 'console'
      });
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect multiple missing required arguments', () => {
      const validation = registry.validateArgs('m3r__csharp__create_project', {});
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required parameter: name');
      expect(validation.errors).toContain('Missing required parameter: type');
    });
  });

  describe('tool schema validation', () => {
    it('should have valid schemas for all M3R system tools', () => {
      const systemTools = registry.getToolsByCategory('system');
      
      systemTools.forEach(tool => {
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });

    it('should have required fields defined for tools that need them', () => {
      const checkServiceTool = registry.getTool('m3r__system__check_service');
      
      expect(checkServiceTool.inputSchema.required).toBeDefined();
      expect(checkServiceTool.inputSchema.required).toContain('serviceName');
    });

    it('should have proper descriptions for all tools', () => {
      const tools = registry.getTools();
      
      tools.forEach(tool => {
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(10);
      });
    });
  });

  describe('integration with actual tool definitions', () => {
    it('should have all critical M3R tool categories', () => {
      const tools = registry.getTools();
      const toolNames = tools.map(tool => tool.name);
      
      // System tools
      expect(toolNames.some(name => name.startsWith('m3r__system__'))).toBe(true);
      
      // SharpUtility tools  
      expect(toolNames.some(name => name.startsWith('m3r__sharputil__'))).toBe(true);
      
      // Dependency management tools
      expect(toolNames.some(name => name.startsWith('m3r__deps__'))).toBe(true);
      
      // C# build tools
      expect(toolNames.some(name => name.startsWith('m3r__csharp__'))).toBe(true);
    });

    it('should maintain backward compatibility with legacy tools', () => {
      const tools = registry.getTools();
      const legacyTools = tools.filter(tool => tool.name.startsWith('mcp__'));
      
      expect(legacyTools.length).toBeGreaterThan(0);
      
      // Should still have Stripe and OpenAI tools
      const toolNames = legacyTools.map(tool => tool.name);
      expect(toolNames).toContain('mcp__stripe__create_payment_intent');
      expect(toolNames).toContain('mcp__openai__chat_completion');
    });
  });
});