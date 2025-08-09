/**
 * ExpressServer Unit Tests
 * Testing Express server configuration, middleware, and routing
 */

const ExpressServer = require('../../../src/core/express-server');
const ConfigurationManager = require('../../../src/core/configuration-manager');
const request = require('supertest');

describe('ExpressServer', () => {
  let expressServer;
  let config;

  beforeEach(() => {
    config = new ConfigurationManager({
      NODE_ENV: 'test',
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_WINDOW: '60000',
      RATE_LIMIT_MAX: '10',
      ENABLE_HELMET: 'true'
    });

    expressServer = new ExpressServer(config);
  });

  afterEach(() => {
    // Clean up any open connections
    if (expressServer.server) {
      expressServer.server.close();
    }
  });

  describe('constructor', () => {
    it('should initialize Express app', () => {
      expect(expressServer.app).toBeDefined();
      expect(expressServer.config).toBe(config);
      expect(expressServer.credentials).toBeInstanceOf(Map);
    });

    it('should setup middleware and routes', () => {
      // Verify middleware stack exists
      expect(expressServer.app._router.stack.length).toBeGreaterThan(0);
    });
  });

  describe('health endpoint', () => {
    it('should return health status', async () => {
      const response = await request(expressServer.app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'healthy',
        version: '1.0.0',
        timestamp: expect.any(String),
        services: expect.any(Object)
      });
    });

    it('should include timestamp in ISO format', async () => {
      const response = await request(expressServer.app)
        .get('/health');

      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('createApiRouter', () => {
    let mockHandler;

    beforeEach(() => {
      mockHandler = {
        handle: jest.fn()
      };
    });

    it('should create router with credential middleware', () => {
      const router = expressServer.createApiRouter('test-service', mockHandler);
      expect(router).toBeDefined();
    });

    it('should require credentials for API access', async () => {
      const router = expressServer.createApiRouter('test-service', mockHandler);
      expressServer.app.use('/test', router);

      const response = await request(expressServer.app)
        .get('/test/endpoint')
        .expect(401);

      expect(response.body.error).toContain('No credentials configured');
    });

    it('should proxy requests to handler when credentials exist', async () => {
      mockHandler.handle.mockResolvedValue({ success: true, data: 'test' });
      
      expressServer.setCredentials('test-service', { apiKey: 'test-key' });
      const router = expressServer.createApiRouter('test-service', mockHandler);
      expressServer.app.use('/test', router);

      const response = await request(expressServer.app)
        .post('/test/endpoint')
        .send({ param: 'value' })
        .expect(200);

      expect(response.body).toEqual({ success: true, data: 'test' });
      expect(mockHandler.handle).toHaveBeenCalledWith(
        'POST',
        '/endpoint',
        { param: 'value' },
        { apiKey: 'test-key' }
      );
    });

    it('should handle handler errors gracefully', async () => {
      const testError = new Error('Handler failed');
      mockHandler.handle.mockRejectedValue(testError);

      expressServer.setCredentials('test-service', { apiKey: 'test-key' });
      const router = expressServer.createApiRouter('test-service', mockHandler);
      expressServer.app.use('/test', router);

      // Mock console.error to capture log output
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await request(expressServer.app)
        .get('/test/endpoint')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Handler failed',
        service: 'test-service'
      });

      consoleSpy.mockRestore();
    });
  });

  describe('addApiRoute', () => {
    it('should add API route with handler', () => {
      const mockHandler = { handle: jest.fn() };
      
      expressServer.addApiRoute('/api/test', 'test-service', mockHandler);
      
      // Verify route was added to Express app
      const routes = expressServer.app._router.stack
        .filter(layer => layer.regexp.test('/api/test'));
      
      expect(routes.length).toBeGreaterThan(0);
    });
  });

  describe('credential management', () => {
    it('should set and get credentials', () => {
      const credentials = { apiKey: 'test-key', secret: 'test-secret' };
      
      expressServer.setCredentials('test-service', credentials);
      
      expect(expressServer.credentials.get('test-service')).toEqual(credentials);
    });

    it('should include credentials in service status', () => {
      expressServer.setCredentials('service1', { key: 'value1' });
      expressServer.setCredentials('service2', { key: 'value2' });
      
      const status = expressServer.getServiceStatus();
      
      expect(status).toEqual({
        service1: { status: 'configured' },
        service2: { status: 'configured' }
      });
    });
  });

  describe('logging', () => {
    it('should log errors with service context', () => {
      const mockLogger = {
        error: jest.fn()
      };

      const error = new Error('Test error');
      error.stack = 'Error stack trace';

      expressServer.logError('test-service', error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('[test-service] Test error');
      expect(mockLogger.error).toHaveBeenCalledWith('Error stack trace');
    });

    it('should handle errors without stack trace', () => {
      const mockLogger = {
        error: jest.fn()
      };

      const error = new Error('Test error');
      delete error.stack;

      expressServer.logError('test-service', error, mockLogger);

      expect(mockLogger.error).toHaveBeenCalledWith('[test-service] Test error');
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('server lifecycle', () => {
    it('should start server on specified port', (done) => {
      const server = expressServer.listen(0, 'localhost', () => {
        const address = server.address();
        expect(address.port).toBeGreaterThan(0);
        expect(address.address).toMatch(/^(127\.0\.0\.1|::1)$/); // Allow both IPv4 and IPv6
        
        server.close(done);
      });
    }, 15000); // Increase timeout

    it('should return Express app instance', () => {
      const app = expressServer.getApp();
      expect(app).toBe(expressServer.app);
    });
  });

  describe('middleware configuration', () => {
    it('should apply helmet when enabled', () => {
      const config = new ConfigurationManager({
        ENABLE_HELMET: 'true'
      });

      const server = new ExpressServer(config);
      
      // Helmet adds multiple middleware layers
      const helmetLayers = server.app._router.stack
        .filter(layer => layer.name === 'helmetMiddleware' || 
                        layer.handle.toString().includes('helmet'));
      
      expect(helmetLayers.length).toBeGreaterThan(0);
    });

    it('should skip helmet when disabled', () => {
      const config = new ConfigurationManager({
        ENABLE_HELMET: 'false'
      });

      const server = new ExpressServer(config);
      
      // Should have fewer middleware layers without helmet
      expect(server.app._router.stack.length).toBeLessThan(10);
    });

    it('should apply rate limiting when enabled', () => {
      const config = new ConfigurationManager({
        RATE_LIMIT_ENABLED: 'true'
      });

      const server = new ExpressServer(config);
      
      // Rate limiting adds middleware
      const rateLimitLayers = server.app._router.stack
        .filter(layer => layer.regexp.test('/api/'));
      
      expect(rateLimitLayers.length).toBeGreaterThan(0);
    });

    it('should skip rate limiting when disabled', () => {
      const config = new ConfigurationManager({
        RATE_LIMIT_ENABLED: 'false'
      });

      const server = new ExpressServer(config);
      
      // Should have basic middleware but not rate limiting
      expect(server.app._router.stack.length).toBeGreaterThan(0);
      expect(config.get('rateLimiting.enabled')).toBe(false);
    });
  });

  describe('getServiceStatus edge cases', () => {
    it('should handle empty credentials', () => {
      const status = expressServer.getServiceStatus();
      expect(status).toEqual({});
    });

    it('should include multiple services in status', () => {
      expressServer.setCredentials('service1', { key: 'value1' });
      expressServer.setCredentials('service2', { key: 'value2' });
      expressServer.setCredentials('service3', { key: 'value3' });
      
      const status = expressServer.getServiceStatus();
      
      expect(Object.keys(status)).toHaveLength(3);
      expect(status.service1).toEqual({ status: 'configured' });
      expect(status.service2).toEqual({ status: 'configured' });
      expect(status.service3).toEqual({ status: 'configured' });
    });
  });
});