# OnChain Sage - System Architecture & Development Guide

## 🎯 Project Overview

**OnChain Sage** is a decentralized trading intelligence platform that combines AI-driven market analysis, community insights, and multi-chain trading capabilities with a reputation-based forum system.

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Trading Bot   │  │ Community Forum │  │ Dashboard &  │ │
│  │   Interface     │  │   & Rankings    │  │ Analytics    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
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
│                Smart Contract Layer                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  User Profiles  │  │ Reputation &    │  │ Payment &    │ │
│  │  & Subscriptions│  │ Badge System    │  │ Gas Fees     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                External Data Layer                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │ Twitter/X API   │  │  DEX Screener   │  │  Raydium &   │ │
│  │   (Narratives)  │  │   (Pricing)     │  │  Other DEXs  │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Technical Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **State Management**: Zustand/Redux Toolkit
- **Web3 Integration**: Starknet.js, get-starknet
- **Charts**: TradingView Lightweight Charts
- **UI Components**: shadcn/ui or custom component library

### Backend (Off-chain)
- **Framework**: NestJS (Node.js)
- **Database**: PostgreSQL + Redis (caching)
- **Message Queue**: Bull Queue (Redis-based)
- **Authentication**: JWT + Wallet signature verification
- **WebSocket**: Socket.io for real-time updates
- **APIs**: Twitter API v2, DEX Screener API, Raydium API

### Smart Contracts (On-chain)
- **Framework**: Dojo (StarkNet)
- **Language**: Cairo
- **Network**: StarkNet Mainnet/Testnet
- **Storage**: On-chain for critical data, IPFS for metadata

### Infrastructure
- **Cloud**: AWS/GCP
- **CDN**: Cloudflare
- **Monitoring**: DataDog/Grafana
- **CI/CD**: GitHub Actions

## 📊 Data Flow Architecture

### 1. Market Intelligence Pipeline
```
External APIs → Data Ingestion Service → AI Processing Engine → 
Risk Assessment → Signal Generation → User Notification
```

### 2. Community Reputation System
```
User Actions → Performance Tracking → On-chain Reputation Update → 
Badge Assignment → Access Level Adjustment
```

## 🎯 Core Components Breakdown

### A. Trading Intelligence Bot

#### Data Sources Integration
- **Twitter/X Scraping**: Narrative analysis using NLP
- **DEX Screener**: Real-time pricing and volume data
- **Raydium/Jupiter**: Liquidity and trading metrics
- **On-chain Analytics**: Whale movements, holder analysis

#### AI/ML Components
- **Sentiment Analysis**: Process social media narratives
- **Pattern Recognition**: Technical analysis algorithms
- **Risk Scoring**: Multi-factor risk assessment
- **Signal Generation**: Buy/sell recommendations

#### Bot Modes
1. **Conservative**: Low-risk, established tokens
2. **Moderate**: Balanced risk/reward
3. **Aggressive**: High-risk, high-reward opportunities
4. **Degen**: Maximum risk, meme coin focus

### B. Community Forum System

#### Reputation Mechanics (On-chain)
```cairo
// Example Cairo contract structure
#[starknet::contract]
mod ReputationSystem {
    struct User {
        wallet_address: felt252,
        reputation_score: u256,
        badges: Array<Badge>,
        performance_history: Array<Trade>,
        call_accuracy: u8,
        total_calls: u32,
    }
    
    struct Badge {
        badge_type: BadgeType,
        earned_at: u64,
        criteria_met: felt252,
    }
}
```

#### Hierarchy System
- **Sage** (90%+ accuracy, 100+ calls)
- **Expert** (80%+ accuracy, 50+ calls)
- **Trader** (70%+ accuracy, 25+ calls)
- **Apprentice** (60%+ accuracy, 10+ calls)
- **Novice** (Default level)

### C. Payment & Subscription System

#### STRK Token Integration
- **Gas Fees**: Paid in STRK for extended bot usage
- **Premium Tiers**: Monthly subscriptions in STRK
- **Community Rewards**: STRK rewards for top performers

## 🚀 Development Phases & GitHub Issues Structure

### Phase 1: Foundation (Weeks 1-4)
**Epic: Project Setup & Core Infrastructure**

#### Repository-Specific Issues:

**onchainsage-onchain Issues:**
1. **Project Setup & Configuration**
   - Initialize Dojo project structure
   - Configure Scarb.toml and build system
   - Set up testing framework
   - Create deployment scripts

2. **Core Smart Contracts**
   - User profile contract implementation
   - Basic reputation system contract
   - Payment handling contract (STRK integration)
   - Access control system

**onchainsage-offchain Issues:**
1. **NestJS Backend Foundation**
   - Project initialization and configuration
   - Database setup (PostgreSQL + Redis)
   - Authentication module with wallet verification
   - Basic API structure and middleware

2. **External API Integrations**
   - Twitter/X API service setup
   - DEX Screener API integration
   - Raydium API integration
   - Data ingestion pipeline foundation

