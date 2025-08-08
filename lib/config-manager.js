const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

class ConfigManager {
  constructor(projectPath = process.cwd()) {
    this.projectPath = projectPath;
    this.configDir = path.join(projectPath, '.mak3r');
    this.configFile = path.join(this.configDir, 'config.json');
    this.rulesFile = path.join(this.configDir, 'claude-rules.json');
    this.mcpFile = path.join(this.configDir, 'mcp-settings.json');
    this.version = require('../package.json').version;
    this.config = null;
  }

  async initialize() {
    try {
      await this.ensureConfigDirectory();
      await this.loadConfiguration();
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to initialize configuration: ${error.message}`));
      return false;
    }
  }

  async ensureConfigDirectory() {
    await fs.ensureDir(this.configDir);
    await fs.ensureDir(path.join(this.configDir, 'logs'));
    await fs.ensureDir(path.join(this.configDir, 'cache'));
    await fs.ensureDir(path.join(this.configDir, 'templates'));
  }

  async loadConfiguration() {
    if (fs.existsSync(this.configFile)) {
      try {
        this.config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        return this.config;
      } catch (error) {
        console.warn(chalk.yellow('⚠️  Failed to parse existing config, creating new one'));
      }
    }
    
    this.config = await this.createDefaultConfiguration();
    return this.config;
  }

  async createDefaultConfiguration() {
    const osType = os.platform();
    const isWindows = osType === 'win32';
    const projectName = path.basename(this.projectPath);
    
    const config = {
      project: {
        name: projectName,
        safe_name: this.sanitizeName(projectName),
        type: 'unknown',
        version: '1.0.0',
        created: new Date().toISOString(),
        mak3r_version: this.version
      },
      framework: {
        primary: 'unknown',
        version: 'unknown',
        meta_framework: null,
        features: []
      },
      environment: {
        os: osType,
        is_windows: isWindows,
        is_unix: !isWindows,
        node_version: process.version,
        package_manager: await this.detectPackageManager(),
        shell: process.env.SHELL || process.env.COMSPEC || 'unknown'
      },
      structure: {
        active_dir: await this.detectActiveDirectory(),
        scripts_dir: isWindows ? 'batch-ops' : 'scripts',
        docs_dir: 'domain',
        assets_dir: 'visual-input',
        config_dir: '.mak3r'
      },
      files: {
        main: await this.detectMainFile(),
        config: await this.detectConfigFile(),
        launch_script: null,
        cleanup_script: null
      },
      ports: {
        dev_server: 3000,
        mcp_service: 3001,
        api_server: 3002,
        websocket: 3003
      },
      build: {
        output_dir: 'dist',
        source_dir: 'src',
        assets_dir: 'assets',
        public_dir: 'public'
      },
      development: {
        auto_reload: true,
        source_maps: true,
        hot_reload: true,
        error_overlay: true
      },
      deployment: {
        target: 'vercel',
        build_command: 'npm run build',
        output_directory: 'dist',
        environment_variables: {}
      },
      mak3r: {
        abstractions_enabled: true,
        os_validation_enabled: true,
        token_optimization_enabled: true,
        auto_documentation_enabled: true,
        mcp_integration_enabled: true,
        config_version: '1.0.0'
      }
    };

    await this.saveConfiguration(config);
    return config;
  }

  async detectActiveDirectory() {
    const commonDirs = [
      'vue-nuxt', 'react-next', 'svelte-kit', 'angular',
      'src', 'app', 'client', 'frontend', 'web'
    ];

    for (const dir of commonDirs) {
      if (fs.existsSync(path.join(this.projectPath, dir))) {
        return dir;
      }
    }

    return 'src'; // default
  }

  async detectMainFile() {
    const commonFiles = [
      'app.vue', 'App.vue', 'app.tsx', 'App.tsx', 'app.js', 'App.js',
      'pages/index.vue', 'app/page.tsx', 'src/App.vue', 'src/App.tsx',
      'index.html', 'index.js', 'index.ts', 'main.js', 'main.ts'
    ];

    for (const file of commonFiles) {
      if (fs.existsSync(path.join(this.projectPath, file))) {
        return file;
      }
    }

    return 'index.html'; // default
  }

  async detectConfigFile() {
    const configFiles = [
      'nuxt.config.ts', 'nuxt.config.js',
      'next.config.js', 'next.config.ts',
      'vite.config.js', 'vite.config.ts',
      'svelte.config.js', 'webpack.config.js',
      'angular.json', 'vue.config.js'
    ];

    for (const file of configFiles) {
      if (fs.existsSync(path.join(this.projectPath, file))) {
        return file;
      }
    }

    return 'package.json'; // fallback
  }

  async detectPackageManager() {
    if (fs.existsSync(path.join(this.projectPath, 'yarn.lock'))) {
      return 'yarn';
    } else if (fs.existsSync(path.join(this.projectPath, 'pnpm-lock.yaml'))) {
      return 'pnpm';
    } else if (fs.existsSync(path.join(this.projectPath, 'bun.lockb'))) {
      return 'bun';
    }
    return 'npm'; // default
  }

  sanitizeName(name) {
    return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
  }

  async saveConfiguration(config = this.config) {
    try {
      await fs.writeFile(this.configFile, JSON.stringify(config, null, 2));
      this.config = config;
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to save configuration: ${error.message}`));
      return false;
    }
  }

  async updateConfiguration(updates) {
    if (!this.config) {
      await this.loadConfiguration();
    }

    // Deep merge updates
    this.config = this.deepMerge(this.config, updates);
    this.config.project.modified = new Date().toISOString();
    
    return await this.saveConfiguration();
  }

  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  getConfiguration() {
    return this.config;
  }

  getProjectInfo() {
    return this.config?.project || null;
  }

  getFrameworkInfo() {
    return this.config?.framework || null;
  }

  getEnvironmentInfo() {
    return this.config?.environment || null;
  }

  getPortConfiguration() {
    return this.config?.ports || { dev_server: 3000, mcp_service: 3001 };
  }

  async createCustomConfiguration(template = 'default') {
    const templates = {
      default: await this.createDefaultConfiguration(),
      minimal: await this.createMinimalConfiguration(),
      advanced: await this.createAdvancedConfiguration()
    };

    const config = templates[template] || templates.default;
    await this.saveConfiguration(config);
    return config;
  }

  async createMinimalConfiguration() {
    const minimal = {
      project: {
        name: path.basename(this.projectPath),
        version: '1.0.0',
        mak3r_version: this.version
      },
      environment: {
        os: os.platform(),
        node_version: process.version
      },
      ports: {
        dev_server: 3000,
        mcp_service: 3001
      },
      mak3r: {
        config_version: '1.0.0'
      }
    };

    return minimal;
  }

  async createAdvancedConfiguration() {
    const advanced = await this.createDefaultConfiguration();
    
    // Add advanced features
    advanced.features = {
      hot_reload: true,
      source_maps: true,
      code_splitting: true,
      tree_shaking: true,
      bundle_analyzer: true,
      performance_monitoring: true
    };

    advanced.optimization = {
      minify: true,
      compress: true,
      cache: true,
      parallel: true
    };

    advanced.security = {
      cors_enabled: true,
      helmet_enabled: true,
      rate_limiting: true,
      input_validation: true
    };

    advanced.monitoring = {
      error_tracking: true,
      performance_metrics: true,
      user_analytics: false,
      logging_level: 'info'
    };

    return advanced;
  }

  async generateConfigurationReport() {
    if (!this.config) {
      await this.loadConfiguration();
    }

    const report = {
      generated: new Date().toISOString(),
      project: this.config.project,
      environment: this.config.environment,
      structure: this.config.structure,
      ports: this.config.ports,
      features_enabled: Object.entries(this.config.mak3r)
        .filter(([key, value]) => value === true)
        .map(([key]) => key),
      recommendations: []
    };

    // Add recommendations based on configuration
    if (!this.config.mak3r.mcp_integration_enabled) {
      report.recommendations.push('Enable MCP integration for Claude Code optimization');
    }

    if (!this.config.mak3r.os_validation_enabled) {
      report.recommendations.push('Enable OS validation to prevent command errors');
    }

    if (this.config.framework.primary === 'unknown') {
      report.recommendations.push('Specify framework for better tooling integration');
    }

    return report;
  }

  async exportConfiguration(format = 'json') {
    if (!this.config) {
      await this.loadConfiguration();
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `mak3r-config-${timestamp}.${format}`;
    const exportPath = path.join(this.configDir, 'exports', filename);
    
    await fs.ensureDir(path.dirname(exportPath));

    switch (format) {
      case 'json':
        await fs.writeFile(exportPath, JSON.stringify(this.config, null, 2));
        break;
      case 'yaml':
        // Would need yaml library
        throw new Error('YAML export not implemented yet');
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return exportPath;
  }

  async importConfiguration(configPath) {
    try {
      const importedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      // Validate imported config
      if (!importedConfig.project || !importedConfig.mak3r) {
        throw new Error('Invalid MAK3R-HUB configuration file');
      }

      // Update version and timestamps
      importedConfig.project.mak3r_version = this.version;
      importedConfig.project.imported = new Date().toISOString();
      
      await this.saveConfiguration(importedConfig);
      return true;
    } catch (error) {
      console.error(chalk.red(`❌ Failed to import configuration: ${error.message}`));
      return false;
    }
  }

  async validateConfiguration() {
    if (!this.config) {
      await this.loadConfiguration();
    }

    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      suggestions: []
    };

    // Required fields validation
    const requiredFields = [
      'project.name',
      'project.mak3r_version', 
      'environment.os',
      'mak3r.config_version'
    ];

    for (const field of requiredFields) {
      if (!this.getNestedValue(this.config, field)) {
        validation.errors.push(`Missing required field: ${field}`);
        validation.valid = false;
      }
    }

    // Port conflicts
    const ports = Object.values(this.config.ports || {});
    const uniquePorts = new Set(ports);
    if (ports.length !== uniquePorts.size) {
      validation.warnings.push('Port conflicts detected in configuration');
    }

    // Version compatibility
    if (this.config.project.mak3r_version !== this.version) {
      validation.warnings.push(`Configuration version mismatch: ${this.config.project.mak3r_version} vs ${this.version}`);
      validation.suggestions.push('Update configuration: MAK3R-HUB config update');
    }

    return validation;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  async resetConfiguration(type = 'default') {
    const backupPath = path.join(this.configDir, 'backups', `config-backup-${Date.now()}.json`);
    
    // Backup existing config
    if (this.config) {
      await fs.ensureDir(path.dirname(backupPath));
      await fs.writeFile(backupPath, JSON.stringify(this.config, null, 2));
      console.log(chalk.yellow(`📋 Configuration backed up to: ${backupPath}`));
    }

    // Create new configuration
    this.config = await this.createCustomConfiguration(type);
    
    console.log(chalk.green(`✅ Configuration reset to ${type} template`));
    return this.config;
  }
}

module.exports = ConfigManager;