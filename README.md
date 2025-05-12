# Eurobot 2025 Robot Web UI

This repository contains the Web UI for the Eurobot 2025 robot. The interface is designed to help teams monitor robot status, visualize sensor data, and adjust strategies in real time during development and competition.

## Project Purpose

- **Monitor robot status:** View live system health, battery, device connectivity, and more.
- **Visualize data:** See 3D models, playmat, and sensor feedback for better situational awareness.
- **Change strategies:** Quickly adjust robot strategies and parameters through an intuitive interface.
- **Modern tech stack:** Built with React, Vite, Tailwind CSS, and Bun for fast development and deployment.

## Features

- Real-time dashboard for robot system and device status
- Interactive playmat and 3D model visualization
- Strategy and parameter adjustment panels
- Responsive design for desktop and tablet
- Easy deployment with Docker (see below)

---

## Docker Usage

This section explains how to use Docker with this project for both development and production environments.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Development Environment

The development setup uses Dockerfile.dev and docker-compose.dev.yml for a development-optimized environment with hot-reloading.

#### Starting the Development Environment

```bash
# Build and start the containers
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose -f docker-compose.dev.yml logs -f app-dev

# Stop the environment
docker-compose -f docker-compose.dev.yml down
```

The development server will be available at http://localhost:5173.

This configuration:

- Mounts local source code directories into the container
- Enables hot-reloading for changes
- Uses Bun for faster development cycles

### Production Environment

The production setup uses the main Dockerfile and docker-compose.yml for an optimized, production-ready build.

#### Building and Deploying to Production

```bash
# Build and start the containers
docker-compose up -d --build

# View logs
docker-compose logs -f app

# Stop the production environment
docker-compose down
```

The production server will be available at http://localhost:3000.

This configuration:

- Creates an optimized production build
- Minimizes container size by using multi-stage builds
- Implements health checks for container monitoring

### Docker File Structure

- `Dockerfile` - Production build
- `Dockerfile.dev` - Development environment
- `docker-compose.yml` - Production orchestration
- `docker-compose.dev.yml` - Development orchestration
- `.dockerignore` - Excludes unnecessary files from builds

### Customization

#### Environment Variables

Add environment variables in the `environment` section of the docker-compose files:

```yaml
environment:
  - NODE_ENV=production
  - API_URL=https://your-api-url.com
```

#### Ports

Change the exposed ports in the docker-compose files:

```yaml
ports:
  - "8080:3000" # Map host port 8080 to container port 3000
```
