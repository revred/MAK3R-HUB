/**
 * Configuration Manager Unit Tests
 * Testing configuration loading, validation, and environment variable parsing
 */

const ConfigurationManager = require('../../../src/core/configuration-manager');

describe('ConfigurationManager', () => {
  let originalEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should load default configuration', () => {
      const config = new ConfigurationManager();
      
      expect(config.config).toBeDefined();
      expect(config.config.server.port).toBe(3001);
      expect(config.config.server.host).toBe('localhost');
      expect(config.config.rateLimiting.enabled).toBe(true);
    });

    it('should load configuration from environment variables', () => {
      const env = {
        MCP_PORT: '3002',
        MCP_HOST: '0.0.0.0',
        RATE_LIMIT_ENABLED: 'false',
        LOG_LEVEL: 'debug'
      };
      
      const config = new ConfigurationManager(env);
      
      expect(config.config.server.port).toBe(3002);
      expect(config.config.server.host).toBe('0.0.0.0');
      expect(config.config.rateLimiting.enabled).toBe(false);
      expect(config.config.logging.level).toBe('debug');
    });
  });

  describe('getString', () => {
    it('should return environment variable value', () => {
      const config = new ConfigurationManager({ TEST_STRING: 'hello' });
      expect(config.getString('TEST_STRING')).toBe('hello');
    });

    it('should return default value when not set', () => {
      const config = new ConfigurationManager({});
      expect(config.getString('TEST_STRING', 'default')).toBe('default');
    });
  });

  describe('getNumber', () => {
    it('should parse integer from environment variable', () => {
      const config = new ConfigurationManager({ TEST_NUMBER: '42' });
      expect(config.getNumber('TEST_NUMBER')).toBe(42);
    });

    it('should return default for invalid number', () => {
      const config = new ConfigurationManager({ TEST_NUMBER: 'invalid' });
      expect(config.getNumber('TEST_NUMBER', 10)).toBe(10);
    });

    it('should return default when not set', () => {
      const config = new ConfigurationManager({});
      expect(config.getNumber('TEST_NUMBER', 5)).toBe(5);
    });
  });

  describe('getBoolean', () => {
    it.each([
      ['true', true],
      ['1', true],
      ['yes', true],
      ['false', false],
      ['0', false],
      ['no', false],
      ['invalid', false]
    ])('should parse %s as %s', (input, expected) => {
      const config = new ConfigurationManager({ TEST_BOOL: input });
      expect(config.getBoolean('TEST_BOOL')).toBe(expected);
    });

    it('should return default when not set', () => {
      const config = new ConfigurationManager({});
      expect(config.getBoolean('TEST_BOOL', true)).toBe(true);
    });
  });

  describe('getArray', () => {
    it('should parse comma-separated values', () => {
      const config = new ConfigurationManager({ TEST_ARRAY: 'a,b,c' });
      expect(config.getArray('TEST_ARRAY')).toEqual(['a', 'b', 'c']);
    });

    it('should trim whitespace', () => {
      const config = new ConfigurationManager({ TEST_ARRAY: ' a , b , c ' });
      expect(config.getArray('TEST_ARRAY')).toEqual(['a', 'b', 'c']);
    });

    it('should return default when not set', () => {
      const config = new ConfigurationManager({});
      expect(config.getArray('TEST_ARRAY', ['default'])).toEqual(['default']);
    });
  });

  describe('get', () => {
    it('should get nested configuration value', () => {
      const config = new ConfigurationManager();
      
      expect(config.get('server.port')).toBe(3001);
      expect(config.get('rateLimiting.windowMs')).toBe(15 * 60 * 1000);
      expect(config.get('security.enableHelmet')).toBe(true);
    });

    it('should return undefined for non-existent path', () => {
      const config = new ConfigurationManager();
      
      expect(config.get('non.existent.path')).toBeUndefined();
    });

    it('should return section object', () => {
      const config = new ConfigurationManager();
      const server = config.get('server');
      
      expect(server).toEqual({
        port: 3001,
        host: 'localhost',
        timeout: 30000
      });
    });
  });

  describe('set', () => {
    it('should set nested configuration value', () => {
      const config = new ConfigurationManager();
      
      config.set('server.port', 4000);
      expect(config.get('server.port')).toBe(4000);
      
      config.set('new.nested.value', 'test');
      expect(config.get('new.nested.value')).toBe('test');
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = new ConfigurationManager();
      const result = config.validate();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing encryption key in production', () => {
      const config = new ConfigurationManager({ NODE_ENV: 'production' });
      config.set('security.encryptionKey', null);
      
      const result = config.validate();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Encryption key is required in production');
    });

    it('should detect invalid port number', () => {
      const config = new ConfigurationManager();
      
      config.set('server.port', 0);
      let result = config.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid port number');
      
      config.set('server.port', 70000);
      result = config.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid port number');
    });

    it('should detect invalid rate limit settings', () => {
      const config = new ConfigurationManager();
      
      config.set('rateLimiting.windowMs', 500);
      let result = config.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rate limit window must be at least 1 second');
      
      config.set('rateLimiting.windowMs', 60000);
      config.set('rateLimiting.maxRequests', 0);
      result = config.validate();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Rate limit max requests must be at least 1');
    });
  });

  describe('toJSON', () => {
    it('should return configuration as JSON', () => {
      const config = new ConfigurationManager();
      const json = config.toJSON();
      
      expect(json).toMatchObject({
        server: expect.any(Object),
        rateLimiting: expect.any(Object),
        security: expect.any(Object),
        logging: expect.any(Object),
        services: expect.any(Object),
        development: expect.any(Object),
        paths: expect.any(Object)
      });
    });

    it('should redact sensitive values', () => {
      const config = new ConfigurationManager({ 
        MAK3R_HUB_ENCRYPTION_KEY: 'super-secret-key' 
      });
      
      const json = config.toJSON();
      
      expect(json.security.encryptionKey).toBe('***REDACTED***');
    });
  });

  describe('fromObject', () => {
    it('should create configuration from object', () => {
      const configObject = {
        server: { port: 5000, host: '127.0.0.1' },
        custom: { value: 'test' }
      };
      
      const config = ConfigurationManager.fromObject(configObject);
      
      expect(config.get('server.port')).toBe(5000);
      expect(config.get('server.host')).toBe('127.0.0.1');
      expect(config.get('custom.value')).toBe('test');
    });
  });

  describe('environment-specific configuration', () => {
    it('should detect development environment', () => {
      const config = new ConfigurationManager({ NODE_ENV: 'development' });
      
      expect(config.config.development.isDevelopment).toBe(true);
      expect(config.config.development.isTest).toBe(false);
      expect(config.config.development.isProduction).toBe(false);
    });

    it('should detect test environment', () => {
      const config = new ConfigurationManager({ NODE_ENV: 'test' });
      
      expect(config.config.development.isDevelopment).toBe(false);
      expect(config.config.development.isTest).toBe(true);
      expect(config.config.development.isProduction).toBe(false);
    });

    it('should detect production environment', () => {
      const config = new ConfigurationManager({ NODE_ENV: 'production' });
      
      expect(config.config.development.isDevelopment).toBe(false);
      expect(config.config.development.isTest).toBe(false);
      expect(config.config.development.isProduction).toBe(true);
    });
  });

  describe('service configuration', () => {
    it('should configure services from environment', () => {
      const env = {
        STRIPE_ENABLED: 'true',
        STRIPE_API_VERSION: '2024-01-01',
        GITHUB_ENABLED: 'true',
        GITHUB_API_URL: 'https://custom.github.com',
        OPENAI_ENABLED: 'true',
        OPENAI_DEFAULT_MODEL: 'gpt-4-turbo',
        OPENAI_MAX_TOKENS: '2000'
      };
      
      const config = new ConfigurationManager(env);
      
      expect(config.config.services.stripe.enabled).toBe(true);
      expect(config.config.services.stripe.apiVersion).toBe('2024-01-01');
      expect(config.config.services.github.enabled).toBe(true);
      expect(config.config.services.github.apiUrl).toBe('https://custom.github.com');
      expect(config.config.services.openai.enabled).toBe(true);
      expect(config.config.services.openai.model).toBe('gpt-4-turbo');
      expect(config.config.services.openai.maxTokens).toBe(2000);
    });
  });
});