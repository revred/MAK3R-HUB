/**
 * Credential Manager
 * Secure credential storage with AES-256 encryption
 */

const fs = require('fs-extra');
const crypto = require('crypto');
const path = require('path');

class CredentialManager {
  constructor(config) {
    this.config = config;
    this.credentials = new Map();
    this.credentialsPath = config.get('security.credentialsPath');
    this.encryptionKey = config.get('security.encryptionKey') || this.generateEncryptionKey();
  }

  generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
  }

  encrypt(text) {
    if (!text) return text;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(text) {
    if (!text || !text.includes(':')) return text;
    
    const [ivHex, encrypted] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async loadCredentials() {
    try {
      if (await fs.pathExists(this.credentialsPath)) {
        const encrypted = await fs.readJson(this.credentialsPath);
        
        for (const [service, data] of Object.entries(encrypted)) {
          const decryptedData = {};
          for (const [key, value] of Object.entries(data)) {
            decryptedData[key] = this.decrypt(value);
          }
          this.credentials.set(service, decryptedData);
        }
      }
    } catch (error) {
      console.warn('Failed to load credentials:', error.message);
    }
  }

  async saveCredentials() {
    try {
      await fs.ensureDir(path.dirname(this.credentialsPath));
      
      const encrypted = {};
      for (const [service, data] of this.credentials.entries()) {
        encrypted[service] = {};
        for (const [key, value] of Object.entries(data)) {
          encrypted[service][key] = this.encrypt(value);
        }
      }
      
      await fs.writeJson(this.credentialsPath, encrypted, { spaces: 2 });
    } catch (error) {
      console.error('Failed to save credentials:', error.message);
      throw error;
    }
  }

  setCredentials(service, credentials) {
    this.credentials.set(service, credentials);
    return this.saveCredentials();
  }

  getCredentials(service) {
    return this.credentials.get(service);
  }

  hasCredentials(service) {
    return this.credentials.has(service) && 
           Object.keys(this.credentials.get(service)).length > 0;
  }

  removeCredentials(service) {
    this.credentials.delete(service);
    return this.saveCredentials();
  }

  listServices() {
    return Array.from(this.credentials.keys());
  }

  async storeGitCredentials(username, token, service = 'github') {
    const gitCredentials = {
      username,
      token,
      service,
      storedAt: new Date().toISOString()
    };

    await this.setCredentials(`git_${service}`, gitCredentials);
    
    return {
      success: true,
      message: `Git credentials for ${service} stored securely`
    };
  }

  async getGitCredentials(service = 'github') {
    const credentials = this.getCredentials(`git_${service}`);
    
    if (!credentials) {
      return {
        success: false,
        message: `No Git credentials found for ${service}`,
        credentials: null
      };
    }

    return {
      success: true,
      credentials: {
        username: credentials.username,
        service: credentials.service,
        hasToken: !!credentials.token,
        storedAt: credentials.storedAt
      }
    };
  }

  validateCredentials(service, requiredFields = []) {
    const credentials = this.getCredentials(service);
    
    if (!credentials) {
      return {
        valid: false,
        errors: [`No credentials found for ${service}`]
      };
    }

    const errors = [];
    for (const field of requiredFields) {
      if (!credentials[field]) {
        errors.push(`Missing ${field} for ${service}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getCredentialsSummary() {
    const summary = {};
    
    for (const [service, credentials] of this.credentials.entries()) {
      summary[service] = {
        hasCredentials: true,
        fieldCount: Object.keys(credentials).length,
        fields: Object.keys(credentials).map(key => ({
          name: key,
          hasValue: !!credentials[key],
          encrypted: key.includes('token') || key.includes('key') || key.includes('secret')
        }))
      };
    }

    return summary;
  }

  async cleanup() {
    // Remove old or invalid credentials
    const toRemove = [];
    
    for (const [service, credentials] of this.credentials.entries()) {
      if (!credentials || Object.keys(credentials).length === 0) {
        toRemove.push(service);
      }
    }

    for (const service of toRemove) {
      this.credentials.delete(service);
    }

    if (toRemove.length > 0) {
      await this.saveCredentials();
    }

    return {
      removed: toRemove,
      remaining: this.listServices()
    };
  }
}

module.exports = CredentialManager;