**onchainsage-frontend Issues:**
1. **Next.js Application Setup**
   - Project initialization with App Router
   - Tailwind CSS and UI component setup
   - Web3 wallet integration (StarkNet)
   - Basic routing and layout structure

2. **Core UI Components**
   - Authentication components
   - Dashboard layout
   - Trading interface mockups
   - Community forum basic structure

## 🔄 Inter-Repository Communication & Coordination

### Shared Standards & Interfaces

#### API Contracts
```typescript
// Shared type definitions across repositories
export interface User {
  walletAddress: string;
  reputationScore: number;
  badges: Badge[];
  subscriptionTier: SubscriptionTier;
}

export interface TradingSignal {
  id: string;
  token: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  riskLevel: RiskLevel;
  timestamp: number;
}
```

#### Repository Dependencies
- **Frontend** → **Offchain**: REST API calls, WebSocket connections
- **Offchain** → **Onchain**: Smart contract interactions via StarkNet.js
- **Frontend** → **Onchain**: Direct wallet interactions for payments

### Cross-Repository Coordination

#### Version Management
- Semantic versioning across all repositories
- API versioning for backward compatibility
- Coordinated releases using GitHub releases

#### Testing Strategy
- **Unit Tests**: Each repository maintains its own
- **Integration Tests**: Shared testing scenarios
- **E2E Tests**: Full application flow testing

### Documentation Coordination

#### Central Documentation Hub
Create a fourth repository: `onchainsage-docs` for:
- Overall architecture documentation
- API specifications (OpenAPI/Swagger)
- Development guidelines
- User guides and tutorials

#### Repository-Specific Documentation
Each repo maintains its own:
- Setup and installation guides
- Contributing guidelines
- Technical documentation

### Phase 3: Community Features (Weeks 9-12)
**Epic: Forum & Reputation System**

#### Issues Breakdown:
1. **Community Forum Frontend**
   - Discussion threads
   - User profiles
   - Real-time updates

2. **Reputation Tracking**
   - Performance calculation
   - Badge system implementation
   - Hierarchy management

3. **Trading Call System**
   - Call submission interface
   - Voting mechanism
   - Performance tracking

### Phase 4: Integration & Polish (Weeks 13-16)
**Epic: System Integration & Launch Preparation**

#### Issues Breakdown:
1. **Multi-chain Integration**
   - Additional chain support
   - Cross-chain trading
   - Unified wallet experience

2. **Advanced Analytics**
   - Portfolio tracking
   - Performance analytics
   - Risk management tools

3. **Mobile Optimization**
   - Responsive design
   - PWA implementation
   - Mobile-specific features

## 📋 Multi-Repository Structure

### Repository 1: `onchainsage-onchain`
**Smart Contracts & Blockchain Logic**
```
onchainsage-onchain/
├── src/
│   ├── contracts/
│   │   ├── user_profile.cairo       # User management
│   │   ├── reputation_system.cairo  # Badge & ranking system
│   │   ├── payment_handler.cairo    # STRK payments & subscriptions
│   │   └── governance.cairo         # Community governance
│   ├── models/
│   │   ├── user.cairo              # User data models
│   │   ├── reputation.cairo        # Reputation data models
│   │   └── payment.cairo           # Payment data models
│   └── systems/
│       ├── reputation_system.cairo # Reputation calculation logic
│       ├── badge_system.cairo      # Badge assignment logic
│       └── subscription_system.cairo # Subscription management
├── scripts/
│   ├── deploy.sh                   # Deployment scripts
│   ├── migrate.sh                  # Migration scripts
│   └── seed.sh                     # Seed data scripts
├── tests/
│   ├── unit/                       # Unit tests
│   └── integration/                # Integration tests
├── docs/
│   ├── contracts/                  # Contract documentation
│   └── deployment/                 # Deployment guides
├── Scarb.toml                      # Dojo configuration
└── .github/
    ├── workflows/                  # CI/CD for contracts
    └── ISSUE_TEMPLATE/
```

### Repository 2: `onchainsage-offchain`
**Backend API & Data Processing**
```
onchainsage-offchain/
├── src/
│   ├── modules/
│   │   ├── auth/                   # Authentication & wallet verification
│   │   ├── trading/                # Trading signals & bot logic
│   │   ├── data-ingestion/         # External API integrations
│   │   ├── ai-processing/          # ML/AI analysis engines
│   │   ├── community/              # Forum & social features
│   │   └── notifications/          # Alert & notification system
│   ├── shared/
│   │   ├── dto/                    # Data transfer objects
│   │   ├── interfaces/             # Shared interfaces
│   │   ├── utils/                  # Utility functions
│   │   └── constants/              # Application constants
│   ├── database/
│   │   ├── migrations/             # Database migrations
│   │   ├── seeds/                  # Seed data
│   │   └── entities/               # Database entities
│   └── config/                     # Configuration files
├── scripts/
│   ├── data-migration/             # Data migration scripts
│   └── deployment/                 # Deployment scripts
├── tests/
│   ├── unit/                       # Unit tests
│   ├── integration/                # Integration tests
│   └── e2e/                        # End-to-end tests
├── docs/
│   ├── api/                        # API documentation
│   └── deployment/                 # Deployment guides
├── docker/                         # Docker configurations
├── package.json
└── .github/
    ├── workflows/                  # CI/CD for backend
    └── ISSUE_TEMPLATE/
```

