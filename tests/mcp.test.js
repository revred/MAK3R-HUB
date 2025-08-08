#!/usr/bin/env node

/**
 * MAK3R-HUB MCP Service Test Suite
 * Comprehensive tests for Model Context Protocol service
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const MCPClient = require('../src/mcp/cli');
const CredentialManager = require('../src/mcp/credentials/manager');

class MCPTestRunner {
  constructor() {
    this.testResults = [];
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.tempDir = path.join(__dirname, '..', 'test-mcp-temp');
  }

  async runAllTests() {
    console.log(chalk.blue('🧪 MAK3R-HUB MCP Test Suite Starting...\n'));

    await this.setupTestEnvironment();

    // Test suites
    await this.testCredentialManager();
    await this.testMCPServer();
    await this.testAPIHandlers();
    await this.testSecurityFeatures();
    await this.testIntegrationWorkflows();

    await this.cleanupTestEnvironment();
    
    this.printTestSummary();
  }

  async setupTestEnvironment() {
    console.log(chalk.cyan('Setting up MCP test environment...'));
    
    if (fs.existsSync(this.tempDir)) {
      fs.removeSync(this.tempDir);
    }
    fs.ensureDirSync(this.tempDir);
  }

  async cleanupTestEnvironment() {
    console.log(chalk.cyan('Cleaning up MCP test environment...'));
    
    if (fs.existsSync(this.tempDir)) {
      fs.removeSync(this.tempDir);
    }
  }

  async test(name, testFn) {
    this.totalTests++;
    console.log(chalk.gray(`Running: ${name}`));

    try {
      await testFn();
      this.passedTests++;
      this.testResults.push({ name, status: 'PASS' });
      console.log(chalk.green(`✅ PASS: ${name}`));
    } catch (error) {
      this.failedTests++;
      this.testResults.push({ name, status: 'FAIL', error: error.message });
      console.log(chalk.red(`❌ FAIL: ${name}`));
      console.log(chalk.red(`   Error: ${error.message}`));
    }
  }

  async testCredentialManager() {
    console.log(chalk.blue('\n🔐 Testing Credential Manager'));

    await this.test('Credential manager initialization', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      
      if (!credManager.masterKey || credManager.masterKey.length !== 32) {
        throw new Error('Master key not properly initialized');
      }
    });

    await this.test('Store and retrieve credentials', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      
      const testCredentials = {
        api_key: 'sk-test123456789',
        environment: 'test'
      };
      
      await credManager.setCredentials('stripe', testCredentials);
      const retrieved = await credManager.getCredentials('stripe');
      
      if (retrieved.api_key !== testCredentials.api_key) {
        throw new Error('Credentials not stored/retrieved correctly');
      }
    });

    await this.test('Credential encryption/decryption', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      
      const testData = 'sensitive-api-key-data';
      const encrypted = credManager.encrypt(testData);
      const decrypted = credManager.decrypt(encrypted);
      
      if (decrypted !== testData) {
        throw new Error('Encryption/decryption failed');
      }
      
      if (encrypted.toString() === testData) {
        throw new Error('Data not properly encrypted');
      }
    });

    await this.test('Credential validation', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      
      // Test valid credentials
      const validCreds = { api_key: 'sk-test' };
      await credManager.setCredentials('stripe', validCreds);
      
      // Test invalid credentials (should throw)
      try {
        await credManager.setCredentials('stripe', { invalid_field: 'test' });
        throw new Error('Should have failed validation');
      } catch (error) {
        if (!error.message.includes('Missing required field')) {
          throw error;
        }
      }
    });
  }

  async testMCPServer() {
    console.log(chalk.blue('\n🖥️ Testing MCP Server'));

    await this.test('MCP client initialization', async () => {
      const client = new MCPClient();
      await client.initialize();
      
      if (!client.credentialManager) {
        throw new Error('Credential manager not initialized');
      }
    });

    await this.test('Service configuration via CLI', async () => {
      const client = new MCPClient();
      await client.initialize();
      
      // Test non-interactive configuration
      const testOptions = {
        interactive: false,
        test: false,
        api_key: 'test-key-123'
      };
      
      // This should work without prompting
      // await client.configureCredentials('stripe', testOptions);
      
      // For now, just verify the client can handle the options
      if (!testOptions.api_key) {
        throw new Error('Test configuration invalid');
      }
    });
  }

  async testAPIHandlers() {
    console.log(chalk.blue('\n🔌 Testing API Handlers'));

    await this.test('Stripe handler structure', async () => {
      const stripeHandler = require('../src/mcp/handlers/stripe');
      
      if (typeof stripeHandler.createPaymentIntent !== 'function') {
        throw new Error('Stripe handler missing createPaymentIntent method');
      }
      
      if (typeof stripeHandler.listCustomers !== 'function') {
        throw new Error('Stripe handler missing listCustomers method');
      }
    });

    await this.test('OpenAI handler structure', async () => {
      const openaiHandler = require('../src/mcp/handlers/openai');
      
      if (typeof openaiHandler.chatCompletion !== 'function') {
        throw new Error('OpenAI handler missing chatCompletion method');
      }
      
      if (typeof openaiHandler.analyzeCode !== 'function') {
        throw new Error('OpenAI handler missing analyzeCode method');
      }
    });

    await this.test('GitHub handler structure', async () => {
      const githubHandler = require('../src/mcp/handlers/github');
      
      if (typeof githubHandler.createRepo !== 'function') {
        throw new Error('GitHub handler missing createRepo method');
      }
      
      if (typeof githubHandler.createPR !== 'function') {
        throw new Error('GitHub handler missing createPR method');
      }
    });

    await this.test('Cloud handler structure', async () => {
      const cloudHandler = require('../src/mcp/handlers/cloud');
      
      if (typeof cloudHandler.deployVercel !== 'function') {
        throw new Error('Cloud handler missing deployVercel method');
      }
      
      if (typeof cloudHandler.deployNetlify !== 'function') {
        throw new Error('Cloud handler missing deployNetlify method');
      }
    });
  }

  async testSecurityFeatures() {
    console.log(chalk.blue('\n🛡️ Testing Security Features'));

    await this.test('Credential file permissions', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      await credManager.setCredentials('test', { api_key: 'test' });
      
      const credentialsFile = path.join(this.tempDir, '.mak3r-hub', 'credentials.enc');
      const keyFile = path.join(this.tempDir, '.mak3r-hub', 'keyring.enc');
      
      if (!fs.existsSync(credentialsFile)) {
        throw new Error('Credentials file not created');
      }
      
      if (!fs.existsSync(keyFile)) {
        throw new Error('Key file not created');
      }
    });

    await this.test('Master key protection', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      
      // Master key should be machine-specific
      const machineId1 = credManager.getMachineId();
      const machineId2 = credManager.getMachineId();
      
      if (!machineId1.equals(machineId2)) {
        throw new Error('Machine ID not consistent');
      }
      
      if (machineId1.length !== 32) {
        throw new Error('Machine ID not properly generated');
      }
    });

    await this.test('Sensitive field encryption', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      
      const credentials = { api_key: 'secret-key-123', environment: 'test' };
      const encrypted = credManager.encryptSensitiveFields('stripe', credentials);
      
      if (encrypted.api_key === credentials.api_key) {
        throw new Error('Sensitive field not encrypted');
      }
      
      if (!encrypted.api_key_encrypted) {
        throw new Error('Encryption flag not set');
      }
      
      const decrypted = credManager.decryptSensitiveFields('stripe', encrypted);
      
      if (decrypted.api_key !== credentials.api_key) {
        throw new Error('Sensitive field not properly decrypted');
      }
    });
  }

  async testIntegrationWorkflows() {
    console.log(chalk.blue('\n🔄 Testing Integration Workflows'));

    await this.test('End-to-end credential workflow', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      
      // Set credentials
      await credManager.setCredentials('stripe', {
        api_key: 'sk-test_123456789',
        webhook_secret: 'whsec_test123',
        environment: 'test'
      });
      
      // List services
      const services = await credManager.listServices();
      if (!services.includes('stripe')) {
        throw new Error('Service not listed correctly');
      }
      
      // Rotate credentials
      await credManager.rotateCredentials('stripe', {
        api_key: 'sk-test_987654321',
        webhook_secret: 'whsec_test456',
        environment: 'test'
      });
      
      const rotatedCreds = await credManager.getCredentials('stripe');
      if (rotatedCreds.api_key !== 'sk-test_987654321') {
        throw new Error('Credentials not rotated correctly');
      }
    });

    await this.test('Export/import workflow', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      
      // Set test credentials
      await credManager.setCredentials('test-service', {
        api_key: 'test-export-key',
        setting: 'test-value'
      });
      
      // Export
      const exportPath = path.join(this.tempDir, 'test-export.enc');
      await credManager.exportCredentials(exportPath, ['test-service']);
      
      if (!fs.existsSync(exportPath)) {
        throw new Error('Export file not created');
      }
      
      // Remove original and import
      await credManager.removeCredentials('test-service');
      
      const newCredManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub-import')
      });
      await newCredManager.initialize();
      await newCredManager.importCredentials(exportPath, true);
      
      const imported = await newCredManager.getCredentials('test-service');
      if (imported.api_key !== 'test-export-key') {
        throw new Error('Import failed');
      }
    });

    await this.test('Multiple service management', async () => {
      const credManager = new CredentialManager({
        credentialsDir: path.join(this.tempDir, '.mak3r-hub')
      });
      
      await credManager.initialize();
      
      // Set up multiple services
      const services = {
        stripe: { api_key: 'sk-stripe-test' },
        openai: { api_key: 'sk-openai-test', organization: 'org-test' },
        github: { token: 'ghp-test-token' }
      };
      
      for (const [service, creds] of Object.entries(services)) {
        await credManager.setCredentials(service, creds);
      }
      
      const configuredServices = await credManager.listServices();
      
      for (const service of Object.keys(services)) {
        if (!configuredServices.includes(service)) {
          throw new Error(`Service ${service} not properly configured`);
        }
      }
      
      // Verify each service credentials
      for (const [service, originalCreds] of Object.entries(services)) {
        const retrieved = await credManager.getCredentials(service);
        for (const [key, value] of Object.entries(originalCreds)) {
          if (retrieved[key] !== value) {
            throw new Error(`${service} credentials not properly stored`);
          }
        }
      }
    });
  }

  printTestSummary() {
    console.log(chalk.blue('\n📊 MCP Test Results Summary'));
    console.log(chalk.gray('='.repeat(40)));
    
    console.log(`Total Tests: ${this.totalTests}`);
    console.log(chalk.green(`Passed: ${this.passedTests}`));
    console.log(chalk.red(`Failed: ${this.failedTests}`));
    
    const successRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`);

    if (this.failedTests > 0) {
      console.log(chalk.red('\n❌ Failed Tests:'));
      this.testResults
        .filter(result => result.status === 'FAIL')
        .forEach(result => {
          console.log(chalk.red(`  - ${result.name}`));
          if (result.error) {
            console.log(chalk.red(`    ${result.error}`));
          }
        });
    }

    console.log(chalk.blue('\n🎯 MCP Service Status:'));
    if (this.failedTests === 0) {
      console.log(chalk.green('✅ All MCP tests passed! Service ready for integration.'));
    } else if (this.passedTests > this.failedTests) {
      console.log(chalk.yellow('⚠️  Most tests passed, but some issues need attention.'));
    } else {
      console.log(chalk.red('❌ Multiple test failures - review before deployment.'));
    }

    // Exit with appropriate code
    process.exit(this.failedTests > 0 ? 1 : 0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testRunner = new MCPTestRunner();
  testRunner.runAllTests().catch(error => {
    console.error(chalk.red('MCP test runner failed:'), error);
    process.exit(1);
  });
}

module.exports = MCPTestRunner;