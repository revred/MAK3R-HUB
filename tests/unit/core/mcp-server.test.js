/**
 * MAK3RMCPServer Unit Tests
 * Testing the main server class with dependency injection
 */

const MAK3RMCPServer = require('../../../src/core/mcp-server');
const ConfigurationManager = require('../../../src/core/configuration-manager');
const ExpressServer = require('../../../src/core/express-server');
const ToolRegistry = require('../../../src/core/tool-registry');
const CredentialManager = require('../../../src/core/credential-manager');

// Mock all handlers
jest.mock('../../../src/mcp/handlers/stripe', () => ({
  handle: jest.fn()
}));
jest.mock('../../../src/mcp/handlers/openai', () => ({
  handle: jest.fn()
}));
jest.mock('../../../src/mcp/handlers/cloud', () => ({
  handle: jest.fn()
}));
jest.mock('../../../src/mcp/handlers/github', () => ({
  handle: jest.fn()
}));
jest.mock('../../../src/mcp/handlers/system-diagnostics', () => ({
  getSystemInfo: jest.fn(),
  checkService: jest.fn(),
  runDiagnostics: jest.fn(),
  getSafeCommands: jest.fn(),
  executeSafeCommand: jest.fn()
}));
jest.mock('../../../src/mcp/handlers/sharputil-mcp-service', () => ({
  queryCapabilities: jest.fn(),
  getCommandHelp: jest.fn(),
  getBestPractices: jest.fn(),
  checkExecutable: jest.fn(),
  executeCommand: jest.fn()
}));
jest.mock('../../../src/mcp/handlers/dependency-manager', () => ({
  detectMissing: jest.fn(),
  installDependency: jest.fn()
}));
jest.mock('../../../src/mcp/handlers/csharp-builder', () => ({
  createProject: jest.fn(),
  buildProject: jest.fn(),
  publishProject: jest.fn(),
  addNuGetPackage: jest.fn(),
  runTests: jest.fn()
}));

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn(),
    close: jest.fn()
  }))
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn()
}));

