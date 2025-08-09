#!/usr/bin/env node

/**
 * Test script for the new hub architecture
 */

const MAK3RHub = require('./src/core/hub')
const path = require('path')

async function testHubArchitecture() {
  console.log('🧪 Testing MAK3R-HUB Extension Architecture\n')
  
  try {
    // 1. Create hub instance
    console.log('1. Creating hub instance...')
    const hub = new MAK3RHub({
      name: 'test-hub',
      version: '2.0.0-test',
      extensionsPath: path.join(__dirname, 'src', 'extensions')
    })
    
    // 2. Start hub (discovers and loads extensions)
    console.log('\n2. Starting hub and loading extensions...')
    const startResult = await hub.start()
    console.log('Start result:', startResult)
    
    // 3. Check registry status
    console.log('\n3. Checking extension registry...')
    const stats = hub.getStats()
    console.log('Hub stats:', JSON.stringify(stats, null, 2))
    
    // 4. Test tool execution
    console.log('\n4. Testing tool execution...')
    
    // Test system info
    try {
      const systemInfo = await hub.registry.executeTool('m3r__system__get_info')
      console.log('✅ System info tool works:', Object.keys(systemInfo))
    } catch (error) {
      console.error('❌ System info failed:', error.message)
    }
    
    // Test safe commands
    try {
      const safeCommands = await hub.registry.executeTool('m3r__system__get_safe_commands')
      console.log('✅ Safe commands tool works:', safeCommands.platform)
    } catch (error) {
      console.error('❌ Safe commands failed:', error.message)
    }
    
    // Test service check
    try {
      const serviceCheck = await hub.registry.executeTool('m3r__system__check_service', {
        serviceName: 'node'
      })
      console.log('✅ Service check tool works:', serviceCheck.status)
    } catch (error) {
      console.error('❌ Service check failed:', error.message)
    }
    
    // 5. Test health check
    console.log('\n5. Checking hub health...')
    const health = await hub.getHealth()
    console.log('Health status:', health.status)
    console.log('Extensions:', health.extensions)
    console.log('Tools:', health.tools)
    
    // 6. Test MCP tool list
    console.log('\n6. Testing MCP tool registration...')
    const mcpTools = hub.registry.getAllMCPTools()
    console.log(`Found ${mcpTools.length} MCP tools:`)
    mcpTools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`)
    })
    
    // 7. Architecture validation
    console.log('\n7. Architecture validation...')
    
    // Check core size (should be minimal)
    const fs = require('fs')
    const hubCoreSize = fs.statSync('./src/core/hub.js').size
    const registrySize = fs.statSync('./src/core/extension-registry.js').size
    const totalCoreSize = hubCoreSize + registrySize
    
    console.log(`Core file sizes:`)
    console.log(`  - hub.js: ${hubCoreSize} bytes`)
    console.log(`  - extension-registry.js: ${registrySize} bytes`)
    console.log(`  - Total core: ${totalCoreSize} bytes (${Math.round(totalCoreSize/1024)}KB)`)
    
    if (totalCoreSize < 50000) { // 50KB
      console.log('✅ Core is lightweight (< 50KB)')
    } else {
      console.log('⚠️ Core might be getting heavy (> 50KB)')
    }
    
    // Check extension isolation
    const extensions = Array.from(hub.registry.extensions.keys())
    console.log(`\nLoaded extensions: ${extensions.join(', ')}`)
    
    // 8. Stop hub
    console.log('\n8. Stopping hub...')
    await hub.stop()
    
    console.log('\n✅ Hub architecture test completed successfully!')
    console.log('\n📊 Summary:')
    console.log(`  - Extensions loaded: ${extensions.length}`)
    console.log(`  - Tools registered: ${mcpTools.length}`)
    console.log(`  - Core size: ${Math.round(totalCoreSize/1024)}KB`)
    console.log(`  - Startup time: ${startResult.startupTime}ms`)
    
    return { success: true, extensions: extensions.length, tools: mcpTools.length }
    
  } catch (error) {
    console.error('\n❌ Hub architecture test failed:', error)
    console.error(error.stack)
    return { success: false, error: error.message }
  }
}

// Architecture compliance checks
function validateArchitecture() {
  console.log('\n🏗️ Validating architecture compliance...')
  
  const rules = [
    {
      name: 'Core hub size limit',
      check: () => {
        const fs = require('fs')
        const hubSize = fs.statSync('./src/core/hub.js').size
        return hubSize < 20000 // 20KB limit for hub.js
      },
      message: 'Hub core should be < 20KB'
    },
    {
      name: 'Extension isolation',
      check: () => {
        const fs = require('fs')
        const hubContent = fs.readFileSync('./src/core/hub.js', 'utf8')
        // Check that hub doesn't import business logic
        return !hubContent.includes('require(') || 
               !hubContent.includes('../handlers/') &&
               !hubContent.includes('system-diagnostics') &&
               !hubContent.includes('sharputil')
      },
      message: 'Hub should not import business logic modules'
    },
    {
      name: 'Extension structure',
      check: () => {
        const path = require('path')
        const fs = require('fs')
        const systemExtPath = './src/extensions/system/extension.js'
        return fs.existsSync(systemExtPath)
      },
      message: 'Extensions should follow standard structure'
    }
  ]
  
  let passed = 0
  for (const rule of rules) {
    try {
      if (rule.check()) {
        console.log(`✅ ${rule.name}`)
        passed++
      } else {
        console.log(`❌ ${rule.name}: ${rule.message}`)
      }
    } catch (error) {
      console.log(`⚠️ ${rule.name}: Could not validate - ${error.message}`)
    }
  }
  
  console.log(`\nArchitecture validation: ${passed}/${rules.length} rules passed`)
  return passed === rules.length
}

// Run tests
if (require.main === module) {
  testHubArchitecture().then(result => {
    const architectureValid = validateArchitecture()
    
    if (result.success && architectureValid) {
      console.log('\n🎉 All tests passed! Architecture is compliant.')
      process.exit(0)
    } else {
      console.log('\n💥 Some tests failed.')
      process.exit(1)
    }
  }).catch(error => {
    console.error('Test execution failed:', error)
    process.exit(1)
  })
}

module.exports = { testHubArchitecture, validateArchitecture }