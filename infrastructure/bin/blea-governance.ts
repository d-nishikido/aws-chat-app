#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BLEAGovernanceStack } from '../lib/blea-governance-stack';

const app = new cdk.App();

const projectName = app.node.tryGetContext('projectName') || 'aws-chat-app';
const environment = app.node.tryGetContext('environment') || 'dev';

const stackName = `BLEAGovernance-${projectName}-${environment}`;

new BLEAGovernanceStack(app, stackName, {
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

app.synth();