describe('MAK3RMCPServer', () => {
  let server;
  let mockConfig;
  let mockExpressServer;
  let mockToolRegistry;
  let mockCredentialManager;
  let mockLogger;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn((path) => {
        const config = {
          'server.port': 3001,
          'server.host': 'localhost',
          'logging.logPath': '/test/mcp.log',
          'development.debugMode': false
        };
        return config[path];
      })
    };

    mockExpressServer = {
      addApiRoute: jest.fn(),
      setCredentials: jest.fn(),
      listen: jest.fn((port, host, callback) => {
        setTimeout(callback, 0);
        return { close: jest.fn(callback => callback()) };
      })
    };

    mockToolRegistry = {
      registerHandler: jest.fn(),
      getTools: jest.fn(() => []),
      validateArgs: jest.fn(() => ({ valid: true, errors: [] })),
      executeHandler: jest.fn()
    };

    mockCredentialManager = {
      loadCredentials: jest.fn(),
      setCredentials: jest.fn(),
      getCredentials: jest.fn(),
      listServices: jest.fn(() => []),
      getCredentialsSummary: jest.fn(() => ({})),
      storeGitCredentials: jest.fn(),
      getGitCredentials: jest.fn()
    };

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
  });

  describe('constructor', () => {
    it('should initialize with default dependencies', () => {
      server = new MAK3RMCPServer();
      
      expect(server.config).toBeInstanceOf(ConfigurationManager);
      expect(server.expressServer).toBeInstanceOf(ExpressServer);
      expect(server.toolRegistry).toBeInstanceOf(ToolRegistry);
      expect(server.credentialManager).toBeInstanceOf(CredentialManager);
      expect(server.logger).toBe(console);
    });

    it('should initialize with injected dependencies', () => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager,
        logger: mockLogger
      });
      
      expect(server.config).toBe(mockConfig);
      expect(server.expressServer).toBe(mockExpressServer);
      expect(server.toolRegistry).toBe(mockToolRegistry);
      expect(server.credentialManager).toBe(mockCredentialManager);
      expect(server.logger).toBe(mockLogger);
    });

    it('should setup handlers and API routes', () => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
      
      expect(mockToolRegistry.registerHandler).toHaveBeenCalledTimes(22); // All handlers registered
      expect(mockExpressServer.addApiRoute).toHaveBeenCalledTimes(4);
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
    });

    it('should load credentials and sync with express server', async () => {
      mockCredentialManager.listServices.mockReturnValue(['stripe', 'github']);
      mockCredentialManager.getCredentials
        .mockReturnValueOnce({ apiKey: 'sk_test' })
        .mockReturnValueOnce({ token: 'ghp_test' });

      await server.initialize();
      
      expect(mockCredentialManager.loadCredentials).toHaveBeenCalled();
      expect(mockExpressServer.setCredentials).toHaveBeenCalledWith('stripe', { apiKey: 'sk_test' });
      expect(mockExpressServer.setCredentials).toHaveBeenCalledWith('github', { token: 'ghp_test' });
    });

    it('should return server instance', async () => {
      const result = await server.initialize();
      expect(result).toBe(server);
    });
  });

  describe('handler registration', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
    });

    it('should register system handlers', () => {
      const systemCalls = mockToolRegistry.registerHandler.mock.calls
        .filter(([name]) => name.startsWith('m3r__system__'));
      
      expect(systemCalls).toHaveLength(5);
      expect(systemCalls.map(([name]) => name)).toEqual([
        'm3r__system__get_info',
        'm3r__system__check_service', 
        'm3r__system__run_diagnostics',
        'm3r__system__get_safe_commands',
        'm3r__system__execute_safe_command'
      ]);
    });

    it('should register sharp utility handlers', () => {
      const sharpUtilCalls = mockToolRegistry.registerHandler.mock.calls
        .filter(([name]) => name.startsWith('m3r__sharputil__'));
      
      expect(sharpUtilCalls).toHaveLength(5);
      expect(sharpUtilCalls.map(([name]) => name)).toEqual([
        'm3r__sharputil__query_capabilities',
        'm3r__sharputil__get_command_help',
        'm3r__sharputil__get_best_practices',
        'm3r__sharputil__check_executable',
        'm3r__sharputil__execute_command'
      ]);
    });

    it('should register dependency handlers', () => {
      const depsCalls = mockToolRegistry.registerHandler.mock.calls
        .filter(([name]) => name.startsWith('m3r__deps__'));
      
      expect(depsCalls).toHaveLength(4);
      expect(depsCalls.map(([name]) => name)).toEqual([
        'm3r__deps__detect_missing',
        'm3r__deps__install_dependency',
        'm3r__deps__store_git_credentials',
        'm3r__deps__get_git_credentials'
      ]);
    });

    it('should register C# handlers', () => {
      const csharpCalls = mockToolRegistry.registerHandler.mock.calls
        .filter(([name]) => name.startsWith('m3r__csharp__'));
      
      expect(csharpCalls).toHaveLength(5);
      expect(csharpCalls.map(([name]) => name)).toEqual([
        'm3r__csharp__create_project',
        'm3r__csharp__build_project',
        'm3r__csharp__publish_project',
        'm3r__csharp__add_nuget_package',
        'm3r__csharp__run_tests'
      ]);
    });

    it('should register legacy handlers', () => {
      const legacyCalls = mockToolRegistry.registerHandler.mock.calls
        .filter(([name]) => name.startsWith('mcp__'));
      
      expect(legacyCalls).toHaveLength(3);
      expect(legacyCalls.map(([name]) => name)).toEqual([
        'mcp__stripe__create_payment_intent',
        'mcp__openai__chat_completion',
        'mcp__github__create_repo'
      ]);
    });
  });

  describe('handleToolCall', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager,
        logger: mockLogger
      });
    });

    it('should validate arguments before execution', async () => {
      const request = {
        params: {
          name: 'test__tool',
          arguments: { param: 'value' }
        }
      };

      mockToolRegistry.validateArgs.mockReturnValue({ valid: false, errors: ['Missing field'] });

      const result = await server.handleToolCall(request);

      expect(mockToolRegistry.validateArgs).toHaveBeenCalledWith('test__tool', { param: 'value' });
      expect(result.content[0].text).toContain('Invalid arguments: Missing field');
    });

    it('should execute tool handler successfully', async () => {
      const request = {
        params: {
          name: 'test__tool',
          arguments: { param: 'value' }
        }
      };

      mockToolRegistry.executeHandler.mockResolvedValue({ success: true, data: 'result' });

      const result = await server.handleToolCall(request);

      expect(mockToolRegistry.executeHandler).toHaveBeenCalledWith('test__tool', { param: 'value' });
      expect(result.content[0].text).toContain('success');
      expect(result.content[0].text).toContain('result');
    });

    it('should handle string results', async () => {
      const request = {
        params: {
          name: 'test__tool',
          arguments: {}
        }
      };

      mockToolRegistry.executeHandler.mockResolvedValue('Simple string result');

      const result = await server.handleToolCall(request);

      expect(result.content[0].text).toBe('Simple string result');
    });

    it('should handle errors gracefully', async () => {
      const request = {
        params: {
          name: 'failing__tool',
          arguments: {}
        }
      };

      const error = new Error('Tool execution failed');
      mockToolRegistry.executeHandler.mockRejectedValue(error);

      const result = await server.handleToolCall(request);

      expect(mockLogger.error).toHaveBeenCalledWith('[failing__tool] Tool execution failed');
      expect(result.content[0].text).toContain('Error executing failing__tool');
      expect(result.content[0].text).toContain('Tool execution failed');
    });
  });

  describe('credential management', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
    });

    it('should set credentials in both managers', async () => {
      const credentials = { apiKey: 'test-key' };

      await server.setCredentials('test-service', credentials);

      expect(mockCredentialManager.setCredentials).toHaveBeenCalledWith('test-service', credentials);
      expect(mockExpressServer.setCredentials).toHaveBeenCalledWith('test-service', credentials);
    });

    it('should sync credentials from credential manager to express server', () => {
      mockCredentialManager.listServices.mockReturnValue(['service1', 'service2']);
      mockCredentialManager.getCredentials
        .mockReturnValueOnce({ key1: 'value1' })
        .mockReturnValueOnce({ key2: 'value2' });

      server.syncCredentials();

      expect(mockExpressServer.setCredentials).toHaveBeenCalledWith('service1', { key1: 'value1' });
      expect(mockExpressServer.setCredentials).toHaveBeenCalledWith('service2', { key2: 'value2' });
    });
  });

  describe('getServiceStatus', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
    });

    it('should return comprehensive service status', () => {
      mockCredentialManager.getCredentialsSummary.mockReturnValue({
        stripe: { hasCredentials: true, fieldCount: 2 },
        github: { hasCredentials: false, fieldCount: 0 }
      });

      mockToolRegistry.getTools.mockReturnValue([{}, {}, {}]); // 3 tools

      const status = server.getServiceStatus();

      expect(status).toEqual({
        stripe: { status: 'configured', fields: 2 },
        github: { status: 'not_configured', fields: 0 },
        mcp_server: { status: 'running', tools: 3, version: '1.0.0' }
      });
    });
  });

  describe('server lifecycle', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager,
        logger: mockLogger
      });
    });

    it('should start server successfully', async () => {
      const result = await server.start();

      expect(mockExpressServer.listen).toHaveBeenCalledWith(3001, 'localhost', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('MAK3R-HUB MCP Server running on http://localhost:3001');
      expect(result).toBe(server);
    });

    it('should handle start errors', async () => {
      mockExpressServer.listen.mockImplementation(() => {
        throw new Error('Port already in use');
      });

      await expect(server.start()).rejects.toThrow('Port already in use');
    });

    it('should stop server gracefully', async () => {
      // Start server first
      await server.start();
      
      // Mock server close method
      server.httpServer = { close: jest.fn(callback => callback()) };
      server.server = { close: jest.fn() };

      await server.stop();

      expect(server.httpServer.close).toHaveBeenCalled();
      expect(server.server.close).toHaveBeenCalled();
    });
  });

  describe('error logging', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager,
        logger: mockLogger
      });
    });

    it('should log error with context', () => {
      const error = new Error('Test error');
      
      server.logError('test-context', error);

      expect(mockLogger.error).toHaveBeenCalledWith('[test-context] Test error');
    });

    it('should log stack trace in debug mode', () => {
      mockConfig.get.mockImplementation(path => 
        path === 'development.debugMode' ? true : null
      );
      
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      server.logError('test-context', error);

      expect(mockLogger.error).toHaveBeenCalledWith('[test-context] Test error');
      expect(mockLogger.error).toHaveBeenCalledWith('Error stack trace');
    });

    it('should not log stack trace when debug disabled', () => {
      mockConfig.get.mockImplementation(path => 
        path === 'development.debugMode' ? false : null
      );
      
      const error = new Error('Test error');
      error.stack = 'Error stack trace';
      
      server.logError('test-context', error);

      expect(mockLogger.error).toHaveBeenCalledWith('[test-context] Test error');
      expect(mockLogger.error).not.toHaveBeenCalledWith('Error stack trace');
    });
  });

  describe('handler functions', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
    });

    it('should register all system handlers', () => {
      const systemHandlerNames = [
        'm3r__system__get_info',
        'm3r__system__check_service',
        'm3r__system__run_diagnostics',
        'm3r__system__get_safe_commands',
        'm3r__system__execute_safe_command'
      ];

      systemHandlerNames.forEach(name => {
        const calls = mockToolRegistry.registerHandler.mock.calls;
        expect(calls.some(call => call[0] === name)).toBe(true);
      });
    });

    it('should register all sharputil handlers', () => {
      const sharpUtilHandlerNames = [
        'm3r__sharputil__query_capabilities',
        'm3r__sharputil__get_command_help',
        'm3r__sharputil__get_best_practices',
        'm3r__sharputil__check_executable',
        'm3r__sharputil__execute_command'
      ];

      sharpUtilHandlerNames.forEach(name => {
        const calls = mockToolRegistry.registerHandler.mock.calls;
        expect(calls.some(call => call[0] === name)).toBe(true);
      });
    });

    it('should register all dependency handlers', () => {
      const depHandlerNames = [
        'm3r__deps__detect_missing',
        'm3r__deps__install_dependency',
        'm3r__deps__store_git_credentials',
        'm3r__deps__get_git_credentials'
      ];

      depHandlerNames.forEach(name => {
        const calls = mockToolRegistry.registerHandler.mock.calls;
        expect(calls.some(call => call[0] === name)).toBe(true);
      });
    });

    it('should register all csharp handlers', () => {
      const csharpHandlerNames = [
        'm3r__csharp__create_project',
        'm3r__csharp__build_project',
        'm3r__csharp__publish_project',
        'm3r__csharp__add_nuget_package',
        'm3r__csharp__run_tests'
      ];

      csharpHandlerNames.forEach(name => {
        const calls = mockToolRegistry.registerHandler.mock.calls;
        expect(calls.some(call => call[0] === name)).toBe(true);
      });
    });

    it('should register legacy handlers', () => {
      const legacyHandlerNames = [
        'mcp__stripe__create_payment_intent',
        'mcp__openai__chat_completion',
        'mcp__github__create_repo'
      ];

      legacyHandlerNames.forEach(name => {
        const calls = mockToolRegistry.registerHandler.mock.calls;
        expect(calls.some(call => call[0] === name)).toBe(true);
      });
    });
  });

  describe('dependency injection', () => {
    it('should expose all dependencies for testing', () => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });

      expect(server.getConfig()).toBe(mockConfig);
      expect(server.getExpressServer()).toBe(mockExpressServer);
      expect(server.getToolRegistry()).toBe(mockToolRegistry);
      expect(server.getCredentialManager()).toBe(mockCredentialManager);
    });
  });

  describe('MCP request handlers', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
    });

    it('should setup tools/list handler', async () => {
      mockToolRegistry.getTools.mockReturnValue([
        { name: 'tool1', description: 'Test tool 1' },
        { name: 'tool2', description: 'Test tool 2' }
      ]);

      // Extract the handler from the server setup
      const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
      const mockServer = Server.mock.results[Server.mock.results.length - 1].value;
      
      // Find the tools/list handler
      const toolsListCall = mockServer.setRequestHandler.mock.calls
        .find(([type]) => type === 'tools/list');
      
      expect(toolsListCall).toBeDefined();
      
      // Execute the handler
      const handler = toolsListCall[1];
      const result = await handler();
      
      expect(result).toEqual({
        tools: [
          { name: 'tool1', description: 'Test tool 1' },
          { name: 'tool2', description: 'Test tool 2' }
        ]
      });
    });

    it('should setup tools/call handler', async () => {
      const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
      const mockServer = Server.mock.results[Server.mock.results.length - 1].value;
      
      // Find the tools/call handler
      const toolsCallCall = mockServer.setRequestHandler.mock.calls
        .find(([type]) => type === 'tools/call');
      
      expect(toolsCallCall).toBeDefined();
      
      const handler = toolsCallCall[1];
      expect(typeof handler).toBe('function');

      // Execute the handler to cover the actual handleToolCall method call
      const mockRequest = {
        params: {
          name: 'test_tool',
          arguments: { param: 'value' }
        }
      };

      mockToolRegistry.validateArgs.mockReturnValue({ valid: true, errors: [] });
      mockToolRegistry.executeHandler.mockResolvedValue({ success: true });

      const result = await handler(mockRequest);
      expect(result.content[0].text).toContain('success');
    });
  });

  describe('legacy handler implementations', () => {
    let stripeHandler, openaiHandler, githubHandler;

    beforeEach(() => {
      stripeHandler = require('../../../src/mcp/handlers/stripe');
      openaiHandler = require('../../../src/mcp/handlers/openai');
      githubHandler = require('../../../src/mcp/handlers/github');

      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
    });

    it('should execute stripe payment intent handler', async () => {
      const credentials = { apiKey: 'sk_test_123' };
      mockCredentialManager.getCredentials.mockReturnValue(credentials);
      stripeHandler.handle.mockResolvedValue({ success: true });

      // Find and execute the registered handler
      const calls = mockToolRegistry.registerHandler.mock.calls;
      const stripeCall = calls.find(([name]) => name === 'mcp__stripe__create_payment_intent');
      
      expect(stripeCall).toBeDefined();
      const [, handler] = stripeCall;
      
      const result = await handler({ amount: 1000 });
      
      expect(stripeHandler.handle).toHaveBeenCalledWith(
        'POST', 
        '/payment_intents', 
        { amount: 1000 }, 
        credentials
      );
      expect(result).toEqual({ success: true });
    });

    it('should execute OpenAI chat completion handler', async () => {
      const credentials = { apiKey: 'sk-openai123' };
      mockCredentialManager.getCredentials.mockReturnValue(credentials);
      openaiHandler.handle.mockResolvedValue({ choices: [{ message: { content: 'Hello' } }] });

      // Find and execute the registered handler
      const calls = mockToolRegistry.registerHandler.mock.calls;
      const openaiCall = calls.find(([name]) => name === 'mcp__openai__chat_completion');
      
      expect(openaiCall).toBeDefined();
      const [, handler] = openaiCall;
      
      const result = await handler({ messages: [{ role: 'user', content: 'Hi' }] });
      
      expect(openaiHandler.handle).toHaveBeenCalledWith(
        'POST', 
        '/chat/completions', 
        { messages: [{ role: 'user', content: 'Hi' }] }, 
        credentials
      );
      expect(result).toEqual({ choices: [{ message: { content: 'Hello' } }] });
    });

    it('should execute GitHub repository creation handler', async () => {
      const credentials = { token: 'ghp_123' };
      mockCredentialManager.getCredentials.mockReturnValue(credentials);
      githubHandler.handle.mockResolvedValue({ id: 123, name: 'test-repo' });

      // Find and execute the registered handler
      const calls = mockToolRegistry.registerHandler.mock.calls;
      const githubCall = calls.find(([name]) => name === 'mcp__github__create_repo');
      
      expect(githubCall).toBeDefined();
      const [, handler] = githubCall;
      
      const result = await handler({ name: 'test-repo', private: false });
      
      expect(githubHandler.handle).toHaveBeenCalledWith(
        'POST', 
        '/user/repos', 
        { name: 'test-repo', private: false }, 
        credentials
      );
      expect(result).toEqual({ id: 123, name: 'test-repo' });
    });
  });

  describe('Git credential integration', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
    });

    it('should execute store git credentials handler', async () => {
      mockCredentialManager.storeGitCredentials.mockResolvedValue({ success: true });

      // Find and execute the registered handler
      const calls = mockToolRegistry.registerHandler.mock.calls;
      const storeCall = calls.find(([name]) => name === 'm3r__deps__store_git_credentials');
      
      expect(storeCall).toBeDefined();
      const [, handler] = storeCall;
      
      const result = await handler({ 
        username: 'testuser', 
        token: 'ghp_123', 
        service: 'github' 
      });
      
      expect(mockCredentialManager.storeGitCredentials).toHaveBeenCalledWith(
        'testuser', 
        'ghp_123', 
        'github'
      );
      expect(result).toEqual({ success: true });
    });

    it('should execute get git credentials handler', async () => {
      mockCredentialManager.getGitCredentials.mockResolvedValue({ 
        username: 'testuser', 
        token: 'ghp_123' 
      });

      // Find and execute the registered handler
      const calls = mockToolRegistry.registerHandler.mock.calls;
      const getCall = calls.find(([name]) => name === 'm3r__deps__get_git_credentials');
      
      expect(getCall).toBeDefined();
      const [, handler] = getCall;
      
      const result = await handler({ service: 'github' });
      
      expect(mockCredentialManager.getGitCredentials).toHaveBeenCalledWith('github');
      expect(result).toEqual({ username: 'testuser', token: 'ghp_123' });
    });
  });

  describe('stop server edge cases', () => {
    beforeEach(() => {
      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager,
        logger: mockLogger
      });
    });

    it('should handle stop when no HTTP server exists', async () => {
      server.httpServer = null;
      server.server = { close: jest.fn() };

      await expect(server.stop()).resolves.not.toThrow();
      expect(server.server.close).toHaveBeenCalled();
    });

    it('should handle stop when no MCP server exists', async () => {
      server.httpServer = { close: jest.fn(callback => callback()) };
      server.server = null;

      await expect(server.stop()).resolves.not.toThrow();
      expect(server.httpServer.close).toHaveBeenCalled();
    });

    it('should handle stop when neither server exists', async () => {
      server.httpServer = null;
      server.server = null;

      await expect(server.stop()).resolves.not.toThrow();
    });
  });

  describe('handler execution coverage', () => {
    let systemHandler, sharpUtilHandler, depsHandler, csharpHandler;

    beforeEach(() => {
      systemHandler = require('../../../src/mcp/handlers/system-diagnostics');
      sharpUtilHandler = require('../../../src/mcp/handlers/sharputil-mcp-service');
      depsHandler = require('../../../src/mcp/handlers/dependency-manager');
      csharpHandler = require('../../../src/mcp/handlers/csharp-builder');

      // Setup mock responses
      systemHandler.getSystemInfo.mockResolvedValue({ system: 'info' });
      systemHandler.checkService.mockResolvedValue({ status: 'ok' });
      systemHandler.runDiagnostics.mockResolvedValue({ diagnostics: 'complete' });
      systemHandler.getSafeCommands.mockResolvedValue({ commands: ['ls'] });
      systemHandler.executeSafeCommand.mockResolvedValue({ output: 'executed' });

      sharpUtilHandler.queryCapabilities.mockResolvedValue({ capabilities: ['query'] });
      sharpUtilHandler.getCommandHelp.mockResolvedValue({ help: 'commands' });
      sharpUtilHandler.getBestPractices.mockResolvedValue({ practices: 'best' });
      sharpUtilHandler.checkExecutable.mockResolvedValue({ executable: true });
      sharpUtilHandler.executeCommand.mockResolvedValue({ result: 'executed' });

      depsHandler.detectMissing.mockResolvedValue({ missing: [] });
      depsHandler.installDependency.mockResolvedValue({ installed: true });

      csharpHandler.createProject.mockResolvedValue({ project: 'created' });
      csharpHandler.buildProject.mockResolvedValue({ build: 'success' });
      csharpHandler.publishProject.mockResolvedValue({ publish: 'success' });
      csharpHandler.addNuGetPackage.mockResolvedValue({ package: 'added' });
      csharpHandler.runTests.mockResolvedValue({ tests: 'passed' });

      server = new MAK3RMCPServer({
        config: mockConfig,
        expressServer: mockExpressServer,
        toolRegistry: mockToolRegistry,
        credentialManager: mockCredentialManager
      });
    });

    it('should execute all system handlers through registered functions', async () => {
      const calls = mockToolRegistry.registerHandler.mock.calls;
      
      // Execute system handlers
      const systemGetInfo = calls.find(([name]) => name === 'm3r__system__get_info')[1];
      await systemGetInfo({ test: 'args' });
      expect(systemHandler.getSystemInfo).toHaveBeenCalledWith({ test: 'args' });

      const systemCheckService = calls.find(([name]) => name === 'm3r__system__check_service')[1];  
      await systemCheckService({ service: 'test' });
      expect(systemHandler.checkService).toHaveBeenCalledWith({ service: 'test' });

      const systemRunDiagnostics = calls.find(([name]) => name === 'm3r__system__run_diagnostics')[1];
      await systemRunDiagnostics({});
      expect(systemHandler.runDiagnostics).toHaveBeenCalledWith({});

      const systemGetSafeCommands = calls.find(([name]) => name === 'm3r__system__get_safe_commands')[1];
      await systemGetSafeCommands({});
      expect(systemHandler.getSafeCommands).toHaveBeenCalledWith({});

      const systemExecuteSafeCommand = calls.find(([name]) => name === 'm3r__system__execute_safe_command')[1];
      await systemExecuteSafeCommand({ command: 'ls' });
      expect(systemHandler.executeSafeCommand).toHaveBeenCalledWith({ command: 'ls' });
    });

    it('should execute all sharputil handlers through registered functions', async () => {
      const calls = mockToolRegistry.registerHandler.mock.calls;
      
      const queryCapabilities = calls.find(([name]) => name === 'm3r__sharputil__query_capabilities')[1];
      await queryCapabilities({});
      expect(sharpUtilHandler.queryCapabilities).toHaveBeenCalledWith({});

      const getCommandHelp = calls.find(([name]) => name === 'm3r__sharputil__get_command_help')[1];
      await getCommandHelp({ command: 'help' });
      expect(sharpUtilHandler.getCommandHelp).toHaveBeenCalledWith({ command: 'help' });

      const getBestPractices = calls.find(([name]) => name === 'm3r__sharputil__get_best_practices')[1];
      await getBestPractices({});
      expect(sharpUtilHandler.getBestPractices).toHaveBeenCalledWith({});

      const checkExecutable = calls.find(([name]) => name === 'm3r__sharputil__check_executable')[1];
      await checkExecutable({ path: '/test' });
      expect(sharpUtilHandler.checkExecutable).toHaveBeenCalledWith({ path: '/test' });

      const executeCommand = calls.find(([name]) => name === 'm3r__sharputil__execute_command')[1];
      await executeCommand({ command: 'test' });
      expect(sharpUtilHandler.executeCommand).toHaveBeenCalledWith({ command: 'test' });
    });

    it('should execute all dependency handlers through registered functions', async () => {
      const calls = mockToolRegistry.registerHandler.mock.calls;
      
      const detectMissing = calls.find(([name]) => name === 'm3r__deps__detect_missing')[1];
      await detectMissing({});
      expect(depsHandler.detectMissing).toHaveBeenCalledWith({});

      const installDependency = calls.find(([name]) => name === 'm3r__deps__install_dependency')[1];
      await installDependency({ dependency: 'node' });
      expect(depsHandler.installDependency).toHaveBeenCalledWith({ dependency: 'node' });
    });

    it('should execute all C# handlers through registered functions', async () => {
      const calls = mockToolRegistry.registerHandler.mock.calls;
      
      const createProject = calls.find(([name]) => name === 'm3r__csharp__create_project')[1];
      await createProject({ name: 'test' });
      expect(csharpHandler.createProject).toHaveBeenCalledWith({ name: 'test' });

      const buildProject = calls.find(([name]) => name === 'm3r__csharp__build_project')[1];
      await buildProject({ project: 'test' });
      expect(csharpHandler.buildProject).toHaveBeenCalledWith({ project: 'test' });

      const publishProject = calls.find(([name]) => name === 'm3r__csharp__publish_project')[1];
      await publishProject({ project: 'test' });
      expect(csharpHandler.publishProject).toHaveBeenCalledWith({ project: 'test' });

      const addNuGetPackage = calls.find(([name]) => name === 'm3r__csharp__add_nuget_package')[1];
      await addNuGetPackage({ package: 'test' });
      expect(csharpHandler.addNuGetPackage).toHaveBeenCalledWith({ package: 'test' });

      const runTests = calls.find(([name]) => name === 'm3r__csharp__run_tests')[1];
      await runTests({ project: 'test' });
      expect(csharpHandler.runTests).toHaveBeenCalledWith({ project: 'test' });
    });
  });
});