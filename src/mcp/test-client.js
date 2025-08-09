#!/usr/bin/env node

/**
 * MCP Test Client
 * Tests the MAK3R-HUB MCP server functionality
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { spawn } = require('child_process');
const path = require('path');

async function testMCPServer() {
  console.log('🧪 Starting MCP Server Test...\n');

  try {
    // Spawn the MCP server process
    const serverPath = path.join(__dirname, 'server-fixed.js');
    const serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Create stdio transport
    const transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath]
    });

    // Create MCP client
    const client = new Client(
      {
        name: 'mak3r-hub-test-client',
        version: '1.0.0'
      },
      {
        capabilities: {}
      }
    );

    // Connect to server
    await client.connect(transport);
    console.log('✅ Connected to MCP server\n');

    // Test 1: List tools
    console.log('📋 Test 1: Listing available tools...');
    const toolsResponse = await client.request({
      method: 'tools/list'
    });
    console.log(`Found ${toolsResponse.tools.length} tools\n`);

    // Test 2: System info
    console.log('🖥️ Test 2: Getting system info...');
    const systemInfo = await client.request({
      method: 'tools/call',
      params: {
        name: 'm3r__system__get_info',
        arguments: {}
      }
    });
    console.log('System info retrieved successfully\n');

    // Test 3: Safe commands
    console.log('🛡️ Test 3: Getting safe commands...');
    const safeCommands = await client.request({
      method: 'tools/call',
      params: {
        name: 'm3r__system__get_safe_commands',
        arguments: {}
      }
    });
    console.log('Safe commands retrieved successfully\n');

    // Test 4: SharpUtil check
    console.log('🔧 Test 4: Checking SharpUtility executable...');
    const sharpUtilCheck = await client.request({
      method: 'tools/call',
      params: {
        name: 'm3r__sharputil__check_executable',
        arguments: {}
      }
    });
    console.log('SharpUtil check completed\n');

    // Close connection
    await client.close();
    serverProcess.kill();

    console.log('✅ All tests passed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
}

// Simple test without full client (for quick validation)
async function quickTest() {
  console.log('🚀 Quick MCP Server Test\n');
  
  const MAK3RMCPServer = require('./server-fixed');
  const server = new MAK3RMCPServer();
  
  // Test tool list generation
  console.log('Testing tool list generation...');
  const handlers = server.server._requestHandlers;
  console.log(`Registered handlers: ${handlers.size}`);
  
  // Test system info handler
  console.log('\nTesting system info handler...');
  const systemDiagnostics = require('./handlers/system-diagnostics');
  const systemInfo = await systemDiagnostics.getSystemInfo();
  console.log('System info:', systemInfo ? '✅ Available' : '❌ Failed');
  
  // Test safe commands
  console.log('\nTesting safe commands handler...');
  const safeCommands = await systemDiagnostics.getSafeCommands();
  console.log('Safe commands:', safeCommands ? '✅ Available' : '❌ Failed');
  
  // Test SharpUtil
  console.log('\nTesting SharpUtil handler...');
  const sharpUtilService = require('./handlers/sharputil-mcp-service');
  const sharpUtilStatus = await sharpUtilService.checkExecutable();
  console.log('SharpUtil status:', sharpUtilStatus ? '✅ Available' : '❌ Failed');
  
  console.log('\n✅ Quick test completed!');
}

// Run the appropriate test
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === '--quick') {
    quickTest().catch(console.error);
  } else {
    testMCPServer().then(success => {
      process.exit(success ? 0 : 1);
    });
  }
}

module.exports = { testMCPServer, quickTest };