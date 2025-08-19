import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { BLEAGovernanceStack } from '../lib/blea-governance-stack';

describe('BLEAGovernanceStack', () => {
  let app: cdk.App;
  let stack: BLEAGovernanceStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new BLEAGovernanceStack(app, 'TestStack', {
      projectName: 'test-project',
      environment: 'test',
      enableGuardDuty: true,
      enableSecurityHub: true,
      enableConfig: true,
      enableCloudTrail: true,
    });
    template = Template.fromStack(stack);
  });

  test('Stack creates required outputs', () => {
    template.hasOutput('ProjectName', {
      Value: 'test-project',
    });

    template.hasOutput('Environment', {
      Value: 'test',
    });

    template.hasOutput('SecurityStackName', {
      Value: Match.anyValue(),
    });

    template.hasOutput('MonitoringStackName', {
      Value: Match.anyValue(),
    });
  });

  test('Stack has appropriate tags', () => {
    expect(stack.tags.tagValues()).toEqual(
      expect.objectContaining({
        Project: 'test-project',
        Environment: 'test',
        ManagedBy: 'BLEA-CDK',
      })
    );
  });

  test('Stack creates security and monitoring substacks', () => {
    expect(stack.securityStack).toBeDefined();
    expect(stack.monitoringStack).toBeDefined();
  });
});