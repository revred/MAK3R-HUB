const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

class ProjectCreator {
  constructor() {
    this.templateDir = path.join(__dirname, '..', 'templates');
    this.version = require('../package.json').version;
  }

  async createProject(name, options = {}) {
    try {
      console.log(chalk.blue(`🚀 Creating ${name} with MAK3R-HUB v${this.version}...`));
      
      const projectConfig = await this.generateProjectConfig(name, options);
      const projectPath = options.path ? path.resolve(options.path, name) : path.resolve(name);
      
      console.log(chalk.gray(`📁 Project path: ${projectPath}`));
      
      // Create project directory
      await fs.ensureDir(projectPath);
      
      // Create folder structure
      await this.createFolderStructure(projectPath, projectConfig);
      
      // Generate configuration files
      await this.generateConfigurationFiles(projectPath, projectConfig);
      
      // Generate documentation
      await this.generateDocumentation(projectPath, projectConfig);
      
      // Create launcher scripts
      await this.createLauncherScripts(projectPath, projectConfig);
      
      // Initialize framework-specific files
      await this.initializeFramework(projectPath, projectConfig);
      
      // Generate package.json
      await this.generatePackageJson(projectPath, projectConfig);
      
      console.log(chalk.green(`✅ Project ${name} created successfully!`));
      console.log(chalk.cyan('\n🚀 Next steps:'));
      console.log(chalk.gray(`   cd ${name}`));
      console.log(chalk.gray(`   ${projectConfig.launch_command}`));
      console.log(chalk.gray(`   # Access: http://localhost:${projectConfig.default_port}`));
      
      return {
        success: true,
        project: projectConfig,
        path: projectPath
      };
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed to create project: ${error.message}`));
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateProjectConfig(name, options) {
    const osType = os.platform();
    const isWindows = osType === 'win32';
    const framework = options.framework || 'vue-nuxt';
    const projectType = options.type || 'landing-page';
    
    const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const scriptsDir = isWindows ? 'batch-ops' : 'scripts';
    const scriptExt = isWindows ? '.bat' : '.sh';
    
    const frameworkConfig = this.getFrameworkConfig(framework);
    
    return {
      // Basic project info
      project_name: name,
      safe_project_name: safeName,
      project_type: projectType,
      created_date: new Date().toISOString(),
      mak3r_version: this.version,
      
      // OS configuration
      os_type: isWindows ? 'windows' : 'unix',
      is_windows: isWindows,
      is_unix: !isWindows,
      
      // Framework configuration
      framework: framework,
      framework_version: frameworkConfig.version,
      meta_framework: frameworkConfig.meta,
      framework_features: frameworkConfig.features,
      
      // Directory structure
      active_dir: frameworkConfig.activeDir,
      scripts_dir: scriptsDir,
      main_file: frameworkConfig.mainFile,
      config_file: frameworkConfig.configFile,
      
      // Scripts and commands
      launch_script: `launch-${safeName}${scriptExt}`,
      cleanup_script: `kill-servers${scriptExt}`,
      launch_command: `${scriptsDir}${path.sep}launch-${safeName}${scriptExt}`,
      cleanup_command: `${scriptsDir}${path.sep}kill-servers${scriptExt}`,
      
      // Port configuration
      default_port: 3000,
      mcp_port: 3001,
      api_port: 3002,
      ws_port: 3003,
      
      // Build configuration
      build_output: frameworkConfig.buildOutput,
      source_dir: frameworkConfig.sourceDir,
      assets_dir: frameworkConfig.assetsDir,
      public_dir: frameworkConfig.publicDir,
      
      // Styling and tools
      css_framework: frameworkConfig.cssFramework,
      state_management: frameworkConfig.stateManagement,
      deployment_target: frameworkConfig.deploymentTarget,
      linting_setup: frameworkConfig.lintingSetup,
      
      // Command patterns
      allowed_commands_pattern: isWindows ? 
        'TASKKILL|dir|type|copy|del|xcopy|timeout|start|npm|node|dotnet|batch-ops\\\\.*\\.bat' :
        'kill|killall|pkill|ls|cat|grep|cp|rm|chmod|bash|sh|npm|node|dotnet|\\./scripts/.*\\.sh',
      blocked_commands_pattern: isWindows ?
        'bash|sh|ls|cat|grep|chmod|kill|killall|pkill|\\./.*\\.sh' :
        'TASKKILL|dir|type|del|xcopy|start|cmd|.*\\.bat',
        
      // Configuration checksums
      config_checksum: this.generateChecksum(name + options.framework + options.type)
    };
  }

  getFrameworkConfig(framework) {
    const configs = {
      'vue-nuxt': {
        version: '^3.0.0',
        meta: 'Nuxt 3',
        features: 'SSR + SSG',
        activeDir: 'vue-nuxt',
        mainFile: 'app.vue',
        configFile: 'nuxt.config.ts',
        buildOutput: 'dist',
        sourceDir: 'src',
        assetsDir: 'assets',
        publicDir: 'public',
        cssFramework: 'Tailwind CSS',
        stateManagement: 'Pinia',
        deploymentTarget: 'Vercel',
        lintingSetup: 'ESLint + Prettier'
      },
      'react-next': {
        version: '^14.0.0',
        meta: 'Next.js 14',
        features: 'SSR + SSG + App Router',
        activeDir: 'react-next',
        mainFile: 'app/page.tsx',
        configFile: 'next.config.js',
        buildOutput: 'out',
        sourceDir: 'app',
        assetsDir: 'public',
        publicDir: 'public',
        cssFramework: 'Tailwind CSS',
        stateManagement: 'Zustand',
        deploymentTarget: 'Vercel',
        lintingSetup: 'ESLint + Prettier'
      },
      'svelte-kit': {
        version: '^2.0.0',
        meta: 'SvelteKit 2',
        features: 'SSR + SSG + Vite',
        activeDir: 'svelte-kit',
        mainFile: 'src/app.html',
        configFile: 'vite.config.js',
        buildOutput: 'build',
        sourceDir: 'src',
        assetsDir: 'static',
        publicDir: 'static',
        cssFramework: 'Tailwind CSS',
        stateManagement: 'Svelte Stores',
        deploymentTarget: 'Vercel',
        lintingSetup: 'ESLint + Prettier'
      }
    };
    
    return configs[framework] || configs['vue-nuxt'];
  }

  async createFolderStructure(projectPath, config) {
    const directories = [
      config.active_dir,
      config.scripts_dir,
      'domain',
      'domain/architecture',
      'domain/business',  
      'domain/components',
      'domain/knowledge',
      'domain/testing',
      'domain/validation',
      'visual-input',
      '.mak3r',
      '.mak3r/logs',
      '.mak3r/cache',
      '.mak3r/templates'
    ];

    console.log(chalk.gray('📁 Creating folder structure...'));
    for (const dir of directories) {
      const dirPath = path.join(projectPath, dir);
      await fs.ensureDir(dirPath);
      console.log(chalk.gray(`   ✓ ${dir}/`));
    }
  }

  async generateConfigurationFiles(projectPath, config) {
    console.log(chalk.gray('⚙️  Generating configuration files...'));
    
    const configFiles = [
      { template: 'config/config.json', output: '.mak3r/config.json' },
      { template: 'config/mcp-settings.json', output: '.mak3r/mcp-settings.json' },
      { template: 'config/claude-rules.json', output: '.mak3r/claude-rules.json' }
    ];

    for (const { template, output } of configFiles) {
      const templatePath = path.join(this.templateDir, template);
      const outputPath = path.join(projectPath, output);
      
      let content = await fs.readFile(templatePath, 'utf8');
      content = this.processTemplate(content, config);
      
      await fs.writeFile(outputPath, content);
      console.log(chalk.gray(`   ✓ ${output}`));
    }
  }

  async generateDocumentation(projectPath, config) {
    console.log(chalk.gray('📚 Generating documentation...'));
    
    const docFiles = [
      { template: 'project-docs/CLAUDE.md', output: 'CLAUDE.md' },
      { template: 'project-docs/CLAUDE.md', output: `${config.active_dir}/CLAUDE.md` },
      { template: 'project-docs/CLAUDE.md', output: `${config.scripts_dir}/CLAUDE.md` },
      { template: 'project-docs/CLAUDE.md', output: 'domain/CLAUDE.md' },
      { template: 'project-docs/CLAUDE.md', output: 'visual-input/CLAUDE.md' }
    ];

    // Generate main CLAUDE.md
    const templatePath = path.join(this.templateDir, 'project-docs/CLAUDE.md');
    let content = await fs.readFile(templatePath, 'utf8');
    content = this.processTemplate(content, config);
    
    await fs.writeFile(path.join(projectPath, 'CLAUDE.md'), content);
    console.log(chalk.gray(`   ✓ CLAUDE.md`));

    // Generate simplified versions for subfolders
    const simplifiedContent = this.generateSimplifiedClaudeDoc(config);
    const subfolders = [`${config.active_dir}`, `${config.scripts_dir}`, 'domain', 'visual-input'];
    
    for (const folder of subfolders) {
      const filePath = path.join(projectPath, folder, 'CLAUDE.md');
      await fs.writeFile(filePath, simplifiedContent.replace('{{FOLDER_NAME}}', folder));
      console.log(chalk.gray(`   ✓ ${folder}/CLAUDE.md`));
    }

    // Generate README.md
    await this.generateReadme(projectPath, config);
    console.log(chalk.gray(`   ✓ README.md`));
  }

  async createLauncherScripts(projectPath, config) {
    console.log(chalk.gray('🚀 Creating launcher scripts...'));
    
    const scriptsDir = path.join(projectPath, config.scripts_dir);
    await fs.ensureDir(scriptsDir);

    if (config.is_windows) {
      await this.createWindowsScripts(scriptsDir, config);
    } else {
      await this.createUnixScripts(scriptsDir, config);
    }
  }

  async createWindowsScripts(scriptsDir, config) {
    const scripts = {
      [`launch-${config.safe_project_name}.bat`]: this.generateWindowsLaunchScript(config),
      'launch-simple.bat': this.generateWindowsSimpleScript(config),
      'debug-launch.bat': this.generateWindowsDebugScript(config),
      'kill-servers.bat': this.generateWindowsKillScript(),
      'launch.bat': this.generateWindowsMenuScript(config)
    };

    for (const [filename, content] of Object.entries(scripts)) {
      const filePath = path.join(scriptsDir, filename);
      await fs.writeFile(filePath, content);
      console.log(chalk.gray(`   ✓ ${config.scripts_dir}/${filename}`));
    }
  }

  async createUnixScripts(scriptsDir, config) {
    const scripts = {
      [`launch-${config.safe_project_name}.sh`]: this.generateUnixLaunchScript(config),
      'launch-simple.sh': this.generateUnixSimpleScript(config),
      'debug-launch.sh': this.generateUnixDebugScript(config),
      'kill-servers.sh': this.generateUnixKillScript(),
      'launch.sh': this.generateUnixMenuScript(config)
    };

    for (const [filename, content] of Object.entries(scripts)) {
      const filePath = path.join(scriptsDir, filename);
      await fs.writeFile(filePath, content);
      await fs.chmod(filePath, '755'); // Make executable
      console.log(chalk.gray(`   ✓ ${config.scripts_dir}/${filename}`));
    }
  }

  async initializeFramework(projectPath, config) {
    console.log(chalk.gray(`🔧 Initializing ${config.framework} framework...`));
    
    const frameworkDir = path.join(projectPath, config.active_dir);
    await fs.ensureDir(frameworkDir);

    // Create basic framework files based on type
    switch (config.framework) {
      case 'vue-nuxt':
        await this.initializeVueNuxt(frameworkDir, config);
        break;
      case 'react-next':
        await this.initializeReactNext(frameworkDir, config);
        break;
      case 'svelte-kit':
        await this.initializeSvelteKit(frameworkDir, config);
        break;
    }
  }

  async initializeVueNuxt(frameworkDir, config) {
    // Create basic Nuxt files
    const files = {
      'app.vue': this.generateNuxtApp(config),
      'nuxt.config.ts': this.generateNuxtConfig(config),
      'package.json': this.generateNuxtPackageJson(config)
    };

    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join(frameworkDir, filename), content);
      console.log(chalk.gray(`   ✓ ${config.active_dir}/${filename}`));
    }

    // Create directories
    const dirs = ['pages', 'components', 'composables', 'assets', 'public'];
    for (const dir of dirs) {
      await fs.ensureDir(path.join(frameworkDir, dir));
      console.log(chalk.gray(`   ✓ ${config.active_dir}/${dir}/`));
    }
  }

  async initializeReactNext(frameworkDir, config) {
    // Similar implementation for React Next.js
    const files = {
      'package.json': this.generateNextPackageJson(config),
      'next.config.js': this.generateNextConfig(config),
      'app/layout.tsx': this.generateNextLayout(config),
      'app/page.tsx': this.generateNextPage(config)
    };

    await fs.ensureDir(path.join(frameworkDir, 'app'));
    
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(frameworkDir, filename);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content);
      console.log(chalk.gray(`   ✓ ${config.active_dir}/${filename}`));
    }
  }

  async initializeSvelteKit(frameworkDir, config) {
    // Similar implementation for SvelteKit
    const files = {
      'package.json': this.generateSvelteKitPackageJson(config),
      'vite.config.js': this.generateSvelteKitConfig(config),
      'src/app.html': this.generateSvelteKitApp(config),
      'src/routes/+layout.svelte': this.generateSvelteKitLayout(config),
      'src/routes/+page.svelte': this.generateSvelteKitPage(config)
    };

    await fs.ensureDir(path.join(frameworkDir, 'src/routes'));
    
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(frameworkDir, filename);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, content);
      console.log(chalk.gray(`   ✓ ${config.active_dir}/${filename}`));
    }
  }

  async generatePackageJson(projectPath, config) {
    const packageJson = {
      name: config.safe_project_name,
      version: '1.0.0',
      description: `${config.project_name} - Created with MAK3R-HUB v${config.mak3r_version}`,
      scripts: {
        dev: `cd ${config.active_dir} && npm run dev`,
        build: `cd ${config.active_dir} && npm run build`,
        start: `cd ${config.active_dir} && npm run start`,
        test: `cd ${config.active_dir} && npm run test`,
        lint: `cd ${config.active_dir} && npm run lint`,
        'mcp:start': 'MAK3R-HUB mcp start',
        'mcp:stop': 'MAK3R-HUB mcp stop',
        'mcp:status': 'MAK3R-HUB mcp status'
      },
      keywords: [
        'mak3r-hub',
        'website',
        config.framework,
        config.project_type,
        'claude-code'
      ],
      author: 'MAK3R-HUB',
      license: 'MIT',
      mak3r: {
        version: config.mak3r_version,
        framework: config.framework,
        os: config.os_type,
        created: config.created_date
      }
    };

    await fs.writeFile(
      path.join(projectPath, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    console.log(chalk.gray(`   ✓ package.json`));
  }

  // Template processing
  processTemplate(content, config) {
    // Replace all template variables
    let processed = content;
    
    // Handle conditional blocks
    processed = this.processConditionals(processed, config);
    
    // Replace simple variables
    const variables = {
      'PROJECT_NAME': config.project_name,
      'SAFE_PROJECT_NAME': config.safe_project_name,
      'PROJECT_TYPE': config.project_type,
      'OS_TYPE': config.os_type,
      'FRAMEWORK': config.framework,
      'META_FRAMEWORK': config.meta_framework,
      'FRAMEWORK_FEATURES': config.framework_features,
      'ACTIVE_DIR': config.active_dir,
      'SCRIPTS_DIR': config.scripts_dir,
      'MAIN_FILE': config.main_file,
      'CONFIG_FILE': config.config_file,
      'LAUNCH_COMMAND': config.launch_command,
      'CLEANUP_COMMAND': config.cleanup_command,
      'DEFAULT_PORT': config.default_port.toString(),
      'MCP_PORT': config.mcp_port.toString(),
      'API_PORT': config.api_port.toString(),
      'WS_PORT': config.ws_port.toString(),
      'MAK3R_VERSION': config.mak3r_version,
      'CREATED_DATE': config.created_date,
      'ALLOWED_COMMANDS_PATTERN': config.allowed_commands_pattern,
      'BLOCKED_COMMANDS_PATTERN': config.blocked_commands_pattern,
      'CONFIG_CHECKSUM': config.config_checksum,
      'CSS_FRAMEWORK': config.css_framework,
      'STATE_MANAGEMENT': config.state_management,
      'DEPLOYMENT_TARGET': config.deployment_target,
      'LINTING_SETUP': config.linting_setup,
      'BUILD_OUTPUT': config.build_output,
      'SOURCE_DIR': config.source_dir,
      'ASSETS_DIR': config.assets_dir,
      'PUBLIC_DIR': config.public_dir
    };

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value || '');
    }

    return processed;
  }

  processConditionals(content, config) {
    // Handle {{#if_windows}} blocks
    if (config.is_windows) {
      content = content.replace(/{{#if_windows}}([\s\S]*?){{\/if_windows}}/g, '$1');
      content = content.replace(/{{#if_unix}}[\s\S]*?{{\/if_unix}}/g, '');
    } else {
      content = content.replace(/{{#if_windows}}[\s\S]*?{{\/if_windows}}/g, '');
      content = content.replace(/{{#if_unix}}([\s\S]*?){{\/if_unix}}/g, '$1');
    }

    // Handle other conditionals
    content = content.replace(/{{#if_batch_ops}}([\s\S]*?){{\/if_batch_ops}}/g, 
      config.is_windows ? '$1' : '');
    content = content.replace(/{{#if_scripts}}([\s\S]*?){{\/if_scripts}}/g, 
      !config.is_windows ? '$1' : '');

    return content;
  }

  generateChecksum(input) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(input).digest('hex').substring(0, 8);
  }

  // Script generators
  generateWindowsLaunchScript(config) {
    return `@echo off
REM MAK3R-HUB Auto-Generated Launch Script for ${config.project_name}
REM Framework: ${config.framework}
REM Generated: ${config.created_date}

echo.
echo 🚀 Starting ${config.project_name} development server...
echo 📋 Framework: ${config.framework}
echo 🌐 Port: ${config.default_port}
echo.

cd /d "%~dp0.."
cd ${config.active_dir}

REM Check if dependencies are installed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start development server
echo ✅ Starting development server...
timeout 2 > nul
start http://localhost:${config.default_port}
npm run dev

pause`;
  }

  generateWindowsKillScript() {
    return `@echo off
REM MAK3R-HUB Server Cleanup Script

echo.
echo 🧹 Cleaning up development servers...
echo.

REM Kill Node.js processes
TASKKILL /F /IM node.exe 2>nul
if %errorlevel% == 0 (
    echo ✅ Node.js processes terminated
) else (
    echo 💡 No Node.js processes found
)

REM Kill npm processes
TASKKILL /F /IM npm.exe 2>nul

REM Wait a moment
timeout 2 > nul

echo.
echo ✅ Server cleanup completed
pause`;
  }

  generateUnixLaunchScript(config) {
    return `#!/bin/bash
# MAK3R-HUB Auto-Generated Launch Script for ${config.project_name}
# Framework: ${config.framework}
# Generated: ${config.created_date}

echo ""
echo "🚀 Starting ${config.project_name} development server..."
echo "📋 Framework: ${config.framework}"
echo "🌐 Port: ${config.default_port}"
echo ""

cd "$(dirname "$0")/.."
cd ${config.active_dir}

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Start development server
echo "✅ Starting development server..."
sleep 2

# Open browser (platform-specific)
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:${config.default_port} &
elif command -v open > /dev/null; then
    open http://localhost:${config.default_port} &
fi

npm run dev`;
  }

  generateUnixKillScript() {
    return `#!/bin/bash
# MAK3R-HUB Server Cleanup Script

echo ""
echo "🧹 Cleaning up development servers..."
echo ""

# Kill Node.js processes
if pgrep -x "node" > /dev/null; then
    killall node 2>/dev/null
    echo "✅ Node.js processes terminated"
else
    echo "💡 No Node.js processes found"
fi

# Kill npm processes
if pgrep -f "npm" > /dev/null; then
    pkill -f "npm" 2>/dev/null
fi

# Wait a moment
sleep 2

echo ""
echo "✅ Server cleanup completed"`;
  }

  // Framework file generators
  generateNuxtApp(config) {
    return `<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center py-6">
          <h1 class="text-3xl font-bold text-gray-900">
            ${config.project_name}
          </h1>
          <div class="flex items-center space-x-4">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              MAK3R-HUB v${config.mak3r_version}
            </span>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ${config.framework}
            </span>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <div class="text-center">
        <div class="mx-auto max-w-md">
          <svg class="mx-auto h-16 w-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        
        <h2 class="mt-8 text-4xl font-bold text-gray-900 sm:text-5xl">
          Welcome to ${config.project_name}
        </h2>
        
        <p class="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
          Your ${config.project_type} is ready! This project was created with MAK3R-HUB for 
          optimal Claude Code integration and streamlined development.
        </p>

        <div class="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">🚀 Framework</h3>
            <p class="text-gray-600">${config.framework} with ${config.meta_framework}</p>
          </div>
          
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">🎨 Styling</h3>
            <p class="text-gray-600">${config.css_framework}</p>
          </div>
          
          <div class="bg-white rounded-lg shadow p-6">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">📱 Deployment</h3>
            <p class="text-gray-600">${config.deployment_target}</p>
          </div>
        </div>

        <div class="mt-12 bg-blue-50 rounded-lg p-8">
          <h3 class="text-xl font-semibold text-blue-900 mb-4">🎯 Next Steps</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <div>
              <h4 class="font-medium text-blue-800 mb-2">Development</h4>
              <ul class="text-sm text-blue-700 space-y-1">
                <li>• Edit this file: <code>${config.main_file}</code></li>
                <li>• Check out <code>components/</code> directory</li>
                <li>• Configure in <code>${config.config_file}</code></li>
              </ul>
            </div>
            <div>
              <h4 class="font-medium text-blue-800 mb-2">Claude Code Integration</h4>
              <ul class="text-sm text-blue-700 space-y-1">
                <li>• Read <code>CLAUDE.md</code> for guidance</li>
                <li>• Use MAK3R-HUB commands for operations</li>
                <li>• MCP service on port ${config.mcp_port}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>

    <footer class="bg-white border-t mt-16">
      <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <p class="text-center text-sm text-gray-500">
          Created with ❤️ by MAK3R-HUB v${config.mak3r_version} • 
          OS: ${config.os_type} • 
          Generated: ${new Date(config.created_date).toLocaleDateString()}
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup>
// ${config.project_name} - MAK3R-HUB Generated App
// Framework: ${config.framework}
// Created: ${config.created_date}

useHead({
  title: '${config.project_name}',
  meta: [
    { name: 'description', content: 'Created with MAK3R-HUB v${config.mak3r_version}' }
  ]
})
</script>`;
  }

  generateNuxtConfig(config) {
    return `// MAK3R-HUB Generated Nuxt Configuration
// Project: ${config.project_name}
// Framework: ${config.framework}
// Generated: ${config.created_date}

export default defineNuxtConfig({
  devtools: { enabled: true },
  
  css: ['~/assets/css/main.css'],
  
  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  
  app: {
    head: {
      title: '${config.project_name}',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '${config.project_name} - Created with MAK3R-HUB v${config.mak3r_version}' }
      ]
    }
  },
  
  devServer: {
    port: ${config.default_port},
    host: 'localhost'
  },
  
  // MAK3R-HUB Configuration
  runtimeConfig: {
    public: {
      mak3rVersion: '${config.mak3r_version}',
      projectName: '${config.project_name}',
      framework: '${config.framework}',
      mcpPort: ${config.mcp_port}
    }
  }
})`;
  }

  generateNuxtPackageJson(config) {
    return JSON.stringify({
      name: config.safe_project_name,
      version: "1.0.0",
      description: `${config.project_name} - Created with MAK3R-HUB v${config.mak3r_version}`,
      scripts: {
        build: "nuxt build",
        dev: "nuxt dev",
        generate: "nuxt generate",
        preview: "nuxt preview",
        postinstall: "nuxt prepare"
      },
      devDependencies: {
        "@nuxt/devtools": "latest",
        "@nuxtjs/tailwindcss": "^6.0.0",
        "nuxt": "^3.8.0"
      },
      dependencies: {
        "@pinia/nuxt": "^0.5.0",
        "pinia": "^2.1.0"
      },
      mak3r: {
        version: config.mak3r_version,
        framework: config.framework,
        created: config.created_date
      }
    }, null, 2);
  }

  generateSimplifiedClaudeDoc(config) {
    return `# CLAUDE.md - {{FOLDER_NAME}}

## Folder Context
This is the **{{FOLDER_NAME}}** directory for ${config.project_name}, managed by MAK3R-HUB v${config.mak3r_version}.

### OS Configuration: ${config.os_type}
- Use ${config.is_windows ? 'Windows' : 'Unix/Linux'} commands only
- Launcher: \`${config.launch_command}\`
- Cleanup: \`${config.cleanup_command}\`

### Quick Reference
- **Framework**: ${config.framework}
- **Port**: ${config.default_port}
- **MCP Service**: localhost:${config.mcp_port}

### Claude Code Rules
- ✅ Use MAK3R-HUB abstractions: \`MAK3R-HUB <command>\`
- ✅ Reference main CLAUDE.md for detailed instructions
- ❌ Avoid manual file operations when MAK3R-HUB commands exist

*See main CLAUDE.md for complete documentation.*`;
  }

  async generateReadme(projectPath, config) {
    const readme = `# ${config.project_name}

${config.project_name} is a ${config.project_type} created with MAK3R-HUB v${config.mak3r_version}.

## 🚀 Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development server  
${config.launch_command}

# Access your app
open http://localhost:${config.default_port}
\`\`\`

## 🛠️ Technology Stack

- **Framework**: ${config.framework} (${config.meta_framework})
- **Styling**: ${config.css_framework}
- **State Management**: ${config.state_management}
- **Deployment**: ${config.deployment_target}
- **OS**: ${config.os_type}

## 📁 Project Structure

\`\`\`
${config.project_name}/
├── ${config.active_dir}/          # Main application code
├── ${config.scripts_dir}/         # Launch and utility scripts  
├── domain/                        # Project documentation
├── visual-input/                  # Assets and media
├── .mak3r/                        # MAK3R-HUB configuration
├── CLAUDE.md                      # AI development guide
└── README.md                      # This file
\`\`\`

## 🤖 Claude Code Integration

This project includes optimized Claude Code integration:

- **MCP Service**: Runs on port ${config.mcp_port}
- **OS-Aware Commands**: Prevents ${config.is_windows ? 'Unix/Linux' : 'Windows'} command errors
- **Token Optimization**: Uses MAK3R-HUB abstractions  
- **Smart Documentation**: Auto-generated context files

Read \`CLAUDE.md\` for detailed Claude Code usage instructions.

## 📋 Available Commands

### Development
\`\`\`bash
npm run dev                        # Start development server
npm run build                      # Build for production  
npm run preview                    # Preview production build
\`\`\`

### MAK3R-HUB
\`\`\`bash
MAK3R-HUB mcp start                # Start MCP service
MAK3R-HUB mcp status               # Check service status
MAK3R-HUB deploy                   # Deploy to production
\`\`\`

### ${config.is_windows ? 'Windows' : 'Unix/Linux'} Scripts
\`\`\`bash
${config.launch_command}           # Launch development server
${config.cleanup_command}          # Clean up processes
\`\`\`

## 🚦 Development Workflow

1. **Start Development**: Run \`${config.launch_command}\`
2. **Make Changes**: Edit files in \`${config.active_dir}/\`  
3. **Use Claude Code**: Reference \`CLAUDE.md\` for AI assistance
4. **Deploy**: Run \`MAK3R-HUB deploy\` when ready

## 📖 Documentation

- \`CLAUDE.md\` - Complete AI development guide
- \`domain/\` - Project specifications and architecture  
- \`.mak3r/\` - Configuration and settings

## 🆘 Support

- **MAK3R-HUB Issues**: [GitHub Repository](https://github.com/revred/MAK3R-HUB/issues)
- **Framework Docs**: [${config.framework} Documentation](https://nuxt.com/docs)
- **Claude Code**: [Official Documentation](https://docs.anthropic.com/claude-code)

---

**Created with ❤️ by MAK3R-HUB v${config.mak3r_version}**  
*Generated on ${new Date(config.created_date).toLocaleDateString()}*`;

    await fs.writeFile(path.join(projectPath, 'README.md'), readme);
  }

  // Additional framework generators would go here...
  generateNextPackageJson(config) {
    return JSON.stringify({
      name: config.safe_project_name,
      version: "1.0.0",
      scripts: {
        dev: "next dev",
        build: "next build", 
        start: "next start",
        lint: "next lint"
      },
      dependencies: {
        "next": "14.0.0",
        "react": "^18",
        "react-dom": "^18"
      },
      devDependencies: {
        "@types/node": "^20",
        "@types/react": "^18",
        "@types/react-dom": "^18",
        "typescript": "^5"
      }
    }, null, 2);
  }

  // More framework generators...
}

module.exports = ProjectCreator;