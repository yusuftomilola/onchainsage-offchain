# OnChain Sage - Backend API & Data Processing

<div align="center">

![OnChain Sage Logo](https://via.placeholder.com/300x100/000000/FFFFFF?text=OnChain+Sage)

**Decentralized Trading Intelligence Platform - Backend Services**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10+-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red.svg)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## 🎯 Overview

The OnChain Sage backend serves as the central nervous system for the decentralized trading intelligence platform, providing:

- **AI-Driven Market Analysis**: Real-time processing of market data and social sentiment
- **Multi-Chain Trading Intelligence**: Comprehensive analysis across multiple blockchain networks
- **Community Features**: Forum management and reputation system backend
- **External Data Integration**: Twitter/X, DEX Screener, Raydium, and other market data sources

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway Layer                          │
│           ┌─────────────────────────────┐                   │
│           │     NestJS Backend API      │                   │
│           │   (Authentication, Logic,   │                   │
│           │   Data Processing)          │                   │
│           └─────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Core Modules                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │   Trading    │ │     AI/ML    │ │   Data Ingestion     │ │
│  │   Signals    │ │  Processing  │ │   (External APIs)    │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Community    │ │     Auth     │ │   Notifications      │ │
│  │   Forum      │ │   & Users    │ │   & Alerts           │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                                │
│           ┌──────────────────────────────┐                  │
│           │   PostgreSQL + Redis Cache   │                  │
│           │   Message Queue (Bull)       │                  │
│           └──────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm/yarn
- **PostgreSQL** 15+
- **Redis** 7+
- **Git**

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/onchainsage-offchain.git
   cd onchainsage-offchain
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Configure your `.env` file with:
   ```env
   # Database
   DATABASE_URL=postgresql://username:password@localhost:5432/onchainsage_db
   REDIS_URL=redis://localhost:6379
   
   # API Keys
   TWITTER_API_KEY=your_twitter_api_key
   TWITTER_API_SECRET=your_twitter_api_secret
   DEX_SCREENER_API_KEY=your_dex_screener_api_key
   
   # StarkNet
   STARKNET_RPC_URL=https://starknet-mainnet.public.blastapi.io
   STARKNET_PRIVATE_KEY=your_private_key
   
   # JWT
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=24h
   
   # Application
   PORT=3000
   NODE_ENV=development
   ```

4. **Database Setup**
   ```bash
   # Run migrations
   npm run migration:run
   
   # Seed data (optional)
   npm run seed
   ```

5. **Start Development Server**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000`

## 📁 Project Structure

```
src/
├── modules/
│   ├── auth/                   # Authentication & wallet verification
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── guards/
│   │   └── strategies/
│   ├── trading/                # Trading signals & bot logic
│   │   ├── trading.controller.ts
│   │   ├── trading.service.ts
│   │   ├── signals/
│   │   └── bots/
│   ├── data-ingestion/         # External API integrations
│   │   ├── twitter/
│   │   ├── dex-screener/
│   │   ├── raydium/
│   │   └── processors/
│   ├── ai-processing/          # ML/AI analysis engines
│   │   ├── sentiment/
│   │   ├── pattern-recognition/
│   │   ├── risk-assessment/
│   │   └── signal-generation/
│   ├── community/              # Forum & social features
│   │   ├── forum/
│   │   ├── reputation/
│   │   └── badges/
│   └── notifications/          # Alert & notification system
│       ├── notifications.controller.ts
│       ├── notifications.service.ts
│       └── channels/
├── shared/
│   ├── dto/                    # Data transfer objects
│   ├── interfaces/             # Shared interfaces
│   ├── utils/                  # Utility functions
│   ├── constants/              # Application constants
│   └── decorators/             # Custom decorators
├── database/
│   ├── migrations/             # Database migrations
│   ├── seeds/                  # Seed data
│   └── entities/               # Database entities
├── config/                     # Configuration files
│   ├── database.config.ts
│   ├── redis.config.ts
│   └── app.config.ts
└── main.ts                     # Application entry point
```

## 🔧 Core Modules

### 🔐 Authentication Module
- **Wallet Integration**: StarkNet wallet signature verification
- **JWT Tokens**: Secure session management
- **Role-based Access**: User hierarchy and permissions

### 📊 Trading Module
- **Signal Generation**: AI-powered buy/sell recommendations
- **Bot Configurations**: Conservative, Moderate, Aggressive, Degen modes
- **Risk Assessment**: Multi-factor risk scoring system
- **Performance Tracking**: Signal accuracy and profitability metrics

### 📡 Data Ingestion Module
- **Twitter/X Integration**: Real-time narrative and sentiment analysis
- **DEX Screener API**: Price, volume, and market data
- **Raydium Integration**: Liquidity pools and trading metrics
- **On-chain Analytics**: Whale movements and holder analysis

### 🤖 AI Processing Module
- **Sentiment Analysis**: NLP processing of social media content
- **Pattern Recognition**: Technical analysis algorithms
- **Risk Scoring**: Multi-dimensional risk assessment
- **Signal Generation**: Automated trading recommendations

### 👥 Community Module
- **Forum Management**: Discussion threads and moderation
- **Reputation System**: Performance-based user rankings
- **Badge System**: Achievement and milestone tracking
- **Voting Mechanisms**: Community-driven decision making

### 🔔 Notifications Module
- **Real-time Alerts**: WebSocket-based notifications
- **Email Notifications**: Critical updates and reports
- **Push Notifications**: Mobile and browser notifications
- **Custom Channels**: User-defined notification preferences

## 🛠️ Available Scripts

```bash
# Development
npm run start:dev          # Start development server with hot reload
npm run start:debug        # Start with debug mode
npm run start:prod         # Start production server

