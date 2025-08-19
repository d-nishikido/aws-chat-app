import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { BLEAVPCStack } from '../../lib/network/vpc-stack';

describe('BLEAVPCStack', () => {
  let app: cdk.App;
  let stack: BLEAVPCStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new BLEAVPCStack(app, 'TestVPCStack', {
      projectName: 'test-project',
      environment: 'test',
    });
    template = Template.fromStack(stack);
  });

  test('VPC is created with correct CIDR and configuration', () => {
    template.hasResourceProperties('AWS::EC2::VPC', {
      CidrBlock: '10.0.0.0/16',
      EnableDnsHostnames: true,
      EnableDnsSupport: true,
    });
  });

  test('Subnets are created with correct configuration', () => {
    // Public subnets
    template.hasResourceProperties('AWS::EC2::Subnet', 
      Match.objectLike({
        CidrBlock: Match.anyValue(),
        MapPublicIpOnLaunch: true,
      })
    );

    // Private subnets
    template.hasResourceProperties('AWS::EC2::Subnet', 
      Match.objectLike({
        CidrBlock: Match.anyValue(),
        MapPublicIpOnLaunch: false,
      })
    );
  });

  test('Internet Gateway is created', () => {
    template.hasResourceProperties('AWS::EC2::InternetGateway', {});
  });

  test('NAT Gateways are created', () => {
    template.hasResourceProperties('AWS::EC2::NatGateway', {});
  });

  test('Security groups are created with correct configuration', () => {
    // Lambda Security Group
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Lambda functions',
    });

    // RDS Security Group
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for RDS Aurora',
    });

    // ALB Security Group
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for Application Load Balancer',
    });

    // API Gateway Security Group
    template.hasResourceProperties('AWS::EC2::SecurityGroup', {
      GroupDescription: 'Security group for API Gateway VPC Endpoint',
    });
  });

  test('Security group rules are configured correctly', () => {
    // Check that we have security group ingress rules created
    const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress');
    const ingressRuleCount = Object.keys(ingressRules).length;
    
    // We should have security group ingress rules created
    expect(ingressRuleCount).toBeGreaterThan(0);

    // Check that security groups exist and have the expected properties
    const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
    const sgCount = Object.keys(securityGroups).length;
    
    // Should have 4 security groups: Lambda, RDS, ALB, API Gateway
    expect(sgCount).toBe(4);

    // At least verify one specific rule exists - RDS access from Lambda
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', 
      Match.objectLike({
        IpProtocol: 'tcp',
        FromPort: 5432,
        ToPort: 5432,
        Description: 'Allow Lambda to access RDS PostgreSQL',
      })
    );
  });

  test('VPC Flow Logs are enabled', () => {
    template.hasResourceProperties('AWS::EC2::FlowLog', {
      ResourceType: 'VPC',
      TrafficType: 'ALL',
      LogDestinationType: 'cloud-watch-logs',
    });
  });

  test('CloudWatch Log Group is created for Flow Logs', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/vpc/flowlogs/test-project-test',
      RetentionInDays: 30,
    });
  });

  test('BLEA-compliant tags are applied', () => {
    const resources = template.findResources('AWS::EC2::VPC');
    const vpcLogicalId = Object.keys(resources)[0];
    const vpcResource = resources[vpcLogicalId];

    expect(vpcResource.Properties?.Tags).toEqual(
      expect.arrayContaining([
        { Key: 'Project', Value: 'test-project' },
        { Key: 'Environment', Value: 'test' },
        { Key: 'ManagedBy', Value: 'BLEA-CDK' },
        { Key: 'Purpose', Value: 'Network and Security Infrastructure' },
        { Key: 'Component', Value: 'VPC' },
        { Key: 'BLEA-Compliant', Value: 'true' },
      ])
    );
  });

  test('VPC has the correct number of availability zones', () => {
    // Should create subnets in 2 AZs
    const subnets = template.findResources('AWS::EC2::Subnet');
    const subnetCount = Object.keys(subnets).length;
    
    // 2 AZs * 3 subnet types = 6 subnets
    expect(subnetCount).toBe(6);
  });

  test('getSubnetByTypeAndAz method works correctly', () => {
    // Test that the method exists and can be called
    expect(() => {
      stack.getSubnetByTypeAndAz('public', 0);
    }).not.toThrow();

    expect(() => {
      stack.getSubnetByTypeAndAz('private', 0);
    }).not.toThrow();

    expect(() => {
      stack.getSubnetByTypeAndAz('isolated', 0);
    }).not.toThrow();

    // Test invalid subnet type throws error
    expect(() => {
      stack.getSubnetByTypeAndAz('invalid', 0);
    }).toThrow('Invalid subnet type: invalid');
  });

  test('createVPCEndpoints method can be called without errors', () => {
    // Test that the method exists and can be called
    expect(() => {
      stack.createVPCEndpoints();
    }).not.toThrow();
    
    // The method should be callable - actual endpoint creation testing
    // would require more complex setup with actual AWS resources
  });

  test('Stack can be synthesized without errors', () => {
    expect(() => {
      app.synth();
    }).not.toThrow();
  });
});