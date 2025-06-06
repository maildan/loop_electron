# Loop Typing Master - Electron Edition

A comprehensive typing analysis application built with Electron, featuring real-time performance monitoring, GPU acceleration, and intelligent data synchronization.

## 🚀 Features

### Core Features
- **Real-time Typing Analysis**: Live WPM, accuracy, and performance metrics
- **GPU Acceleration**: High-performance processing using Rust native modules
- **Dual Database System**: SQLite for local storage, MongoDB Atlas for cloud sync
- **Cross-platform Support**: Windows, macOS, and Linux
- **Modern UI**: Built with Next.js 15, TypeScript, and Tailwind CSS

### Advanced Features
- **IME Keyboard Monitoring**: Comprehensive keyboard event handling with permissions
- **Performance Optimization**: Memory management and system monitoring
- **Real-time Synchronization**: Offline-first with cloud sync capabilities
- **Comprehensive Analytics**: Detailed typing statistics and progress tracking
- **Auto-updater**: Seamless application updates
- **Global Shortcuts**: System-wide hotkey support

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15 with React 18
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS with custom animations
- **UI Components**: Radix UI with custom theming
- **Charts**: Chart.js and Recharts for data visualization

### Backend
- **Runtime**: Electron 35+ with secure architecture
- **Database**: SQLite (better-sqlite3) + MongoDB Atlas
- **Native Modules**: Rust with GPU acceleration (WGPU)
- **Memory Management**: jemalloc optimization
- **IPC**: Secure context-isolated communication

### Development
- **Build System**: Webpack 5 + Next.js
- **Package Manager**: npm
- **Testing**: Jest + Playwright for E2E
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode

## 📦 Installation

### Prerequisites
- **Node.js**: 18.0.0 or higher
- **npm**: 8.0.0 or higher
- **Rust**: 1.70.0 or higher (for native modules)
- **Git**: For version control

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/loop-team/loop-typing-electron.git
   cd loop-typing-electron
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Build native modules**
   ```bash
   npm run build:native
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Build Scripts

We provide a comprehensive build script for all development needs:

```bash
# Install dependencies and build native modules
./scripts/build.sh install

# Start development server
./scripts/build.sh dev

# Build for production
./scripts/build.sh build

# Run tests
./scripts/build.sh test

# Package for distribution
./scripts/build.sh package [win|mac|linux|all]

# Complete pipeline (clean, install, test, build, package)
./scripts/build.sh full [platform]

# Clean build artifacts
./scripts/build.sh clean
```

## 🔄 Cache Management & Troubleshooting

### Cache Management
```bash
# Clean Next.js and Electron build caches (preserves node_modules)
npm run clean:cache

# Full cleanup (Next.js, Electron, and node_modules caches)
npm run clean:all

# Rebuild native modules for Electron
npm run rebuild:native
```

### Common Issues and Solutions

#### "global is not defined" Error
This error occurs when global object references are not properly polyfilled in the renderer process.
```bash
# Fix with clean rebuild
npm run dev:clean
```

#### Electron DevTools Issues
If you encounter issues with DevTools or console warnings:
1. Toggle DevTools with keyboard shortcut: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)
2. Use the provided filter settings to suppress common warnings

#### Native Module Errors
If you see errors related to native modules:
```bash
# Rebuild native modules for your Electron version
npm run rebuild
```

#### Next.js Cache Issues
```bash
# Clear Next.js cache while preserving compilation cache
npm run dev:clean
```

## 🏗️ Architecture

### Project Structure
```
loop_3_electron/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts          # Main entry point
│   │   ├── database/        # Database managers
│   │   └── ime/             # Keyboard monitoring
│   ├── preload/             # Secure preload scripts
│   ├── renderer/            # Next.js frontend
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   ├── pages/           # Next.js pages
│   │   └── styles/          # CSS and Tailwind
│   └── shared/              # Shared utilities
├── native/                  # Rust native modules
│   ├── src/
│   │   ├── lib.rs          # Main Rust library
│   │   ├── gpu_acceleration.rs
│   │   ├── memory_optimization.rs
│   │   └── system_monitoring.rs
│   └── Cargo.toml
├── tests/                   # Test suites
│   ├── main/               # Main process tests
│   ├── e2e/                # End-to-end tests
│   └── setup.ts           # Test configuration
├── scripts/                # Build and deployment scripts
└── assets/                 # Icons and resources
```

### Security Architecture
- **Context Isolation**: Enabled by default
- **Node Integration**: Disabled in renderer
- **Secure IPC**: Whitelisted channels only
- **Content Security Policy**: Strict CSP headers
- **Process Isolation**: Separate main and renderer processes

## 🧪 Testing

### Unit Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
```

