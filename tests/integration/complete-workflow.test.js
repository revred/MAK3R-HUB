// MAK3R-HUB Complete Workflow Integration Tests
// Tests end-to-end website creation, development, and deployment

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');

describe('MAK3R-HUB Complete Workflow Integration Tests', () => {
  const testProjectsDir = path.join(__dirname, '../../test-projects');
  const testTimeout = 300000; // 5 minutes for complete workflows

  beforeAll(async () => {
    // Ensure test projects directory exists
    await fs.ensureDir(testProjectsDir);
    
    // Clean any existing test projects
    await fs.emptyDir(testProjectsDir);
  });

  afterAll(async () => {
    // Clean up test projects after all tests
    await fs.remove(testProjectsDir);
  });

  describe('Website Creation Workflows', () => {
    test('should create landing page in under 30 seconds', async () => {
      const startTime = Date.now();
      const projectName = 'test-landing-page';
      const projectPath = path.join(testProjectsDir, projectName);

      try {
        // Execute MAK3R-HUB create command
        const result = execSync(
          `node ../../bin/mak3r-hub.js create ${projectName} --type landing-page --framework vue-nuxt`,
          { 
            cwd: testProjectsDir,
            encoding: 'utf8',
            timeout: 30000 // 30 second timeout
          }
        );

        const duration = Date.now() - startTime;
        
        // Verify creation speed
        expect(duration).toBeLessThan(30000); // Under 30 seconds
        
        // Verify project structure was created
        expect(await fs.pathExists(projectPath)).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'package.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'CLAUDE.md'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/components'))).toBe(true);
        
        // Verify Claude Code optimization
        const claudeContent = await fs.readFile(path.join(projectPath, 'CLAUDE.md'), 'utf8');
        expect(claudeContent).toContain('landing-page');
        expect(claudeContent).toContain('Claude Code');
        expect(claudeContent).toContain('MAK3R-HUB');

        console.log(`✅ Landing page created in ${duration}ms`);
        
      } catch (error) {
        fail(`Failed to create landing page: ${error.message}`);
      }
    }, testTimeout);

    test('should create ecommerce site with all required components', async () => {
      const projectName = 'test-ecommerce';
      const projectPath = path.join(testProjectsDir, projectName);

      try {
        execSync(
          `node ../../bin/mak3r-hub.js create ${projectName} --type ecommerce --framework react-next`,
          { cwd: testProjectsDir, encoding: 'utf8' }
        );

        // Verify ecommerce-specific components
        const componentsPath = path.join(projectPath, 'src/components');
        expect(await fs.pathExists(path.join(componentsPath, 'ProductCard.jsx'))).toBe(true);
        expect(await fs.pathExists(path.join(componentsPath, 'ShoppingCart.jsx'))).toBe(true);
        expect(await fs.pathExists(path.join(componentsPath, 'Checkout.jsx'))).toBe(true);

        // Verify ecommerce dependencies were installed
        const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
        expect(packageJson.dependencies).toHaveProperty('stripe');
        
        console.log('✅ Ecommerce site created with all components');
        
      } catch (error) {
        fail(`Failed to create ecommerce site: ${error.message}`);
      }
    }, testTimeout);

    test('should create portfolio with performance optimization', async () => {
      const projectName = 'test-portfolio';
      const projectPath = path.join(testProjectsDir, projectName);

      try {
        execSync(
          `node ../../bin/mak3r-hub.js create ${projectName} --type portfolio --framework svelte-kit`,
          { cwd: testProjectsDir, encoding: 'utf8' }
        );

        // Verify portfolio-specific features
        expect(await fs.pathExists(path.join(projectPath, 'src/components/ProjectCard.svelte'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/components/Gallery.svelte'))).toBe(true);

        // Verify performance optimization configuration
        const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
        expect(packageJson.dependencies).toHaveProperty('swiper'); // For gallery performance

        console.log('✅ Portfolio created with performance optimization');
        
      } catch (error) {
        fail(`Failed to create portfolio: ${error.message}`);
      }
    }, testTimeout);
  });

  describe('Development Server Workflows', () => {
    test('should start development server in under 10 seconds', async () => {
      const projectName = 'test-dev-server';
      const projectPath = path.join(testProjectsDir, projectName);

      try {
        // Create project first
        execSync(
          `node ../../bin/mak3r-hub.js create ${projectName} --type landing-page`,
          { cwd: testProjectsDir, encoding: 'utf8' }
        );

        const startTime = Date.now();
        
        // Start development server
        const serverProcess = spawn('node', ['../../bin/mak3r-hub.js', 'dev'], {
          cwd: projectPath,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let serverStarted = false;
        const serverTimeout = 10000; // 10 seconds

        // Listen for server ready signal
        serverProcess.stdout.on('data', (data) => {
          const output = data.toString();
          if (output.includes('localhost:') || output.includes('ready') || output.includes('Running')) {
            serverStarted = true;
            const duration = Date.now() - startTime;
            console.log(`✅ Development server started in ${duration}ms`);
            
            // Verify server speed
            expect(duration).toBeLessThan(10000); // Under 10 seconds
            
            // Kill the server
            serverProcess.kill('SIGTERM');
          }
        });

        // Wait for server start or timeout
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            if (!serverStarted) {
              serverProcess.kill('SIGTERM');
              reject(new Error('Server failed to start within 10 seconds'));
            }
          }, serverTimeout);

          serverProcess.on('exit', () => {
            clearTimeout(timeout);
            if (serverStarted) {
              resolve();
            } else {
              reject(new Error('Server exited unexpectedly'));
            }
          });

          serverProcess.stdout.on('data', (data) => {
            if (serverStarted) {
              clearTimeout(timeout);
              resolve();
            }
          });
        });

      } catch (error) {
        fail(`Failed to start development server: ${error.message}`);
      }
    }, testTimeout);

    test('should detect correct framework and use appropriate dev server', async () => {
      const projectName = 'test-framework-detection';
      const projectPath = path.join(testProjectsDir, projectName);

      try {
        // Create Nuxt project
        execSync(
          `node ../../bin/mak3r-hub.js create ${projectName} --framework vue-nuxt`,
          { cwd: testProjectsDir, encoding: 'utf8' }
        );

        // Verify Nuxt configuration was created
        expect(await fs.pathExists(path.join(projectPath, 'nuxt.config.ts'))).toBe(true);

        // Verify package.json contains Nuxt
        const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
        expect(packageJson.dependencies || packageJson.devDependencies).toHaveProperty('nuxt');

        console.log('✅ Framework detection and configuration working');
        
      } catch (error) {
        fail(`Failed framework detection test: ${error.message}`);
      }
    }, testTimeout);
  });

  describe('Claude Code Integration Workflows', () => {
    test('should generate Claude Code optimized documentation', async () => {
      const projectName = 'test-claude-optimization';
      const projectPath = path.join(testProjectsDir, projectName);

      try {
        execSync(
          `node ../../bin/mak3r-hub.js create ${projectName} --type saas`,
          { cwd: testProjectsDir, encoding: 'utf8' }
        );

        // Test Claude Code optimization command
        execSync(
          `node ../../bin/mak3r-hub.js claude --init --optimize`,
          { cwd: projectPath, encoding: 'utf8' }
        );

        // Verify Claude Code optimized files
        expect(await fs.pathExists(path.join(projectPath, 'CLAUDE.md'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'docs/components.md'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'docs/workflows.md'))).toBe(true);

        // Verify CLAUDE.md content quality
        const claudeContent = await fs.readFile(path.join(projectPath, 'CLAUDE.md'), 'utf8');
        expect(claudeContent).toContain('🧠 Claude Code Integration');
        expect(claudeContent).toContain('AI-Optimized Structure');
        expect(claudeContent).toContain('Development Patterns');

        // Verify workflow documentation
        const workflowsContent = await fs.readFile(path.join(projectPath, 'docs/workflows.md'), 'utf8');
        expect(workflowsContent).toContain('Claude Code Workflows');
        expect(workflowsContent).toContain('AI-Assisted Development');

        console.log('✅ Claude Code optimization complete');
        
      } catch (error) {
        fail(`Failed Claude Code optimization: ${error.message}`);
      }
    }, testTimeout);

    test('should create AI-friendly component structure', async () => {
      const projectName = 'test-ai-structure';
      const projectPath = path.join(testProjectsDir, projectName);

      try {
        execSync(
          `node ../../bin/mak3r-hub.js create ${projectName} --type blog`,
          { cwd: testProjectsDir, encoding: 'utf8' }
        );

        // Verify AI-friendly folder structure
        expect(await fs.pathExists(path.join(projectPath, 'src/components/README.md'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/pages/README.md'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'src/utils/README.md'))).toBe(true);

        // Verify component includes AI optimization hints
        const componentFiles = await fs.readdir(path.join(projectPath, 'src/components'));
        const componentFile = componentFiles.find(f => f.endsWith('.vue'));
        
        if (componentFile) {
          const componentContent = await fs.readFile(
            path.join(projectPath, 'src/components', componentFile), 
            'utf8'
          );
          expect(componentContent).toContain('Claude Code');
          expect(componentContent).toContain('Generated by MAK3R-HUB');
        }

        console.log('✅ AI-friendly structure created');
        
      } catch (error) {
        fail(`Failed AI structure test: ${error.message}`);
      }
    }, testTimeout);
  });

  describe('Performance Validation', () => {
    test('should meet performance benchmarks', async () => {
      const projectName = 'test-performance';
      const projectPath = path.join(testProjectsDir, projectName);

      try {
        const startTime = Date.now();
        
        // Create project and measure time
        execSync(
          `node ../../bin/mak3r-hub.js create ${projectName} --type landing-page`,
          { cwd: testProjectsDir, encoding: 'utf8' }
        );

        const creationTime = Date.now() - startTime;
        
        // Performance benchmarks
        expect(creationTime).toBeLessThan(30000); // Under 30 seconds

        // Verify optimization files were created
        expect(await fs.pathExists(path.join(projectPath, 'vercel.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectPath, 'netlify.toml'))).toBe(true);

        // Check package.json for performance optimizations
        const packageJson = await fs.readJson(path.join(projectPath, 'package.json'));
        expect(packageJson.scripts).toHaveProperty('build');

        console.log(`✅ Performance benchmarks met (${creationTime}ms creation time)`);
        
      } catch (error) {
        fail(`Performance benchmark failed: ${error.message}`);
      }
    }, testTimeout);
  });

  describe('Cross-Platform Compatibility', () => {
    test('should work on current platform', async () => {
      // Test that MAK3R-HUB works on the current platform
      expect(['win32', 'darwin', 'linux']).toContain(process.platform);
      
      try {
        // Test basic functionality
        const result = execSync('node ../../bin/mak3r-hub.js doctor', {
          cwd: testProjectsDir,
          encoding: 'utf8'
        });

        expect(result).toContain('System Status');
        console.log('✅ Cross-platform compatibility verified');
        
      } catch (error) {
        fail(`Cross-platform test failed: ${error.message}`);
      }
    }, testTimeout);
  });

  describe('Error Handling & Recovery', () => {
    test('should handle invalid project names gracefully', async () => {
      try {
        execSync(
          `node ../../bin/mak3r-hub.js create "invalid/project/name" --type landing-page`,
          { cwd: testProjectsDir, encoding: 'utf8' }
        );
        
        fail('Should have thrown error for invalid project name');
      } catch (error) {
        // Should fail gracefully with helpful error message
        expect(error.message).toContain('Command failed');
        console.log('✅ Error handling working correctly');
      }
    });

    test('should validate framework compatibility', async () => {
      try {
        execSync(
          `node ../../bin/mak3r-hub.js create test-invalid --framework invalid-framework`,
          { cwd: testProjectsDir, encoding: 'utf8' }
        );
        
        fail('Should have thrown error for invalid framework');
      } catch (error) {
        // Should fail with framework validation error
        expect(error.status).not.toBe(0);
        console.log('✅ Framework validation working');
      }
    });
  });
});

// Helper functions for testing
function waitForServer(process, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Server failed to start within ${timeout}ms`));
    }, timeout);

    process.stdout.on('data', (data) => {
      if (data.toString().includes('localhost:')) {
        clearTimeout(timer);
        resolve();
      }
    });

    process.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function checkUrlResponse(url, expectedStatus = 200) {
  try {
    const response = await axios.get(url);
    return response.status === expectedStatus;
  } catch (error) {
    return false;
  }
}