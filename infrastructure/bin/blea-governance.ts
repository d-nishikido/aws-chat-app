#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BLEAGovernanceStack } from '../lib/blea-governance-stack';
import { BLEAVPCStack } from '../lib/network/vpc-stack';

const app = new cdk.App();

const projectName = app.node.tryGetContext('projectName') || 'aws-chat-app';
const environment = app.node.tryGetContext('environment') || 'dev';

const stackName = `BLEAGovernance-${projectName}-${environment}`;

// BLEA Governance Stack (Security and Compliance)
const governanceStack = new BLEAGovernanceStack(app, stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  projectName,
  environment,
  enableGuardDuty: true,
  enableSecurityHub: true,
  enableConfig: true,
  enableCloudTrail: true,
  description: `BLEA Governance Stack for ${projectName} ${environment} environment`,
  tags: {
    Project: projectName,
    Environment: environment,
    ManagedBy: 'BLEA-CDK',
    Purpose: 'Security and Compliance',
  },
});

// BLEA VPC Stack (Network Infrastructure)
const vpcStackName = `BLEAVPC-${projectName}-${environment}`;
const vpcStack = new BLEAVPCStack(app, vpcStackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  projectName,
  environment,
  description: `BLEA VPC Stack for ${projectName} ${environment} environment`,
  tags: {
    Project: projectName,
    Environment: environment,
    ManagedBy: 'BLEA-CDK',
    Purpose: 'Network and Security Infrastructure',
  },
});

// Ensure VPC stack depends on governance stack for proper order
vpcStack.addDependency(governanceStack);

app.synth();