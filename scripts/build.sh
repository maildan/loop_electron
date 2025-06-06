#!/bin/bash

# Loop Electron Build Script
# Comprehensive build pipeline for development and production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js and npm are installed
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    if ! command -v cargo &> /dev/null; then
        log_warning "Rust/Cargo is not installed. Native modules will be skipped."
        SKIP_RUST=true
    fi
    
    log_success "Prerequisites check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing Node.js dependencies..."
    npm install
    
    if [[ "$SKIP_RUST" != "true" ]]; then
        log_info "Building Rust native modules..."
        cd native
        cargo build --release
        cd ..
        log_success "Rust modules built successfully"
    fi
    
    log_success "Dependencies installed successfully"
}

# Build TypeScript
build_typescript() {
    log_info "Building TypeScript..."
    
    # Build main process
    log_info "Building main process..."
    npx webpack --config webpack.config.js --mode=production
    
    # Build renderer process
    log_info "Building renderer process..."
    npm run build:renderer
    
    log_success "TypeScript build completed"
}

# Build for development
build_dev() {
    log_info "Building for development..."
    
    # Build main process in dev mode
    npx webpack --config webpack.config.js --mode=development
    
    # Build renderer in dev mode
    npm run build:renderer:dev
    
    log_success "Development build completed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    if [ -f "jest.config.js" ]; then
        npm test
        log_success "Tests passed"
    else
        log_warning "No test configuration found, skipping tests"
    fi
}

# Package application
package_app() {
    log_info "Packaging application..."
    
    # Build first
    build_typescript
    
    # Package with electron-builder
    case "$1" in
        "win")
            log_info "Packaging for Windows..."
            npm run dist:win
            ;;
        "mac")
            log_info "Packaging for macOS..."
            npm run dist:mac
            ;;
        "linux")
            log_info "Packaging for Linux..."
            npm run dist:linux
            ;;
        "all")
            log_info "Packaging for all platforms..."
            npm run dist
            ;;
        *)
            log_info "Packaging for current platform..."
            npm run dist:current
            ;;
    esac
    
    log_success "Application packaged successfully"
}

# Clean build artifacts
clean() {
    log_info "Cleaning build artifacts..."
    
    rm -rf dist/
    rm -rf build/
    rm -rf out/
    rm -rf .next/
    
    if [[ "$SKIP_RUST" != "true" ]]; then
        cd native
        cargo clean
        cd ..
    fi
    
    log_success "Clean completed"
}

# Development server
dev_server() {
    log_info "Starting development server..."
    
    # Build main process in watch mode
    npx webpack --config webpack.config.js --mode=development --watch &
    WEBPACK_PID=$!
    
    # Start Next.js dev server
    npm run dev:renderer &
    NEXTJS_PID=$!
    
    # Wait a bit for builds to complete
    sleep 3
    
    # Start Electron
    npm run electron:dev
    
    # Cleanup on exit
    trap "kill $WEBPACK_PID $NEXTJS_PID 2>/dev/null" EXIT
}

# Main script logic
main() {
    case "$1" in
        "install")
            check_prerequisites
            install_dependencies
            ;;
        "build")
            check_prerequisites
            build_typescript
            ;;
        "build:dev")
            check_prerequisites
            build_dev
            ;;
        "test")
            check_prerequisites
            run_tests
            ;;
        "package")
            check_prerequisites
            package_app "$2"
            ;;
        "clean")
            clean
            ;;
        "dev")
            check_prerequisites
            dev_server
            ;;
        "full")
            check_prerequisites
            clean
            install_dependencies
            run_tests
            build_typescript
            package_app "$2"
            ;;
        *)
            echo "Usage: $0 {install|build|build:dev|test|package [win|mac|linux|all]|clean|dev|full [platform]}"
            echo ""
            echo "Commands:"
            echo "  install     - Install all dependencies"
            echo "  build       - Build for production"
            echo "  build:dev   - Build for development"
            echo "  test        - Run tests"
            echo "  package     - Package application for distribution"
            echo "  clean       - Clean build artifacts"
            echo "  dev         - Start development server"
            echo "  full        - Complete build pipeline (clean, install, test, build, package)"
            echo ""
            echo "Platform options for package:"
            echo "  win         - Windows only"
            echo "  mac         - macOS only"
            echo "  linux       - Linux only"
            echo "  all         - All platforms"
            echo "  (default)   - Current platform only"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
