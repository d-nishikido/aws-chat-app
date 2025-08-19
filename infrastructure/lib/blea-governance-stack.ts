import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BLEASecurityStack } from './security/blea-security-stack';
import { BLEAMonitoringStack } from './monitoring/blea-monitoring-stack';

export interface BLEAGovernanceStackProps extends cdk.StackProps {
  readonly projectName?: string;
  readonly environment?: string;
  readonly enableGuardDuty?: boolean;
  readonly enableSecurityHub?: boolean;
  readonly enableConfig?: boolean;
  readonly enableCloudTrail?: boolean;
}

export class BLEAGovernanceStack extends cdk.Stack {
  public readonly securityStack: BLEASecurityStack;
  public readonly monitoringStack: BLEAMonitoringStack;

  constructor(scope: Construct, id: string, props?: BLEAGovernanceStackProps) {
    super(scope, id, props);

    const projectName = props?.projectName ?? 'aws-chat-app';
    const environment = props?.environment ?? 'dev';

    cdk.Tags.of(this).add('Project', projectName);
    cdk.Tags.of(this).add('Environment', environment);
    cdk.Tags.of(this).add('ManagedBy', 'BLEA-CDK');

    this.securityStack = new BLEASecurityStack(this, 'BLEASecurity', {
      projectName,
      environment,
      enableGuardDuty: props?.enableGuardDuty ?? true,
      enableSecurityHub: props?.enableSecurityHub ?? true,
      enableConfig: props?.enableConfig ?? true,
      enableCloudTrail: props?.enableCloudTrail ?? true,
    });

    this.monitoringStack = new BLEAMonitoringStack(this, 'BLEAMonitoring', {
      projectName,
      environment,
      securityStack: this.securityStack,
    });

    new cdk.CfnOutput(this, 'ProjectName', {
      value: projectName,
      description: 'The name of the project',
    });

    new cdk.CfnOutput(this, 'Environment', {
      value: environment,
      description: 'The deployment environment',
    });

    new cdk.CfnOutput(this, 'SecurityStackName', {
      value: this.securityStack.node.id,
      description: 'The security stack identifier',
    });

    new cdk.CfnOutput(this, 'MonitoringStackName', {
      value: this.monitoringStack.node.id,
      description: 'The monitoring stack identifier',
    });
  }
}