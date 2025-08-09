/**
 * Configuration Manager
 * Centralized configuration with environment variable support
 */

class ConfigurationManager {
  constructor(env = process.env) {
    this.env = env;
    this.config = this.loadConfiguration();
  }

  loadConfiguration() {
    return {
      server: {
        port: this.getNumber('MCP_PORT', 3001),
        host: this.getString('MCP_HOST', 'localhost'),
        timeout: this.getNumber('MCP_TIMEOUT', 30000)
      },
      
      rateLimiting: {
        enabled: this.getBoolean('RATE_LIMIT_ENABLED', true),
        windowMs: this.getNumber('RATE_LIMIT_WINDOW', 15 * 60 * 1000),
        maxRequests: this.getNumber('RATE_LIMIT_MAX', 100),
        message: this.getString('RATE_LIMIT_MESSAGE', 'Too many requests from this IP')
      },
      
      security: {
        encryptionKey: this.getString('MAK3R_HUB_ENCRYPTION_KEY', null),
        credentialsPath: this.getString('CREDENTIALS_PATH', 
          `${this.env.HOME || this.env.USERPROFILE}/.mak3r-hub/credentials.json`),
        enableHelmet: this.getBoolean('ENABLE_HELMET', true),
        corsEnabled: this.getBoolean('CORS_ENABLED', false),
        allowedOrigins: this.getArray('ALLOWED_ORIGINS', ['http://localhost:3000'])
      },
      
      logging: {
        level: this.getString('LOG_LEVEL', 'info'),
        logPath: this.getString('LOG_PATH', 
          `${this.env.HOME || this.env.USERPROFILE}/.mak3r-hub/mcp.log`),
        enableConsole: this.getBoolean('LOG_CONSOLE', true),
        enableFile: this.getBoolean('LOG_FILE', true)
      },
      
      services: {
        stripe: {
          enabled: this.getBoolean('STRIPE_ENABLED', false),
          apiVersion: this.getString('STRIPE_API_VERSION', '2023-10-16')
        },
        github: {
          enabled: this.getBoolean('GITHUB_ENABLED', false),
          apiUrl: this.getString('GITHUB_API_URL', 'https://api.github.com')
        },
        openai: {
          enabled: this.getBoolean('OPENAI_ENABLED', false),
          model: this.getString('OPENAI_DEFAULT_MODEL', 'gpt-4'),
          maxTokens: this.getNumber('OPENAI_MAX_TOKENS', 1000)
        }
      },
      
      development: {
        isDevelopment: this.env.NODE_ENV === 'development',
        isTest: this.env.NODE_ENV === 'test',
        isProduction: this.env.NODE_ENV === 'production',
        debugMode: this.getBoolean('DEBUG', false)
      },
      
      paths: {
        sharpUtility: this.getArray('SHARP_UTILITY_PATHS', [
          'batch-ops/sharpUtilityGUI.exe',
          'batch-ops/sharpUtility.exe',
          '../batch-ops/sharpUtilityGUI.exe',
          '../../batch-ops/sharpUtilityGUI.exe'
        ])
      },
      
      csharpExtensions: {
        enabled: this.getBoolean('CSHARP_EXTENSIONS_ENABLED', true),
        executablePath: this.getString('MAK3R_CORE_PATH', null), // Auto-detected if null
        timeout: this.getNumber('CSHARP_EXTENSION_TIMEOUT', 30000),
        maxRetries: this.getNumber('CSHARP_EXTENSION_MAX_RETRIES', 3),
        enableLogging: this.getBoolean('CSHARP_EXTENSION_LOGGING', true),
        
        // Search paths for MAK3R.Core.exe (checked in order)
        searchPaths: this.getArray('MAK3R_CORE_SEARCH_PATHS', [
          './src-csharp/MAK3R.Core/bin/Release/net9.0/win-x64/MAK3R.Core.exe',
          './src-csharp/MAK3R.Core/bin/Debug/net9.0/win-x64/MAK3R.Core.exe',
          '../src-csharp/MAK3R.Core/bin/Release/net9.0/win-x64/MAK3R.Core.exe',
          '../src-csharp/MAK3R.Core/bin/Debug/net9.0/win-x64/MAK3R.Core.exe',
          '../../src-csharp/MAK3R.Core/bin/Release/net9.0/win-x64/MAK3R.Core.exe',
          './tools/MAK3R-HUB/src-csharp/MAK3R.Core/bin/Release/net9.0/win-x64/MAK3R.Core.exe',
          './tools/MAK3R-HUB/src-csharp/MAK3R.Core/bin/Debug/net9.0/win-x64/MAK3R.Core.exe'
        ]),
        
        // Extensions to load automatically
        autoLoadExtensions: this.getArray('CSHARP_AUTO_LOAD_EXTENSIONS', [
          'template-extension'
        ]),
        
        // Extension discovery paths
        extensionPaths: this.getArray('CSHARP_EXTENSION_PATHS', [
          './src-csharp/MAK3R.Extensions.Template',
          '../src-csharp/MAK3R.Extensions.Template',
          './tools/MAK3R-HUB/src-csharp/MAK3R.Extensions.Template'
        ])
      }
    };
  }

  /**
   * Get string value from environment
   */
  getString(key, defaultValue = '') {
    return this.env[key] || defaultValue;
  }

  /**
   * Get number value from environment
   */
  getNumber(key, defaultValue = 0) {
    const value = this.env[key];
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Get boolean value from environment
   */
  getBoolean(key, defaultValue = false) {
    const value = this.env[key];
    if (value === undefined) return defaultValue;
    return value === 'true' || value === '1' || value === 'yes';
  }

  /**
   * Get array value from environment (comma-separated)
   */
  getArray(key, defaultValue = []) {
    const value = this.env[key];
    if (!value) return defaultValue;
    return value.split(',').map(item => item.trim());
  }

  /**
   * Get specific configuration section
   */
  get(path) {
    const keys = path.split('.');
    let current = this.config;
    
    for (const key of keys) {
      if (current[key] === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }

  /**
   * Set configuration value (for testing)
   */
  set(path, value) {
    const keys = path.split('.');
    let current = this.config;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (current[key] === undefined) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];
    
    // Check required values
    if (!this.config.security.encryptionKey && this.config.development.isProduction) {
      errors.push('Encryption key is required in production');
    }
    
    if (this.config.server.port < 1 || this.config.server.port > 65535) {
      errors.push('Invalid port number');
    }
    
    if (this.config.rateLimiting.windowMs < 1000) {
      errors.push('Rate limit window must be at least 1 second');
    }
    
    if (this.config.rateLimiting.maxRequests < 1) {
      errors.push('Rate limit max requests must be at least 1');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get configuration as JSON
   */
  toJSON() {
    // Redact sensitive values
    const config = JSON.parse(JSON.stringify(this.config));
    
    if (config.security.encryptionKey) {
      config.security.encryptionKey = '***REDACTED***';
    }
    
    return config;
  }

  /**
   * Create configuration from object (for testing)
   */
  static fromObject(configObject) {
    const manager = new ConfigurationManager({});
    manager.config = configObject;
    return manager;
  }
}

module.exports = ConfigurationManager;