/**
 * Simple Credentials Manager for MAK3R-HUB MCP
 * Manages API credentials for various services
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

class CredentialManager {
  constructor() {
    this.credentialsPath = path.join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.mak3r-hub',
      'credentials.json'
    );
    this.credentials = {};
  }

  async initialize() {
    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(this.credentialsPath));
      
      // Load existing credentials if they exist
      if (await fs.pathExists(this.credentialsPath)) {
        const data = await fs.readFile(this.credentialsPath, 'utf8');
        this.credentials = JSON.parse(data);
      } else {
        // Create empty credentials file
        await this.save();
      }
    } catch (error) {
      console.warn('Warning: Could not initialize credentials:', error.message);
      this.credentials = {};
    }
  }

  async save() {
    try {
      await fs.ensureDir(path.dirname(this.credentialsPath));
      await fs.writeFile(
        this.credentialsPath,
        JSON.stringify(this.credentials, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving credentials:', error.message);
    }
  }

  async setCredentials(service, credentials) {
    this.credentials[service] = credentials;
    await this.save();
  }

  async getCredentials(service) {
    return this.credentials[service] || null;
  }

  async deleteCredentials(service) {
    delete this.credentials[service];
    await this.save();
  }

  async listServices() {
    return Object.keys(this.credentials);
  }

  encrypt(text, password = 'mak3r-hub-default') {
    const cipher = crypto.createCipher('aes-256-cbc', password);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  decrypt(encrypted, password = 'mak3r-hub-default') {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', password);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      return null;
    }
  }
}

module.exports = CredentialManager;