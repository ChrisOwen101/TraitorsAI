#!/bin/bash

# Traitors AI Docker Runner Script
# This script builds and runs the Traitors AI game in a Docker container

set -e  # Exit on any error

# Configuration
IMAGE_NAME="traitors-ai"
CONTAINER_NAME="traitors-ai-app"
PORT="${PORT:-3000}"
HOST_PORT="${HOST_PORT:-3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to stop and remove existing container
cleanup_existing() {
    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log_warn "Removing existing container: ${CONTAINER_NAME}"
        docker rm -f "${CONTAINER_NAME}" > /dev/null 2>&1
    fi
}

# Function to build Docker image
build_image() {
    log_info "Building Docker image: ${IMAGE_NAME}"
    docker build -t "${IMAGE_NAME}" .
    log_info "Build complete!"
}

# Function to run container
run_container() {
    log_info "Starting container: ${CONTAINER_NAME}"
    log_info "Mapping port ${HOST_PORT}:${PORT}"
    
    docker run -d \
        --name "${CONTAINER_NAME}" \
        -p "${HOST_PORT}:${PORT}" \
        -e PORT="${PORT}" \
        --restart unless-stopped \
        "${IMAGE_NAME}"
    
    log_info "Container started successfully!"
    log_info "Application available at: http://localhost:${HOST_PORT}"
}

# Function to show container logs
show_logs() {
    log_info "Container logs (press Ctrl+C to exit):"
    echo ""
    docker logs -f "${CONTAINER_NAME}"
}

# Main execution
main() {
    log_info "Traitors AI Docker Runner"
    echo ""
    
    # Check if Docker is available
    check_docker
    
    # Parse command line arguments
    BUILD_ONLY=false
    SKIP_BUILD=false
    SHOW_LOGS=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --build-only)
                BUILD_ONLY=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --logs)
                SHOW_LOGS=true
                shift
                ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  --build-only    Build the Docker image without running it"
                echo "  --skip-build    Run the container without rebuilding the image"
                echo "  --logs          Show container logs after starting"
                echo "  --help, -h      Show this help message"
                echo ""
                echo "Environment variables:"
                echo "  PORT            Container internal port (default: 3000)"
                echo "  HOST_PORT       Host port to expose (default: 3000)"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Build image if needed
    if [ "${SKIP_BUILD}" = false ]; then
        build_image
        
        if [ "${BUILD_ONLY}" = true ]; then
            log_info "Build-only mode. Exiting."
            exit 0
        fi
    fi
    
    # Clean up existing container
    cleanup_existing
    
    # Run container
    run_container
    
    # Show logs if requested
    if [ "${SHOW_LOGS}" = true ]; then
        sleep 2  # Give container time to start
        show_logs
    else
        echo ""
        log_info "To view logs, run: docker logs -f ${CONTAINER_NAME}"
        log_info "To stop the container, run: docker stop ${CONTAINER_NAME}"
    fi
}

# Run main function
main "$@"
