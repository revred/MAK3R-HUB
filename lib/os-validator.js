const os = require('os');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class OSValidator {
  constructor() {
    this.platform = os.platform();
    this.isWindows = this.platform === 'win32';
    this.isUnix = !this.isWindows;
    this.rules = null;
  }

  async initialize(projectPath = process.cwd()) {
    try {
      const rulesPath = path.join(projectPath, '.mak3r', 'claude-rules.json');
      if (fs.existsSync(rulesPath)) {
        this.rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️  Failed to load project rules, using defaults'));
    }

    if (!this.rules) {
      this.rules = this.getDefaultRules();
    }
  }

  getDefaultRules() {
    return {
      command_rules: {
        windows: {
          allowed_patterns: [
            'TASKKILL',
            'dir',
            'type',
            'copy',
            'del',
            'xcopy',
            'timeout',
            'start',
            'npm',
            'node',
            'dotnet',
            'echo',
            'cd',
            'mkdir',
            'rmdir',
            'batch-ops\\\\.*\\.bat'
          ],
          blocked_patterns: [
            'bash',
            'sh',
            'ls',
            'cat',
            'grep',
            'chmod',
            'kill',
            'killall',
            'pkill',
            'sudo',
            '\\./.*\\.sh'
          ],
          auto_replacements: {
            'ls': 'dir',
            'cat': 'type',
            'rm': 'del',
            'cp': 'copy',
            'grep': 'findstr',
            'kill -9': 'TASKKILL /F /PID',
            'killall': 'TASKKILL /F /IM',
            'chmod': 'attrib'
          }
        },
        unix: {
          allowed_patterns: [
            'kill',
            'killall',
            'pkill',
            'ls',
            'cat',
            'grep',
            'cp',
            'rm',
            'chmod',
            'bash',
            'sh',
            'sudo',
            'npm',
            'node',
            'dotnet',
            'echo',
            'cd',
            'mkdir',
            'rmdir',
            '\\./scripts/.*\\.sh'
          ],
          blocked_patterns: [
            'TASKKILL',
            'dir',
            'type',
            'del',
            'xcopy',
            'start',
            'cmd',
            'attrib',
            '.*\\.bat'
          ],
          auto_replacements: {
            'dir': 'ls -la',
            'type': 'cat',
            'del': 'rm',
            'copy': 'cp',
            'findstr': 'grep',
            'TASKKILL /F /PID': 'kill -9',
            'TASKKILL /F /IM': 'killall',
            'attrib': 'chmod'
          }
        }
      },
      dangerous_commands: [
        'rm -rf /',
        'del /s /q C:\\',
        'format',
        'diskpart',
        'fdisk',
        'dd if=',
        'sudo rm -rf',
        'chmod 777 -R /',
        'chown -R root',
        '> /dev/sda',
        'fork bomb',
        ':(){ :|:& };:',
        'del /f /s /q %systemdrive%'
      ]
    };
  }

  validateCommand(command, context = {}) {
    const result = {
      valid: false,
      blocked: false,
      dangerous: false,
      reason: '',
      suggestion: null,
      alternative: null,
      warnings: [],
      os_compatible: false
    };

    // Check for dangerous commands first
    if (this.isDangerous(command)) {
      result.dangerous = true;
      result.blocked = true;
      result.reason = 'Command is potentially destructive and has been blocked for safety';
      return result;
    }

    const platformRules = this.isWindows ? 
      this.rules.command_rules.windows : 
      this.rules.command_rules.unix;

    // Check if command is blocked for this OS
    const isBlocked = platformRules.blocked_patterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(command);
    });

    if (isBlocked) {
      result.blocked = true;
      result.reason = `Command '${command}' is not compatible with ${this.isWindows ? 'Windows' : 'Unix/Linux'} environment`;
      result.suggestion = this.getSuggestion(command, platformRules.auto_replacements);
      result.alternative = this.getAlternativeCommand(command);
      return result;
    }

    // Check if command is explicitly allowed
    const isAllowed = platformRules.allowed_patterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(command);
    });

    result.valid = isAllowed;
    result.os_compatible = isAllowed;

    if (!isAllowed) {
      result.reason = 'Command not in allowed patterns for this OS';
      result.warnings.push('Consider using MAK3R-HUB abstractions for common operations');
    }

    // Add contextual warnings
    if (this.hasOSSpecificPaths(command)) {
      result.warnings.push('Command contains OS-specific paths - verify compatibility');
    }

    if (this.requiresElevation(command)) {
      result.warnings.push('Command may require elevated privileges');
    }

    return result;
  }

  isDangerous(command) {
    const lowerCommand = command.toLowerCase();
    return this.rules.dangerous_commands.some(dangerous => 
      lowerCommand.includes(dangerous.toLowerCase())
    );
  }

  getSuggestion(command, replacements) {
    for (const [wrong, correct] of Object.entries(replacements)) {
      if (command.toLowerCase().includes(wrong.toLowerCase())) {
        return command.replace(new RegExp(wrong, 'gi'), correct);
      }
    }
    return null;
  }

  getAlternativeCommand(command) {
    const alternatives = {
      // File operations
      'ls': this.isWindows ? 'dir' : 'ls -la',
      'cat': this.isWindows ? 'type' : 'cat',
      'rm': this.isWindows ? 'del' : 'rm',
      'cp': this.isWindows ? 'copy' : 'cp',
      
      // Process management  
      'kill': this.isWindows ? 'TASKKILL /F /PID' : 'kill -9',
      'killall': this.isWindows ? 'TASKKILL /F /IM' : 'killall',
      
      // System info
      'ps': this.isWindows ? 'tasklist' : 'ps aux',
      'netstat': this.isWindows ? 'netstat -an' : 'netstat -tuln'
    };

    const commandWord = command.split(' ')[0];
    return alternatives[commandWord] || null;
  }

  hasOSSpecificPaths(command) {
    const windowsPaths = [/[C-Z]:\\/, /\\\\/, /Program Files/i, /%[A-Z_]+%/];
    const unixPaths = [/\/usr\//, /\/etc\//, /\/var\//, /\/home\//, /\$[A-Z_]+/];
    
    if (this.isWindows) {
      return unixPaths.some(pattern => pattern.test(command));
    } else {
      return windowsPaths.some(pattern => pattern.test(command));
    }
  }

  requiresElevation(command) {
    const elevatedCommands = [
      'sudo', 'su', 'runas', 'net user', 'net localgroup',
      'sc ', 'service ', 'systemctl', 'chkconfig',
      'mount', 'umount', 'fdisk', 'parted'
    ];
    
    return elevatedCommands.some(elevated => 
      command.toLowerCase().includes(elevated.toLowerCase())
    );
  }

  getOSInfo() {
    return {
      platform: this.platform,
      isWindows: this.isWindows,
      isUnix: this.isUnix,
      arch: os.arch(),
      version: os.release(),
      hostname: os.hostname(),
      shell: process.env.SHELL || process.env.COMSPEC || 'unknown'
    };
  }

  generateOSReport() {
    const info = this.getOSInfo();
    const rules = this.isWindows ? 
      this.rules.command_rules.windows : 
      this.rules.command_rules.unix;

    return {
      system: info,
      validation_rules: {
        allowed_patterns: rules.allowed_patterns,
        blocked_patterns: rules.blocked_patterns,
        auto_replacements: rules.auto_replacements
      },
      recommendations: this.getRecommendations()
    };
  }

  getRecommendations() {
    const recommendations = [];

    if (this.isWindows) {
      recommendations.push('Use Windows batch files (.bat) for scripting');
      recommendations.push('Use TASKKILL instead of kill for process management');
      recommendations.push('Use dir instead of ls for directory listing');
      recommendations.push('Use type instead of cat for file reading');
      recommendations.push('Use PowerShell for advanced scripting needs');
    } else {
      recommendations.push('Use shell scripts (.sh) for automation');
      recommendations.push('Use kill/killall for process management');
      recommendations.push('Use ls for directory listing');
      recommendations.push('Use cat for file reading');
      recommendations.push('Consider using sudo for elevated operations');
    }

    recommendations.push('Prefer MAK3R-HUB abstractions over direct commands');
    recommendations.push('Test commands in development environment first');
    recommendations.push('Use MCP service for command validation');

    return recommendations;
  }

  async validateProjectStructure(projectPath) {
    const validation = {
      path: projectPath,
      exists: fs.existsSync(projectPath),
      mak3r_managed: false,
      structure_valid: false,
      missing_components: [],
      recommendations: []
    };

    if (!validation.exists) {
      validation.missing_components.push('Project directory does not exist');
      return validation;
    }

    // Check for MAK3R-HUB structure
    const requiredPaths = [
      '.mak3r',
      '.mak3r/config.json',
      '.mak3r/claude-rules.json',
      'CLAUDE.md'
    ];

    for (const reqPath of requiredPaths) {
      const fullPath = path.join(projectPath, reqPath);
      if (!fs.existsSync(fullPath)) {
        validation.missing_components.push(reqPath);
      }
    }

    validation.mak3r_managed = validation.missing_components.length === 0;
    validation.structure_valid = validation.mak3r_managed;

    if (!validation.mak3r_managed) {
      validation.recommendations.push('Initialize project with: MAK3R-HUB create <project-name>');
      validation.recommendations.push('Or add MAK3R-HUB to existing project: MAK3R-HUB claude --init');
    }

    return validation;
  }
}

module.exports = OSValidator;