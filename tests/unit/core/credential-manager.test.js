/**
 * CredentialManager Unit Tests
 * Testing secure credential storage with AES-256 encryption
 */

const CredentialManager = require('../../../src/core/credential-manager');
const ConfigurationManager = require('../../../src/core/configuration-manager');
const crypto = require('crypto');

describe('CredentialManager', () => {
  let credentialManager;
  let config;
  let mockFileSystem;

  beforeEach(() => {
    config = new ConfigurationManager({
      NODE_ENV: 'test',
      MAK3R_HUB_ENCRYPTION_KEY: 'a'.repeat(64), // 32 bytes as hex string
      CREDENTIALS_PATH: '/test/.mak3r-hub/credentials.json'
    });

    mockFileSystem = global.testUtils.mockFileSystem();
    credentialManager = new CredentialManager(config);
  });

  afterEach(() => {
    if (mockFileSystem) {
      mockFileSystem.restore();
    }
  });

  describe('constructor', () => {
    it('should initialize with configuration', () => {
      expect(credentialManager.config).toBe(config);
      expect(credentialManager.credentials).toBeInstanceOf(Map);
      expect(credentialManager.credentialsPath).toBe('/test/.mak3r-hub/credentials.json');
    });

    it('should use configured encryption key', () => {
      expect(credentialManager.encryptionKey).toBe('a'.repeat(64));
    });

    it('should generate encryption key if none provided', () => {
      const configWithoutKey = new ConfigurationManager({ NODE_ENV: 'test' });
      const manager = new CredentialManager(configWithoutKey);
      
      expect(manager.encryptionKey).toBeDefined();
      expect(manager.encryptionKey.length).toBe(64); // 32 bytes as hex
    });
  });

  describe('encryption/decryption', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'sensitive-api-key-12345';
      
      const encrypted = credentialManager.encrypt(originalText);
      expect(encrypted).not.toBe(originalText);
      expect(encrypted).toContain(':');
      
      const decrypted = credentialManager.decrypt(encrypted);
      expect(decrypted).toBe(originalText);
    });

    it('should return original text for null/undefined input', () => {
      expect(credentialManager.encrypt(null)).toBe(null);
      expect(credentialManager.encrypt(undefined)).toBe(undefined);
      expect(credentialManager.decrypt(null)).toBe(null);
      expect(credentialManager.decrypt(undefined)).toBe(undefined);
    });

    it('should return original text for malformed encrypted input', () => {
      expect(credentialManager.decrypt('no-colon-separator')).toBe('no-colon-separator');
      expect(credentialManager.decrypt('')).toBe('');
    });

    it('should produce different encrypted values for same input', () => {
      const text = 'same-input-text';
      
      const encrypted1 = credentialManager.encrypt(text);
      const encrypted2 = credentialManager.encrypt(text);
      
      expect(encrypted1).not.toBe(encrypted2);
      expect(credentialManager.decrypt(encrypted1)).toBe(text);
      expect(credentialManager.decrypt(encrypted2)).toBe(text);
    });
  });

  describe('loadCredentials', () => {
    it('should load and decrypt credentials from file', async () => {
      const encryptedData = {
        stripe: {
          apiKey: credentialManager.encrypt('sk_test_123'),
          secret: credentialManager.encrypt('secret_456')
        }
      };

      mockFileSystem = global.testUtils.mockFileSystem({
        '/test/.mak3r-hub/credentials.json': JSON.stringify(encryptedData)
      });

      await credentialManager.loadCredentials();
      
      const stripeCredentials = credentialManager.getCredentials('stripe');
      expect(stripeCredentials).toEqual({
        apiKey: 'sk_test_123',
        secret: 'secret_456'
      });
    });

    it('should handle missing credentials file gracefully', async () => {
      // Mock console.warn to capture warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await credentialManager.loadCredentials();
      
      expect(credentialManager.credentials.size).toBe(0);
      consoleSpy.mockRestore();
    });

    it('should handle corrupted credentials file', async () => {
      mockFileSystem = global.testUtils.mockFileSystem({
        '/test/.mak3r-hub/credentials.json': 'invalid-json'
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await credentialManager.loadCredentials();
      
      expect(credentialManager.credentials.size).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load credentials:'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('saveCredentials', () => {
    it('should encrypt and save credentials to file', async () => {
      credentialManager.setCredentials('github', {
        username: 'testuser',
        token: 'ghp_test_token'
      });

      // Wait for the save to complete
      await new Promise(resolve => setTimeout(resolve, 10));

      const files = mockFileSystem.getFiles();
      const savedData = JSON.parse(files['/test/.mak3r-hub/credentials.json']);
      
      expect(savedData.github).toBeDefined();
      expect(savedData.github.username).toContain(':');
      expect(savedData.github.token).toContain(':');
      
      // Verify decryption works
      expect(credentialManager.decrypt(savedData.github.username)).toBe('testuser');
      expect(credentialManager.decrypt(savedData.github.token)).toBe('ghp_test_token');
    });

    it('should create directory if it doesn\'t exist', async () => {
      credentialManager.setCredentials('test', { key: 'value' });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const files = mockFileSystem.getFiles();
      expect(files['/test/.mak3r-hub/credentials.json']).toBeDefined();
    });
  });

  describe('credential management', () => {
    it('should set and get credentials', async () => {
      const credentials = { apiKey: 'test-key', secret: 'test-secret' };
      
      await credentialManager.setCredentials('service1', credentials);
      
      expect(credentialManager.getCredentials('service1')).toEqual(credentials);
      expect(credentialManager.hasCredentials('service1')).toBe(true);
    });

    it('should return undefined for non-existent service', () => {
      expect(credentialManager.getCredentials('nonexistent')).toBeUndefined();
      expect(credentialManager.hasCredentials('nonexistent')).toBe(false);
    });

    it('should remove credentials', async () => {
      await credentialManager.setCredentials('temp-service', { key: 'value' });
      expect(credentialManager.hasCredentials('temp-service')).toBe(true);
      
      await credentialManager.removeCredentials('temp-service');
      expect(credentialManager.hasCredentials('temp-service')).toBe(false);
    });

    it('should list all service names', async () => {
      await credentialManager.setCredentials('service1', { key: 'value1' });
      await credentialManager.setCredentials('service2', { key: 'value2' });
      
      const services = credentialManager.listServices();
      expect(services).toContain('service1');
      expect(services).toContain('service2');
      expect(services.length).toBe(2);
    });
  });

  describe('Git credential management', () => {
    it('should store Git credentials securely', async () => {
      const result = await credentialManager.storeGitCredentials(
        'testuser',
        'ghp_token_123',
        'github'
      );
      
      expect(result.success).toBe(true);
      expect(result.message).toContain('Git credentials for github stored securely');
      
      const stored = credentialManager.getCredentials('git_github');
      expect(stored.username).toBe('testuser');
      expect(stored.token).toBe('ghp_token_123');
      expect(stored.service).toBe('github');
      expect(stored.storedAt).toBeDefined();
    });

    it('should retrieve Git credentials', async () => {
      await credentialManager.storeGitCredentials('user', 'token', 'gitlab');
      
      const result = await credentialManager.getGitCredentials('gitlab');
      
      expect(result.success).toBe(true);
      expect(result.credentials).toMatchObject({
        username: 'user',
        service: 'gitlab',
        hasToken: true,
        storedAt: expect.any(String)
      });
      expect(result.credentials.token).toBeUndefined(); // Should not expose token
    });

    it('should handle missing Git credentials', async () => {
      const result = await credentialManager.getGitCredentials('nonexistent');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('No Git credentials found');
      expect(result.credentials).toBe(null);
    });

    it('should default to github service', async () => {
      await credentialManager.storeGitCredentials('user', 'token');
      
      const result = await credentialManager.getGitCredentials();
      expect(result.success).toBe(true);
      expect(result.credentials.service).toBe('github');
    });
  });

  describe('credential validation', () => {
    it('should validate credentials with required fields', () => {
      credentialManager.setCredentials('stripe', {
        apiKey: 'sk_test_123',
        publishableKey: 'pk_test_456'
      });
      
      const validation = credentialManager.validateCredentials('stripe', ['apiKey']);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      credentialManager.setCredentials('stripe', {
        publishableKey: 'pk_test_456'
      });
      
      const validation = credentialManager.validateCredentials('stripe', ['apiKey', 'secret']);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing apiKey for stripe');
      expect(validation.errors).toContain('Missing secret for stripe');
    });

    it('should detect missing service', () => {
      const validation = credentialManager.validateCredentials('nonexistent', ['field']);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No credentials found for nonexistent');
    });
  });

  describe('credentials summary', () => {
    it('should provide credentials summary', () => {
      credentialManager.setCredentials('stripe', {
        apiKey: 'sk_test_123',
        secret: 'secret_456'
      });
      credentialManager.setCredentials('github', {
        username: 'user',
        token: 'ghp_token'
      });
      
      const summary = credentialManager.getCredentialsSummary();
      
      expect(summary.stripe).toMatchObject({
        hasCredentials: true,
        fieldCount: 2,
        fields: [
          { name: 'apiKey', hasValue: true, encrypted: true },
          { name: 'secret', hasValue: true, encrypted: true }
        ]
      });
      
      expect(summary.github).toMatchObject({
        hasCredentials: true,
        fieldCount: 2,
        fields: [
          { name: 'username', hasValue: true, encrypted: false },
          { name: 'token', hasValue: true, encrypted: true }
        ]
      });
    });
  });

  describe('cleanup', () => {
    it('should remove empty credential entries', async () => {
      credentialManager.setCredentials('valid', { key: 'value' });
      credentialManager.setCredentials('empty', {});
      credentialManager.credentials.set('null', null);
      
      const result = await credentialManager.cleanup();
      
      expect(result.removed).toEqual(['empty', 'null']);
      expect(result.remaining).toEqual(['valid']);
      expect(credentialManager.hasCredentials('valid')).toBe(true);
      expect(credentialManager.hasCredentials('empty')).toBe(false);
    });

    it('should save after cleanup', async () => {
      credentialManager.setCredentials('empty', {});
      await credentialManager.cleanup();
      
      // Verify save was called by checking file system
      const files = mockFileSystem.getFiles();
      const savedData = JSON.parse(files['/test/.mak3r-hub/credentials.json']);
      expect(savedData.empty).toBeUndefined();
    });
  });
});