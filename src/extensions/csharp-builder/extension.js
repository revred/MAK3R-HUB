/**
 * C# Builder Extension for MAK3R-HUB
 * Provides comprehensive .NET development automation
 */

const { MCPExtension } = require('../../core/extension-base')
const { execSync } = require('child_process')
const fs = require('fs-extra')
const path = require('path')

class CSharpBuilderExtension extends MCPExtension {
  constructor() {
    super()
    
    // Extension metadata
    this.name = 'csharp-builder'
    this.version = '1.0.0'
    this.description = 'C# Builder extension for MAK3R-HUB - provides comprehensive .NET development automation'
    this.author = 'MAK3R Team'
    
    // Extension-specific properties
    this.platform = process.platform
    this.dotnetPath = null
    this.msbuildPath = null
    this.initialized = false
  }

  async initialize() {
    console.log(`🔨 C# Builder extension initializing...`)
    
    try {
      // Verify .NET SDK
      const dotnetVersion = execSync('dotnet --version', { encoding: 'utf8' }).trim()
      this.dotnetPath = 'dotnet'
      
      // Find MSBuild (optional)
      this.msbuildPath = await this.findMSBuild()
      
      this.initialized = true
      
      // Register tools
      this.tools = this.getToolDefinitions().map(toolDef => ({
        name: toolDef.name,
        description: toolDef.description,
        inputSchema: toolDef.inputSchema,
        handler: async (args) => await this.executeTool(toolDef.name, args)
      }))
      
      console.log(`✅ C# Builder extension ready (.NET ${dotnetVersion})`)
      return true
      
    } catch (error) {
      console.error(`❌ C# Builder extension initialization failed:`, error)
      return false
    }
  }

  async executeTool(toolName, args = {}) {
    try {
      switch (toolName) {
        case 'm3r__csharp__initialize':
          return await this.initializeToolchain()
          
        case 'm3r__csharp__get_templates':
          return await this.getProjectTemplates()
          
        case 'm3r__csharp__create_project':
          return await this.createProject(args)
          
        case 'm3r__csharp__create_solution':
          return await this.createSolution(args)
          
        case 'm3r__csharp__add_project_to_solution':
          return await this.addProjectToSolution(args)
          
        case 'm3r__csharp__build_project':
          return await this.buildProject(args)
          
        case 'm3r__csharp__publish_project':
          return await this.publishProject(args)
          
        case 'm3r__csharp__clean_project':
          return await this.cleanProject(args)
          
        case 'm3r__csharp__add_nuget_package':
          return await this.addNuGetPackage(args)
          
        case 'm3r__csharp__remove_nuget_package':
          return await this.removeNuGetPackage(args)
          
        case 'm3r__csharp__restore_packages':
          return await this.restorePackages(args)
          
        case 'm3r__csharp__run_tests':
          return await this.runTests(args)
          
        case 'm3r__csharp__code_analysis':
          return await this.runCodeAnalysis(args)

        default:
          throw new Error(`Unknown tool: ${toolName}`)
      }
    } catch (error) {
      this.logger?.error(`C# Builder tool execution failed`, { toolName, error: error.message })
      throw error
    }
  }

