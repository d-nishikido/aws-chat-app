# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AWS-based chat application project currently in the design and planning phase. The project emphasizes enterprise-grade security through BLEA (Baseline Environment on AWS) integration and uses a CDK-unified approach for infrastructure as code.

## Architecture

### High-Level Design
- **Frontend**: React 18 + TypeScript with Material-UI/Tailwind
- **Backend**: Serverless architecture using AWS Lambda (Python 3.11), API Gateway, and AppSync
- **Database**: Aurora PostgreSQL Serverless v2 with encryption and audit logging
- **Real-time**: AppSync Subscriptions for real-time messaging
- **Security**: BLEA integration for enterprise security controls
- **Infrastructure**: AWS CDK (TypeScript) for unified infrastructure as code

### Key Components
- **BLEA Governance**: Automatic security controls (CloudTrail, Config, Security Hub, GuardDuty)
- **VPC Design**: Multi-tier subnet architecture with security groups and NACLs
- **Authentication**: Amazon Cognito with MFA support
- **File Handling**: S3 with presigned URLs and virus scanning
- **Monitoring**: CloudWatch integration with BLEA security monitoring

### Security Features (BLEA Integration)
- **Multi-layer Defense**: Edge (WAF), API (Cognito), Network (Security Groups), Data (KMS), Identity (IAM)
- **Audit Logging**: Complete audit trail for compliance
- **Threat Detection**: GuardDuty integration with automatic response
- **Config Monitoring**: Automated compliance checking
- **Secret Management**: AWS Secrets Manager integration

## Development Setup

### Prerequisites
Since this is currently a documentation-only project, no build tools are configured yet. Based on the design documents, the intended setup will include:

```bash
# When implemented, these commands will be used:
npm install          # Install dependencies
npm run dev         # Start development server
npm run build       # Build for production
npm run test        # Run tests
npm run lint        # Lint code
npm run typecheck   # TypeScript type checking
```

### CDK Commands (When Implemented)
```bash
npx cdk bootstrap   # Bootstrap CDK environment
npx cdk deploy      # Deploy infrastructure
npx cdk diff        # Show differences
npx cdk destroy     # Destroy infrastructure
```

## Project Structure (Planned)

```
aws-chat-app/
├── docs/                              # Current: Design documents
│   ├── aws_chat_app_overview_design.md # System overview and BLEA integration
│   ├── aws_chat_app_design.md         # Detailed technical design
│   ├── aws_chat_app_api_spec.md       # REST and GraphQL API specifications
│   └── aws_chat_app_roadmap.md        # 3-month implementation roadmap
├── frontend/                          # Planned: React application
├── backend/                           # Planned: Lambda functions
├── infrastructure/                    # Planned: CDK stacks
└── tests/                            # Planned: Test suites
```

## API Architecture

### REST API Endpoints
- `/api/v1/auth/*` - Authentication and authorization
- `/api/v1/users/*` - User management
- `/api/v1/rooms/*` - Chat room management
- `/api/v1/rooms/{roomId}/messages/*` - Message operations
- `/api/v1/security/*` - BLEA security event management
- `/api/v1/upload/*` - File upload with presigned URLs

### GraphQL Schema
- **Queries**: Users, rooms, messages, security events, audit logs
- **Mutations**: Create/update operations with security logging
- **Subscriptions**: Real-time message updates, security alerts

### BLEA Security Integration
- Security event tracking and remediation
- Audit log management with compliance context
- Security Hub findings integration
- Automated compliance reporting

## Development Guidelines

### BLEA Security Requirements
- All data must be encrypted at rest and in transit
- Implement least privilege access patterns
- Enable comprehensive audit logging
- Follow AWS Well-Architected security pillar
- Integrate with BLEA governance controls

### CDK Best Practices
- Use TypeScript for type safety
- Implement proper stack organization
- Follow BLEA-compliant resource tagging
- Include security and monitoring constructs
- Implement proper cross-stack references

### Testing Strategy
- Unit tests for Lambda functions
- Integration tests for API endpoints
- Security testing for BLEA compliance
- Performance testing for real-time features

## MCP Server Integration

The project is designed to leverage MCP (Model Context Protocol) servers for development efficiency:
- **AWS Docs MCP**: Access to latest AWS documentation and best practices
- **AWS CDK MCP**: CDK construct assistance and code generation
- **Filesystem MCP**: Project file management and code quality

## Implementation Phases

### Phase 1: BLEA Foundation (Month 1)
- BLEA governance base setup
- VPC and security infrastructure
- Basic Lambda and API Gateway

### Phase 2: Core Features (Month 2)
- Real-time messaging with AppSync
- File upload and security scanning
- Automated monitoring and alerting

### Phase 3: Production Ready (Month 3)
- CI/CD pipeline with security scanning
- Production environment deployment
- Comprehensive monitoring and operations

## Cost Considerations

### Development Environment
- Monthly cost: ~$29 (BLEA: $12, App: $17)
- Focus on cost optimization with Serverless v2 and appropriate sizing

### Production Environment
- Monthly cost: ~$603 (BLEA: $45, App: $558)
- Includes enterprise security controls and high availability

## Learning Objectives

This project serves as a comprehensive learning platform for:
- **Enterprise AWS Architecture**: BLEA integration and Well-Architected principles
- **Serverless Development**: Lambda, API Gateway, AppSync, and DynamoDB
- **Infrastructure as Code**: CDK with TypeScript
- **Security Best Practices**: Multi-layer defense and compliance automation
- **Real-time Applications**: WebSocket and GraphQL subscriptions
- **DevOps Integration**: CI/CD with security scanning and automated deployment

## Current Status

⚠️ **Note**: This project is currently in the design phase. All code implementation is planned based on the comprehensive design documents. The documentation provides detailed specifications for a production-ready, enterprise-grade chat application with BLEA security integration.

When beginning implementation, start with the BLEA governance base setup following the roadmap in `docs/aws_chat_app_roadmap.md`.