### Repository 3: `onchainsage-frontend`
**User Interface & Web Application**
```
onchainsage-frontend/
├── src/
│   ├── app/                        # Next.js app directory
│   │   ├── (dashboard)/            # Dashboard routes
│   │   ├── (trading)/              # Trading interface routes
│   │   ├── (community)/            # Community forum routes
│   │   └── (profile)/              # User profile routes
│   ├── components/
│   │   ├── ui/                     # Reusable UI components
│   │   ├── trading/                # Trading-specific components
│   │   ├── community/              # Community-specific components
│   │   └── layout/                 # Layout components
│   ├── hooks/                      # Custom React hooks
│   ├── lib/
│   │   ├── web3/                   # Web3 integration utilities
│   │   ├── api/                    # API client functions
│   │   ├── utils/                  # Utility functions
│   │   └── constants/              # Application constants
│   ├── stores/                     # State management
│   ├── styles/                     # Global styles
│   └── types/                      # TypeScript type definitions
├── public/                         # Static assets
├── docs/                          # Frontend documentation
├── tests/
│   ├── components/                # Component tests
│   └── e2e/                       # End-to-end tests
├── package.json
└── .github/
    ├── workflows/                 # CI/CD for frontend
    └── ISSUE_TEMPLATE/
```

## 🏷️ GitHub Labels & Project Management

### Repository-Specific Labels:

#### onchainsage-onchain
- **Type**: `contract`, `deployment`, `security`, `testing`
- **Component**: `user-profile`, `reputation`, `payment`, `governance`
- **Network**: `mainnet`, `testnet`, `devnet`

#### onchainsage-offchain  
- **Type**: `api`, `database`, `ml-processing`, `integration`
- **Component**: `auth`, `trading`, `data-ingestion`, `ai-engine`
- **Service**: `twitter`, `dex-screener`, `raydium`

#### onchainsage-frontend
- **Type**: `component`, `page`, `styling`, `web3-integration`
- **Component**: `dashboard`, `trading`, `community`, `profile`
- **Platform**: `desktop`, `mobile`, `tablet`

### Universal Labels (All Repos):
- **Priority**: `critical`, `high`, `medium`, `low`
- **Difficulty**: `beginner`, `intermediate`, `advanced`
- **Status**: `ready-for-dev`, `in-progress`, `review-needed`
- **Community**: `good-first-issue`, `help-wanted`, `bounty`

### Cross-Repository Project Boards:
1. **Master Roadmap**: High-level milestones across all repos
2. **Integration Tasks**: Issues requiring coordination between repos
3. **Community Contributions**: Track open-source contributions
4. **Release Planning**: Coordinate releases across repositories

## 🤝 Community Contribution Strategy

### Onboarding Process:
1. **Good First Issues**: Label beginner-friendly tasks
2. **Documentation**: Comprehensive setup guides
3. **Code Review**: Establish review process
4. **Bounty System**: Reward significant contributions

### Contribution Types:
- **Core Development**: Smart contracts, backend, frontend
- **Data Science**: AI/ML algorithms, data analysis
- **UI/UX**: Design and user experience
- **Documentation**: Technical writing and guides
- **Testing**: Quality assurance and testing

## 🔒 Security Considerations

### Smart Contract Security:
- **Audit Requirements**: All contracts must be audited
- **Access Control**: Role-based permissions
- **Upgrade Patterns**: Secure upgrade mechanisms
- **Testing**: Comprehensive test coverage

### Data Security:
- **API Key Management**: Secure key storage
- **User Privacy**: Data encryption and privacy
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Sanitize all inputs

## 📈 Success Metrics & KPIs

### Technical Metrics:
- **Signal Accuracy**: >75% profitable signals
- **System Uptime**: >99.5% availability
- **Response Time**: <2s API response time
- **User Growth**: 1000+ active users in 6 months

### Community Metrics:
- **Contributors**: 50+ active contributors
- **Code Quality**: >80% test coverage
- **User Engagement**: Average session >15 minutes
- **Reputation System**: Active participation >60%

## 🛣️ Getting Started Guide

### For Contributors:
1. **Fork the repository**
2. **Set up development environment**
3. **Choose an issue from "good first issues"**
4. **Follow contribution guidelines**
5. **Submit pull request**

### For Users:
1. **Connect wallet (StarkNet compatible)**
2. **Choose bot configuration**
3. **Join community forum**
4. **Start following signals**
5. **Build reputation through performance**

## 🔮 Future Enhancements

### Advanced Features:
- **AI-Powered Portfolio Management**
- **Cross-chain Arbitrage Detection**
- **Advanced Risk Management Tools**
- **Integration with Traditional Finance**
- **Mobile Application**
- **API for Third-party Developers**

This architecture provides a solid foundation for building OnChain Sage as a community-driven, open-source project while maintaining the technical sophistication needed for a professional trading platform.