  getToolDefinitions() {
    return [
      {
        name: 'm3r__csharp__initialize',
        description: 'Initialize and verify C# toolchain',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'm3r__csharp__get_templates',
        description: 'Get available C# project templates',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'm3r__csharp__create_project',
        description: 'Create new C# project with optimizations',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Project name' },
            type: { type: 'string', description: 'Project type', enum: ['console', 'classlib', 'webapi', 'blazorserver', 'blazorwasm', 'winforms', 'wpf'], default: 'console' },
            framework: { type: 'string', description: 'Target framework', default: 'net9.0' },
            outputPath: { type: 'string', description: 'Output directory', default: '.' },
            additionalPackages: { type: 'array', items: { type: 'object' }, description: 'Additional NuGet packages to install' }
          },
          required: ['name']
        }
      },
      {
        name: 'm3r__csharp__create_solution',
        description: 'Create new solution file',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Solution name' },
            outputPath: { type: 'string', description: 'Output directory', default: '.' }
          },
          required: ['name']
        }
      },
      {
        name: 'm3r__csharp__add_project_to_solution',
        description: 'Add project to existing solution',
        inputSchema: {
          type: 'object',
          properties: {
            solutionPath: { type: 'string', description: 'Path to solution file' },
            projectPath: { type: 'string', description: 'Path to project file' }
          },
          required: ['solutionPath', 'projectPath']
        }
      },
      {
        name: 'm3r__csharp__build_project',
        description: 'Build C# project with configuration options',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to project or solution' },
            configuration: { type: 'string', description: 'Build configuration', enum: ['Debug', 'Release'], default: 'Release' },
            runtime: { type: 'string', description: 'Target runtime', enum: ['win-x64', 'win-x86', 'linux-x64', 'osx-x64'] },
            selfContained: { type: 'boolean', description: 'Self-contained deployment', default: false }
          },
          required: ['projectPath']
        }
      },
      {
        name: 'm3r__csharp__publish_project',
        description: 'Publish C# project for deployment',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to project' },
            configuration: { type: 'string', description: 'Build configuration', default: 'Release' },
            runtime: { type: 'string', description: 'Target runtime', default: 'win-x64' },
            selfContained: { type: 'boolean', description: 'Self-contained deployment', default: true },
            singleFile: { type: 'boolean', description: 'Single file deployment', default: true },
            trimmed: { type: 'boolean', description: 'Enable trimming', default: true },
            outputPath: { type: 'string', description: 'Output directory' }
          },
          required: ['projectPath']
        }
      },
      {
        name: 'm3r__csharp__clean_project',
        description: 'Clean project build artifacts',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to project or solution' },
            configuration: { type: 'string', description: 'Configuration to clean', enum: ['Debug', 'Release', 'All'], default: 'All' }
          },
          required: ['projectPath']
        }
      },
      {
        name: 'm3r__csharp__add_nuget_package',
        description: 'Add NuGet package to project',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to project' },
            packageName: { type: 'string', description: 'Package name' },
            version: { type: 'string', description: 'Package version (optional)' }
          },
          required: ['projectPath', 'packageName']
        }
      },
      {
        name: 'm3r__csharp__remove_nuget_package',
        description: 'Remove NuGet package from project',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to project' },
            packageName: { type: 'string', description: 'Package name to remove' }
          },
          required: ['projectPath', 'packageName']
        }
      },
      {
        name: 'm3r__csharp__restore_packages',
        description: 'Restore NuGet packages',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to project or solution' }
          },
          required: ['projectPath']
        }
      },
      {
        name: 'm3r__csharp__run_tests',
        description: 'Run project tests with reporting',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to test project' },
            filter: { type: 'string', description: 'Test filter expression' },
            verbosity: { type: 'string', description: 'Test output verbosity', enum: ['quiet', 'minimal', 'normal', 'detailed'], default: 'normal' }
          },
          required: ['projectPath']
        }
      },
      {
        name: 'm3r__csharp__code_analysis',
        description: 'Run static code analysis',
        inputSchema: {
          type: 'object',
          properties: {
            projectPath: { type: 'string', description: 'Path to project or solution' },
            analysisType: { type: 'string', description: 'Analysis type', enum: ['security', 'quality', 'performance', 'all'], default: 'all' }
          },
          required: ['projectPath']
        }
      }
    ]
  }

  // Implementation methods
  async initializeToolchain() {
    if (this.initialized) {
      return {
        success: true,
        dotnet: execSync('dotnet --version', { encoding: 'utf8' }).trim(),
        msbuild: this.msbuildPath ? 'Found' : 'Using dotnet build',
        status: 'already_initialized'
      }
    }

    try {
      const dotnetVersion = execSync('dotnet --version', { encoding: 'utf8' }).trim()
      this.dotnetPath = 'dotnet'
      this.msbuildPath = await this.findMSBuild()
      this.initialized = true

      return {
        success: true,
        dotnet: dotnetVersion,
        msbuild: this.msbuildPath ? 'Found' : 'Using dotnet build',
        status: 'initialized'
      }
    } catch (error) {
      return {
        success: false,
        error: 'C# toolchain not available',
        suggestion: 'Install .NET SDK from https://dotnet.microsoft.com/download'
      }
    }
  }

  async getProjectTemplates() {
    try {
      const templates = execSync('dotnet new list', { encoding: 'utf8' })
      const lines = templates.split('\n').slice(2) // Skip header
      const templateList = []

      for (const line of lines) {
        if (line.trim()) {
          const parts = line.split(/\s{2,}/)
          if (parts.length >= 3) {
            templateList.push({
              name: parts[0].trim(),
              shortName: parts[1].trim(),
              language: parts[2].trim()
            })
          }
        }
      }

      return {
        success: true,
        templates: templateList.filter(t => t.language.includes('C#'))
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async createProject(options) {
    const {
      name,
      type = 'console',
      framework = 'net9.0',
      outputPath = '.',
      additionalPackages = []
    } = options

    try {
      const projectPath = path.join(outputPath, name)

      // Create project
      execSync(`dotnet new ${type} -n ${name} -f ${framework} -o "${projectPath}"`, {
        stdio: 'inherit'
      })

      // Add additional packages
      if (additionalPackages.length > 0) {
        for (const pkg of additionalPackages) {
          await this.addNuGetPackage({
            projectPath,
            packageName: pkg.name,
            version: pkg.version
          })
        }
      }

      // Optimize project file
      await this.optimizeProjectFile(projectPath, name, type)

      return {
        success: true,
        projectPath,
        message: `C# ${type} project created successfully`,
        nextSteps: [
          `cd ${projectPath}`,
          'dotnet restore',
          'dotnet build',
          'dotnet run'
        ]
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async createSolution(options) {
    const { name, outputPath = '.' } = options

    try {
      const solutionPath = path.join(outputPath, `${name}.sln`)
      execSync(`dotnet new sln -n ${name} -o "${outputPath}"`, { stdio: 'inherit' })

      return {
        success: true,
        solutionPath,
        message: `Solution ${name} created successfully`
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async addProjectToSolution(options) {
    const { solutionPath, projectPath } = options

    try {
      execSync(`dotnet sln "${solutionPath}" add "${projectPath}"`, { stdio: 'inherit' })
      
      return {
        success: true,
        message: 'Project added to solution successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async buildProject(options) {
    const {
      projectPath,
      configuration = 'Release',
      runtime = null,
      selfContained = false
    } = options

    try {
      let buildCommand = `dotnet build "${projectPath}" -c ${configuration}`

      if (runtime) {
        buildCommand += ` -r ${runtime}`
        if (selfContained) buildCommand += ' --self-contained'
      }

      const result = execSync(buildCommand, { encoding: 'utf8' })

      return {
        success: true,
        configuration,
        runtime: runtime || 'framework-dependent',
        output: result,
        outputPath: path.join(projectPath, 'bin', configuration, runtime || 'net9.0')
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
        suggestion: 'Check for compilation errors in the project'
      }
    }
  }

  async publishProject(options) {
    const {
      projectPath,
      configuration = 'Release',
      runtime = 'win-x64',
      selfContained = true,
      singleFile = true,
      trimmed = true,
      outputPath = null
    } = options

    try {
      let publishCommand = `dotnet publish "${projectPath}" -c ${configuration} -r ${runtime}`

      if (selfContained) publishCommand += ' --self-contained'
      if (singleFile) publishCommand += ' -p:PublishSingleFile=true'
      if (trimmed) publishCommand += ' -p:PublishTrimmed=true'
      if (outputPath) publishCommand += ` -o "${outputPath}"`

      const result = execSync(publishCommand, { encoding: 'utf8' })

      const finalOutputPath = outputPath || 
        path.join(projectPath, 'bin', configuration, runtime, 'publish')

      return {
        success: true,
        configuration,
        runtime,
        features: { selfContained, singleFile, trimmed },
        outputPath: finalOutputPath,
        message: 'Project published successfully'
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async cleanProject(options) {
    const { projectPath, configuration = 'All' } = options

    try {
      let cleanCommand = `dotnet clean "${projectPath}"`
      if (configuration !== 'All') {
        cleanCommand += ` -c ${configuration}`
      }

      const result = execSync(cleanCommand, { encoding: 'utf8' })

      return {
        success: true,
        message: `Project cleaned successfully (${configuration})`,
        output: result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async addNuGetPackage(options) {
    const { projectPath, packageName, version = '' } = options

    try {
      let command = `dotnet add "${projectPath}" package ${packageName}`
      if (version) command += ` --version ${version}`

      execSync(command, { stdio: 'inherit' })

      return {
        success: true,
        package: packageName,
        version: version || 'latest',
        message: `Package ${packageName} added successfully`
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async removeNuGetPackage(options) {
    const { projectPath, packageName } = options

    try {
      execSync(`dotnet remove "${projectPath}" package ${packageName}`, { stdio: 'inherit' })

      return {
        success: true,
        package: packageName,
        message: `Package ${packageName} removed successfully`
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async restorePackages(options) {
    const { projectPath } = options

    try {
      const result = execSync(`dotnet restore "${projectPath}"`, { encoding: 'utf8' })

      return {
        success: true,
        message: 'Packages restored successfully',
        output: result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async runTests(options) {
    const { projectPath, filter = '', verbosity = 'normal' } = options

    try {
      let testCommand = `dotnet test "${projectPath}" --verbosity ${verbosity}`
      if (filter) testCommand += ` --filter "${filter}"`

      const result = execSync(testCommand, { encoding: 'utf8' })

      // Parse test results
      const passedMatch = result.match(/Passed:\s+(\d+)/)
      const failedMatch = result.match(/Failed:\s+(\d+)/)
      const skippedMatch = result.match(/Skipped:\s+(\d+)/)

      return {
        success: !failedMatch || failedMatch[1] === '0',
        passed: passedMatch ? parseInt(passedMatch[1]) : 0,
        failed: failedMatch ? parseInt(failedMatch[1]) : 0,
        skipped: skippedMatch ? parseInt(skippedMatch[1]) : 0,
        output: result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async runCodeAnalysis(options) {
    const { projectPath, analysisType = 'all' } = options

    try {
      // Use dotnet build with additional analysis flags
      let analysisCommand = `dotnet build "${projectPath}" --verbosity normal`
      
      // Add analysis-specific flags based on type
      switch (analysisType) {
        case 'security':
          analysisCommand += ' -p:RunAnalyzersDuringBuild=true -p:EnableNETAnalyzers=true'
          break
        case 'quality':
          analysisCommand += ' -p:TreatWarningsAsErrors=true'
          break
        case 'all':
          analysisCommand += ' -p:RunAnalyzersDuringBuild=true -p:EnableNETAnalyzers=true'
          break
      }

      const result = execSync(analysisCommand, { encoding: 'utf8' })

      return {
        success: true,
        analysisType,
        message: 'Code analysis completed successfully',
        output: result
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  // Helper methods
  async findMSBuild() {
    const possiblePaths = [
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Community\\MSBuild\\Current\\Bin\\MSBuild.exe',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Professional\\MSBuild\\Current\\Bin\\MSBuild.exe',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\Enterprise\\MSBuild\\Current\\Bin\\MSBuild.exe',
      'C:\\Program Files\\Microsoft Visual Studio\\2022\\BuildTools\\MSBuild\\Current\\Bin\\MSBuild.exe'
    ]

    for (const msbuildPath of possiblePaths) {
      try {
        await fs.access(msbuildPath)
        return msbuildPath
      } catch {
        continue
      }
    }

    return null
  }

  async optimizeProjectFile(projectPath, projectName, projectType) {
    const csprojPath = path.join(projectPath, `${projectName}.csproj`)

    try {
      let csprojContent = await fs.readFile(csprojPath, 'utf8')

      // Add MAK3R-HUB optimizations
      const optimizations = `
  <!-- MAK3R-HUB Optimizations -->
  <PropertyGroup Condition="'$(Configuration)' == 'Release'">
    <DebugType>none</DebugType>
    <DebugSymbols>false</DebugSymbols>
    <PublishSingleFile>true</PublishSingleFile>
    <SelfContained>true</SelfContained>
    <PublishTrimmed>true</PublishTrimmed>
    <TrimMode>link</TrimMode>
    <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>
  </PropertyGroup>`

      // Insert before closing </Project> tag
      csprojContent = csprojContent.replace('</Project>', `${optimizations}\n</Project>`)

      await fs.writeFile(csprojPath, csprojContent, 'utf8')
    } catch (error) {
      console.warn('Could not optimize project file:', error.message)
    }
  }

  async cleanup() {
    this.initialized = false
    this.dotnetPath = null
    this.msbuildPath = null
  }

  async healthCheck() {
    try {
      if (!this.initialized) {
        return { status: 'unhealthy', error: 'Not initialized', timestamp: new Date().toISOString() }
      }

      execSync('dotnet --version', { stdio: 'ignore' })
      
      return { 
        status: 'healthy', 
        dotnet: this.dotnetPath,
        msbuild: this.msbuildPath ? 'available' : 'using dotnet',
        timestamp: new Date().toISOString() 
      }
    } catch (error) {
      return { 
        status: 'unhealthy', 
        error: error.message, 
        timestamp: new Date().toISOString() 
      }
    }
  }
}

module.exports = CSharpBuilderExtension