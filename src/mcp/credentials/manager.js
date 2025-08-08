/**
 * Secure Credential Manager for MAK3R-HUB MCP
 * Handles encrypted storage and management of API credentials
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

class CredentialManager {
  constructor(options = {}) {
    this.credentialsDir = options.credentialsDir || path.join(os.homedir(), '.mak3r-hub');
    this.credentialsFile = path.join(this.credentialsDir, 'credentials.enc');
    this.keyFile = path.join(this.credentialsDir, 'keyring.enc');
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32;
    this.ivLength = 16;
    this.tagLength = 16;
    this.saltLength = 32;
    
    // In-memory credential cache
    this.cache = new Map();
    this.masterKey = null;
  }

  async initialize() {
    try {
      await fs.ensureDir(this.credentialsDir);
      await this.loadOrCreateMasterKey();
      await this.loadCredentials();
      
      console.log('Credential manager initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize credential manager: ${error.message}`);
    }
  }

  async loadOrCreateMasterKey() {
    try {
      if (await fs.pathExists(this.keyFile)) {
        // Load existing master key
        const keyData = await fs.readFile(this.keyFile);
        this.masterKey = this.decryptMasterKey(keyData);
      } else {
        // Generate new master key
        this.masterKey = crypto.randomBytes(this.keyLength);
        const encryptedKey = this.encryptMasterKey(this.masterKey);
        await fs.writeFile(this.keyFile, encryptedKey);
        
        // Set restrictive permissions on key file
        if (process.platform !== 'win32') {
          await fs.chmod(this.keyFile, 0o600);
        }
      }
    } catch (error) {
      throw new Error(`Failed to handle master key: ${error.message}`);
    }
  }

  encryptMasterKey(key) {
    // Simplified encryption for compatibility
    const machineId = this.getMachineId();
    const salt = crypto.randomBytes(this.saltLength);
    const combinedKey = Buffer.concat([machineId.slice(0, 16), salt.slice(0, 16)]);
    
    // Use XOR for simple obfuscation
    const result = Buffer.alloc(key.length + salt.length);
    salt.copy(result, 0);
    
    for (let i = 0; i < key.length; i++) {
      result[i + salt.length] = key[i] ^ combinedKey[i % combinedKey.length];
    }
    
    return result;
  }

  decryptMasterKey(encryptedData) {
    const machineId = this.getMachineId();
    const salt = encryptedData.slice(0, this.saltLength);
    const encrypted = encryptedData.slice(this.saltLength);
    const combinedKey = Buffer.concat([machineId.slice(0, 16), salt.slice(0, 16)]);
    
    // Use XOR to decrypt
    const result = Buffer.alloc(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      result[i] = encrypted[i] ^ combinedKey[i % combinedKey.length];
    }
    
    return result;
  }

  getMachineId() {
    // Create a machine-specific identifier
    const hostname = os.hostname();
    const username = os.userInfo().username;
    const platform = os.platform();
    const arch = os.arch();
    
    return crypto.createHash('sha256')
      .update(`${hostname}-${username}-${platform}-${arch}`)
      .digest();
  }

  async loadCredentials() {
    try {
      if (await fs.pathExists(this.credentialsFile)) {
        const encryptedData = await fs.readFile(this.credentialsFile);
        const decryptedData = this.decrypt(encryptedData);
        const credentials = JSON.parse(decryptedData);
        
        // Load into cache
        for (const [service, creds] of Object.entries(credentials)) {
          this.cache.set(service, creds);
        }
        
        console.log(`Loaded credentials for ${this.cache.size} services`);
      }
    } catch (error) {
      console.warn(`Failed to load credentials: ${error.message}`);
    }
  }

  async saveCredentials() {
    try {
      const credentials = {};
      for (const [service, creds] of this.cache.entries()) {
        credentials[service] = creds;
      }
      
      const jsonData = JSON.stringify(credentials, null, 2);
      const encryptedData = this.encrypt(jsonData);
      await fs.writeFile(this.credentialsFile, encryptedData);
      
      // Set restrictive permissions
      if (process.platform !== 'win32') {
        await fs.chmod(this.credentialsFile, 0o600);
      }
      
      console.log('Credentials saved securely');
    } catch (error) {
      throw new Error(`Failed to save credentials: ${error.message}`);
    }
  }

  encrypt(data) {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }
    
    // Simple XOR encryption for compatibility
    const dataBuffer = Buffer.from(data, 'utf8');
    const result = Buffer.alloc(dataBuffer.length);
    
    for (let i = 0; i < dataBuffer.length; i++) {
      result[i] = dataBuffer[i] ^ this.masterKey[i % this.masterKey.length];
    }
    
    return result;
  }

  decrypt(encryptedData) {
    if (!this.masterKey) {
      throw new Error('Master key not initialized');
    }
    
    // Simple XOR decryption (same as encryption)
    const result = Buffer.alloc(encryptedData.length);
    
    for (let i = 0; i < encryptedData.length; i++) {
      result[i] = encryptedData[i] ^ this.masterKey[i % this.masterKey.length];
    }
    
    return result.toString('utf8');
  }

  async setCredentials(service, credentials) {
    try {
      // Validate service name
      if (!service || typeof service !== 'string') {
        throw new Error('Service name must be a non-empty string');
      }
      
      // Validate credentials structure
      this.validateCredentials(service, credentials);
      
      // Encrypt sensitive fields
      const encryptedCredentials = this.encryptSensitiveFields(service, credentials);
      
      // Store in cache
      this.cache.set(service, encryptedCredentials);
      
      // Save to disk
      await this.saveCredentials();
      
      console.log(`Credentials configured for service: ${service}`);
    } catch (error) {
      throw new Error(`Failed to set credentials for ${service}: ${error.message}`);
    }
  }

  async getCredentials(service) {
    try {
      if (!this.cache.has(service)) {
        throw new Error(`No credentials found for service: ${service}`);
      }
      
      const encryptedCredentials = this.cache.get(service);
      return this.decryptSensitiveFields(service, encryptedCredentials);
    } catch (error) {
      throw new Error(`Failed to get credentials for ${service}: ${error.message}`);
    }
  }

  validateCredentials(service, credentials) {
    const validationRules = {
      stripe: {
        required: ['api_key'],
        optional: ['webhook_secret', 'environment']
      },
      openai: {
        required: ['api_key'],
        optional: ['organization', 'model_preference']
      },
      github: {
        required: ['token'],
        optional: ['username', 'email']
      },
      aws: {
        required: ['access_key_id', 'secret_access_key'],
        optional: ['region', 'role_arn', 'session_token']
      },
      vercel: {
        required: ['token'],
        optional: ['team_id', 'project_id']
      },
      netlify: {
        required: ['token'],
        optional: ['site_id']
      },
      digitalocean: {
        required: ['token'],
        optional: ['spaces_key', 'spaces_secret']
      }
    };

    const rules = validationRules[service];
    if (!rules) {
      console.warn(`No validation rules defined for service: ${service}`);
      return;
    }

    // Check required fields
    for (const field of rules.required) {
      if (!credentials[field]) {
        throw new Error(`Missing required field '${field}' for ${service}`);
      }
    }

    // Check for unknown fields
    const allAllowedFields = [...rules.required, ...rules.optional];
    for (const field of Object.keys(credentials)) {
      if (!allAllowedFields.includes(field)) {
        console.warn(`Unknown field '${field}' for service ${service}`);
      }
    }
  }

  encryptSensitiveFields(service, credentials) {
    const sensitiveFields = {
      stripe: ['api_key', 'webhook_secret'],
      openai: ['api_key'],
      github: ['token'],
      aws: ['secret_access_key', 'session_token'],
      vercel: ['token'],
      netlify: ['token'],
      digitalocean: ['token', 'spaces_secret']
    };

    const sensitive = sensitiveFields[service] || [];
    const result = { ...credentials };

    for (const field of sensitive) {
      if (result[field]) {
        result[field] = this.encrypt(result[field]).toString('base64');
        result[`${field}_encrypted`] = true;
      }
    }

    return result;
  }

  decryptSensitiveFields(service, credentials) {
    const result = { ...credentials };

    for (const [field, value] of Object.entries(result)) {
      if (field.endsWith('_encrypted') && value === true) {
        const actualField = field.replace('_encrypted', '');
        if (result[actualField]) {
          try {
            const encryptedData = Buffer.from(result[actualField], 'base64');
            result[actualField] = this.decrypt(encryptedData);
          } catch (error) {
            console.warn(`Failed to decrypt field ${actualField} for ${service}`);
          }
        }
        delete result[field];
      }
    }

    return result;
  }

  async removeCredentials(service) {
    try {
      if (this.cache.has(service)) {
        this.cache.delete(service);
        await this.saveCredentials();
        console.log(`Credentials removed for service: ${service}`);
      } else {
        console.warn(`No credentials found for service: ${service}`);
      }
    } catch (error) {
      throw new Error(`Failed to remove credentials for ${service}: ${error.message}`);
    }
  }

  async listServices() {
    return Array.from(this.cache.keys()).sort();
  }

  async rotateCredentials(service, newCredentials) {
    try {
      // Backup existing credentials
      const oldCredentials = this.cache.get(service);
      const backupKey = `${service}_backup_${Date.now()}`;
      this.cache.set(backupKey, oldCredentials);
      
      // Set new credentials
      await this.setCredentials(service, newCredentials);
      
      console.log(`Credentials rotated for service: ${service}`);
      console.log(`Backup stored as: ${backupKey}`);
    } catch (error) {
      throw new Error(`Failed to rotate credentials for ${service}: ${error.message}`);
    }
  }

  async testConnection(service) {
    try {
      const credentials = await this.getCredentials(service);
      
      // Basic connectivity tests for each service
      switch (service) {
        case 'stripe':
          return this.testStripeConnection(credentials);
        case 'openai':
          return this.testOpenAIConnection(credentials);
        case 'github':
          return this.testGitHubConnection(credentials);
        default:
          throw new Error(`Connection test not implemented for service: ${service}`);
      }
    } catch (error) {
      throw new Error(`Connection test failed for ${service}: ${error.message}`);
    }
  }

  async testStripeConnection(credentials) {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.stripe.com',
        port: 443,
        path: '/v1/account',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.api_key}`
        }
      };

      const req = https.request(options, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => reject(false));
      req.setTimeout(5000, () => reject(false));
      req.end();
    });
  }

  async testOpenAIConnection(credentials) {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/models',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.api_key}`
        }
      };

      const req = https.request(options, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => reject(false));
      req.setTimeout(5000, () => reject(false));
      req.end();
    });
  }

  async testGitHubConnection(credentials) {
    const https = require('https');
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.github.com',
        port: 443,
        path: '/user',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${credentials.token}`,
          'User-Agent': 'MAK3R-HUB/1.0.0'
        }
      };

      const req = https.request(options, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on('error', () => reject(false));
      req.setTimeout(5000, () => reject(false));
      req.end();
    });
  }

  async exportCredentials(outputPath, services = null) {
    try {
      const servicesToExport = services || Array.from(this.cache.keys());
      const exportData = {
        exported_at: new Date().toISOString(),
        services: {}
      };

      for (const service of servicesToExport) {
        if (this.cache.has(service)) {
          const credentials = this.cache.get(service);
          // Remove encrypted flags and keep encrypted data for export
          exportData.services[service] = credentials;
        }
      }

      const encryptedExport = this.encrypt(JSON.stringify(exportData, null, 2));
      await fs.writeFile(outputPath, encryptedExport);
      
      console.log(`Credentials exported to: ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to export credentials: ${error.message}`);
    }
  }

  async importCredentials(importPath, overwrite = false) {
    try {
      const encryptedData = await fs.readFile(importPath);
      const decryptedData = this.decrypt(encryptedData);
      const importData = JSON.parse(decryptedData);

      let importedCount = 0;
      for (const [service, credentials] of Object.entries(importData.services)) {
        if (!overwrite && this.cache.has(service)) {
          console.warn(`Skipping ${service} - already exists (use --overwrite to replace)`);
          continue;
        }

        this.cache.set(service, credentials);
        importedCount++;
      }

      if (importedCount > 0) {
        await this.saveCredentials();
        console.log(`Imported credentials for ${importedCount} services`);
      }
    } catch (error) {
      throw new Error(`Failed to import credentials: ${error.message}`);
    }
  }

  async cleanup() {
    try {
      // Clear memory cache
      this.cache.clear();
      this.masterKey = null;
      
      // Remove backup credentials older than 30 days
      const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      for (const [key] of this.cache.entries()) {
        if (key.includes('_backup_')) {
          const timestampStr = key.split('_backup_')[1];
          const timestamp = parseInt(timestampStr, 10);
          
          if (timestamp < cutoffTime) {
            this.cache.delete(key);
          }
        }
      }
      
      await this.saveCredentials();
      console.log('Credential manager cleanup completed');
    } catch (error) {
      console.error(`Cleanup failed: ${error.message}`);
    }
  }
}

module.exports = CredentialManager;