# Building
npm run build              # Build the application
npm run build:webpack      # Build with webpack

# Testing
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:e2e           # Run end-to-end tests
npm run test:cov           # Run tests with coverage

# Database
npm run migration:generate # Generate new migration
npm run migration:run      # Run pending migrations
npm run migration:revert   # Revert last migration
npm run seed               # Seed database with initial data

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run format             # Format code with Prettier

# Documentation
npm run docs:generate      # Generate API documentation
npm run docs:serve         # Serve documentation locally
```

## 🔌 API Endpoints

### Authentication
```
POST   /auth/wallet-login     # Wallet signature authentication
POST   /auth/refresh          # Refresh JWT token
GET    /auth/profile          # Get user profile
```

### Trading
```
GET    /trading/signals       # Get trading signals
POST   /trading/signals       # Submit trading signal
GET    /trading/bots          # Get bot configurations
POST   /trading/bots          # Create/update bot config
GET    /trading/performance   # Get performance metrics
```

### Community
```
GET    /community/forum       # Get forum threads
POST   /community/forum       # Create new thread
GET    /community/reputation  # Get user rankings
POST   /community/vote        # Vote on content
```

### Data
```
GET    /data/market           # Get market data
GET    /data/sentiment        # Get sentiment analysis
GET    /data/narratives       # Get trending narratives
```

For detailed API documentation, visit `/api/docs` when running the server.

## 🐳 Docker Support

### Development with Docker Compose

```bash
# Start all services
docker-compose up -d

# Start specific services
docker-compose up -d postgres redis

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Build production image
docker build -t onchainsage-backend .

# Run container
docker run -p 3000:3000 --env-file .env onchainsage-backend
```

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:e2e

# Test coverage
npm run test:cov
```

### Test Structure
- **Unit Tests**: Individual module testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full application flow testing

## 🚀 Deployment

### Environment Variables

Ensure the following environment variables are set in production:

```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
REDIS_URL=your_production_redis_url
JWT_SECRET=your_secure_jwt_secret
TWITTER_API_KEY=your_twitter_api_key
# ... other API keys
```

### Deployment Options

1. **Docker**: Use provided Dockerfile and docker-compose
2. **PM2**: Process manager for Node.js applications
3. **Cloud Platforms**: AWS, GCP, Azure with container services
4. **Serverless**: AWS Lambda, Vercel Functions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Add tests for new functionality**
5. **Run the test suite**
   ```bash
   npm run test
   npm run lint
   ```
6. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
7. **Push to the branch**
   ```bash
   git push origin feature/amazing-feature
   ```
8. **Open a Pull Request**

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Code formatting
- **Conventional Commits**: Commit message format
- **Test Coverage**: Minimum 80% coverage required

## 📊 Monitoring & Logging

### Application Metrics
- **Performance**: Response times and throughput
- **Health Checks**: Database and external service status
- **Error Tracking**: Comprehensive error logging
- **Custom Metrics**: Trading signal accuracy, user activity

### Logging Strategy
- **Structured Logging**: JSON format for easy parsing
- **Log Levels**: Error, Warn, Info, Debug
- **Request Tracing**: Unique request IDs
- **Security Logging**: Authentication and authorization events

## 🔒 Security

### Security Measures
- **Input Validation**: All inputs validated and sanitized
- **Rate Limiting**: API rate limiting to prevent abuse
- **CORS**: Properly configured CORS policies
- **Helmet**: Security headers middleware
- **JWT Security**: Secure token handling and rotation

### Security Best Practices
- Regular dependency updates
- Security audits and penetration testing
- Secure API key management
- Database security and encryption

## 📚 Additional Resources

- **[Architecture Documentation](ARCHITECTURE.md)**: Detailed system architecture
- **[API Documentation](http://localhost:3000/api/docs)**: Interactive API docs
- **[Contributing Guidelines](CONTRIBUTING.md)**: How to contribute
- **[Deployment Guide](docs/deployment.md)**: Production deployment
- **[Frontend Repository](https://github.com/your-org/onchainsage-frontend)**: React/Next.js frontend
- **[Smart Contracts](https://github.com/your-org/onchainsage-onchain)**: Cairo smart contracts

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Discord**: [Join our community](https://discord.gg/onchainsage)
- **GitHub Issues**: [Report bugs or request features](https://github.com/your-org/onchainsage-offchain/issues)
- **Documentation**: [Read the docs](https://docs.onchainsage.com)
- **Email**: support@onchainsage.com

---

<div align="center">

**Built with ❤️ by the OnChain Sage Community**

[Website](https://onchainsage.com) • [Discord](https://discord.gg/onchainsage) • [Twitter](https://twitter.com/onchainsage)

</div> 