### End-to-End Tests
```bash
npm run test:e2e           # Run E2E tests
npm run test:e2e:ui        # Run with UI mode
```

### Type Checking
```bash
npm run typecheck          # Check all TypeScript
npm run typecheck:main     # Check main process only
npm run typecheck:renderer # Check renderer only
```

## 📊 Database Schema

### SQLite Tables
- **typing_logs**: Individual keystroke sessions
- **typing_stats**: Daily aggregated statistics
- **user_settings**: Application preferences

### MongoDB Collections
- **users**: User profiles and preferences
- **sessions**: Typing session data
- **analytics**: Performance analytics
- **sync_queue**: Offline synchronization queue

## 🎨 Customization

### Themes
The application supports light and dark themes with custom CSS variables:

```css
:root {
  --primary: 210 40% 98%;
  --background: 0 0% 100%;
  /* ... more variables */
}

.dark {
  --primary: 222.2 84% 4.9%;
  --background: 222.2 84% 4.9%;
  /* ... dark theme variables */
}
```

### Configuration
Environment variables in `.env.local`:

```env
# Database
DATABASE_URL="file:./dev.db"
MONGODB_URI="mongodb://localhost:27017/loop-typing"

# Performance
ENABLE_GPU_ACCELERATION=true
MEMORY_OPTIMIZATION=true

# Features
ENABLE_GLOBAL_SHORTCUTS=true
SYNC_INTERVAL=30000
```

## 🚀 Deployment

### Development Build
```bash
npm run build              # Build for development
npm run start              # Run production build locally
```

### Production Packaging
```bash
npm run package            # Package for current platform
npm run package:win        # Windows installer
npm run package:mac        # macOS DMG and ZIP
npm run package:linux      # Linux AppImage, DEB, RPM
```

### Auto-updater Setup
1. Configure update server in `electron-builder.json`
2. Set up GitHub releases or custom update server
3. Configure signing certificates for production

## 🔧 Troubleshooting

### Common Issues

**Native modules compilation errors:**
```bash
npm run rebuild            # Rebuild native modules
npm install --rebuild      # Force rebuild all modules
```

**TypeScript compilation errors:**
```bash
npm run typecheck          # Check types
npm run build:main         # Build main process only
```

**Database connection issues:**
```bash
# Check SQLite database
npx prisma studio

# Test MongoDB connection
npm run db:test
```

### Performance Optimization

**Memory usage:**
- Enable memory optimization in settings
- Monitor system resources in the app
- Use the built-in performance profiler

**GPU acceleration:**
- Ensure compatible graphics drivers
- Check GPU acceleration status in settings
- Monitor GPU usage during typing tests

## 📖 Development Guidelines

### Code Style
- Follow TypeScript strict mode
- Use functional components with hooks
- Implement proper error boundaries
- Add comprehensive type definitions

### Testing Strategy
- Unit tests for core logic
- Integration tests for database operations
- E2E tests for user workflows
- Performance tests for critical paths

### Git Workflow
```bash
git checkout -b feature/new-feature
# Make changes
git commit -m "feat: add new typing test mode"
git push origin feature/new-feature
# Create pull request
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

### Development Setup
```bash
# Fork and clone your fork
git clone https://github.com/YOUR_USERNAME/loop-typing-electron.git
cd loop-typing-electron

# Add upstream remote
git remote add upstream https://github.com/loop-team/loop-typing-electron.git

# Install dependencies
npm install

# Start development
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Electron team for the excellent framework
- Next.js team for the React framework
- Rust community for the high-performance native modules
- All contributors and testers

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/loop-team/loop-typing-electron/issues)
- **Discussions**: [GitHub Discussions](https://github.com/loop-team/loop-typing-electron/discussions)
- **Email**: support@loop-typing.com

---

**Note**: This application is under active development. Please report any issues or feature requests through GitHub issues.
# loop_electron
