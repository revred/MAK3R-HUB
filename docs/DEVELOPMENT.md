# 🛠️ MAK3R-HUB Development Guide

## 🎯 Development Setup

### **Prerequisites**
- **Node.js** 16+ (for NPM package development)
- **.NET 9.0** (for C# automation engine)
- **Git** (for version control)
- **Windows/macOS/Linux** (cross-platform support)

### **Environment Setup**
```bash
# Clone to tools folder for seeded development
cd C:\code\ConvertStar\tools\MAK3R-HUB

# Install Node.js dependencies
npm install

# Build C# automation engine (Windows)
dotnet build src-csharp/MAK3R.Core/
dotnet build src-csharp/MAK3R.WebFrameworks/

# Run tests
npm test
```

## 🏗️ Architecture Overview

### **Dual-Layer Architecture**
```
NPM Package (JavaScript)           C# Automation Engine
├── CLI Interface                  ├── Platform Abstraction
├── Project Orchestration         ├── Website Automation  
├── Template Management            ├── Deployment Management
└── Claude Code Integration        └── Cross-Platform Operations
```

### **Development Workflow**
1. **NPM Layer**: Handles user interaction, project orchestration, template management
2. **C# Engine**: Handles heavy automation, file operations, deployment, process management
3. **Integration**: NPM calls C# executable for automation tasks
4. **Templates**: Embedded templates for website types and Claude Code optimization

## 📋 Development Tasks

### **Core Engine Development**
```bash
# C# development and testing
cd src-csharp/MAK3R.Core
dotnet watch run                    # Hot reload during development
dotnet test                         # Run C# unit tests

# NPM package development
cd ../../
npm run dev                         # Test CLI interface
npm run build:csharp               # Build C# components
npm run test                        # Run JavaScript tests
```

### **Template Development**
- **Location**: `lib/templates/`
- **Types**: Website types (landing-page, ecommerce, portfolio, blog, saas)
- **Frameworks**: Framework-specific implementations (React, Vue, Svelte, Angular)
- **Claude Optimization**: AI-friendly documentation and structure

### **Testing Strategy**
```bash
# Unit testing
npm run test:unit                   # JavaScript unit tests
dotnet test src-csharp/             # C# unit tests

# Integration testing  
npm run test:integration            # End-to-end workflow tests
npm run test:deployment            # Deployment pipeline tests

# Manual testing
npm run dev create MyTestSite --type landing-page
cd MyTestSite && npm run dev       # Test generated project
```

## 🎯 Claude Code Integration Development

### **Optimization Patterns**
1. **AI-Friendly Structure**: Clear folder organization with README files
2. **Context Documentation**: Comprehensive CLAUDE.md files
3. **Component Documentation**: Each component includes AI hints
4. **Workflow Integration**: Pre-defined workflows for common tasks

### **Template Variables**
```javascript
// Used in template generation
{
  PROJECT_NAME: "MyWebsite",
  WEBSITE_TYPE: "landing-page", 
  FRAMEWORK: "vue-nuxt",
  CLAUDE_WORKFLOWS: [...],
  OPTIMIZATION_HINTS: "...",
  DEPLOYMENT_CONFIG: {...}
}
```

## 🚀 Deployment Development

### **Platform Support**
- **Vercel**: Next.js/Nuxt optimization, automatic SSL
- **Netlify**: Static site generation, form handling
- **AWS**: (Future) S3 + CloudFront deployment
- **Azure**: (Future) Static Web Apps deployment

### **Deployment Testing**
```bash
# Test deployment automation locally
MAK3R-HUB create test-deploy --type landing-page
cd test-deploy
MAK3R-HUB deploy --platform vercel --dry-run

# Test with actual deployment (use test project)
MAK3R-HUB deploy --platform netlify
```

## 🔧 Build & Distribution

### **Local Build Process**
```bash
# Complete build pipeline
npm run build                       # Full build (NPM + C#)
npm run build:csharp               # C# automation engine only
npm run build:package              # NPM package only

# Cross-platform builds (future)
npm run build:windows              # Windows-specific build
npm run build:macos                # macOS-specific build  
npm run build:linux                # Linux-specific build
```

### **Package Structure**
```
MAK3R-HUB-1.0.0.tgz
├── bin/mak3r-hub.js               # CLI entry point
├── lib/                           # JavaScript modules
├── src-csharp/                    # C# source (for local builds)
├── templates/                     # Website templates
├── examples/                      # Complete examples
├── docs/                          # Documentation
└── package.json                   # NPM configuration
```

## 🧪 Testing Framework

### **Test Structure**
```
tests/
├── unit/
│   ├── claude-integration.test.js    # Claude Code optimization tests
│   ├── website-creation.test.js      # Website generation tests  
│   └── deployment.test.js            # Deployment automation tests
├── integration/
│   ├── complete-workflow.test.js     # End-to-end testing
│   ├── cross-platform.test.js       # Platform compatibility tests
│   └── performance.test.js          # Speed and efficiency tests
└── fixtures/
    ├── sample-projects/              # Test project examples
    └── expected-outputs/             # Expected test results
```

### **Testing Commands**
```bash
# Run all tests
npm test

# Specific test categories  
npm run test:unit                   # Unit tests only
npm run test:integration           # Integration tests only
npm run test:performance           # Performance benchmarks

# Test coverage
npm run test:coverage              # Generate coverage reports
```

## 📊 Performance Optimization

### **Target Metrics**
- **Website Creation**: < 30 seconds for any project type
- **Development Server Start**: < 10 seconds for any framework
- **Deployment Time**: < 2 minutes to live URL
- **Package Size**: < 50MB total distribution
- **Memory Usage**: < 200MB during operation

### **Optimization Strategies**
1. **Template Caching**: Pre-compile templates for faster generation
2. **Parallel Operations**: Concurrent file operations and downloads
3. **Smart Detection**: Cache framework and dependency detection
4. **Minimal Dependencies**: Only essential NPM packages
5. **C# Optimization**: Single-file deployment with trimming

## 🔍 Debugging & Troubleshooting

### **Debug Mode**
```bash
# Enable verbose logging
DEBUG=MAK3R-HUB:* MAK3R-HUB create MyDebugSite --verbose

# C# debugging
dotnet run --configuration Debug src-csharp/MAK3R.Core/

# Test specific components
npm run test:debug claude-integration
```

### **Common Issues**
1. **Port Conflicts**: Use `MAK3R-HUB doctor` to check system health
2. **Permission Errors**: Ensure proper file system permissions
3. **Network Issues**: Check internet connection for template downloads
4. **Framework Compatibility**: Verify Node.js and framework versions

## 🎯 Release Process

### **Version Management**
```bash
# Prepare release
npm version patch                   # Increment version
npm run build                       # Full build
npm test                           # Validate all tests

# Package validation
npm pack                           # Create distribution package
npm run test:package               # Test packaged version

# Release (future - when extracted to standalone repo)
npm publish                        # Publish to NPM registry
git tag v1.0.0                    # Tag release
git push --tags                    # Push tags
```

### **Quality Gates**
- ✅ All tests passing (unit + integration)
- ✅ Performance benchmarks met
- ✅ Cross-platform compatibility validated
- ✅ Documentation up to date
- ✅ Claude Code integration working

## 🤝 Contributing Guidelines

### **Development Standards**
- **Code Style**: ESLint + Prettier for JavaScript, standard C# conventions
- **Testing**: Minimum 80% test coverage
- **Documentation**: Update docs with all feature changes
- **Claude Integration**: All new features must include AI optimization

### **Pull Request Process**
1. Create feature branch from `main`
2. Implement feature with tests
3. Update documentation
4. Validate Claude Code integration
5. Submit PR with clear description

---

**🎯 Goal**: Build the ultimate Claude Code force multiplier for website development with 10x speed improvements and seamless AI integration.