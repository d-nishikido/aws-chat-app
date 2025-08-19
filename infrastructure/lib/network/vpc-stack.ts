import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface BLEAVPCStackProps extends cdk.StackProps {
  readonly projectName: string;
  readonly environment: string;
}

/**
 * BLEA-compliant VPC Stack for the AWS Chat Application
 * Implements multi-tier subnet architecture with security groups and NACLs
 */
export class BLEAVPCStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;
  public readonly securityGroups: { [key: string]: ec2.SecurityGroup };
  public readonly flowLogGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: BLEAVPCStackProps) {
    super(scope, id, props);

    // Create VPC Flow Log Group first
    this.flowLogGroup = new logs.LogGroup(this, 'VPCFlowLogGroup', {
      logGroupName: `/aws/vpc/flowlogs/${props.projectName}-${props.environment}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // BLEA準拠VPC
    this.vpc = new ec2.Vpc(this, 'ChatAppVPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      enableDnsHostnames: true,
      enableDnsSupport: true,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private', 
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'Isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        }
      ],
      flowLogs: {
        'VPCFlowLog': {
          destination: ec2.FlowLogDestination.toCloudWatchLogs(this.flowLogGroup),
          trafficType: ec2.FlowLogTrafficType.ALL,
        }
      }
    });

    // BLEA セキュリティグループ
    this.securityGroups = this.createBLEASecurityGroups();

    // Add BLEA-compliant tags
    this.addBLEATags(props);
  }

  private createBLEASecurityGroups(): { [key: string]: ec2.SecurityGroup } {
    // Lambda用セキュリティグループ
    const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // RDS用セキュリティグループ
    const rdsSg = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for RDS Aurora',
      allowAllOutbound: false,
    });

    // ALB用セキュリティグループ
    const albSg = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Application Load Balancer',
      allowAllOutbound: true,
    });

    // API Gateway VPC Endpoint用セキュリティグループ
    const apiGatewaySg = new ec2.SecurityGroup(this, 'ApiGatewaySecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for API Gateway VPC Endpoint',
      allowAllOutbound: false,
    });

    // セキュリティグループ間の通信許可
    // RDS: Lambda からの PostgreSQL 通信を許可
    rdsSg.addIngressRule(
      lambdaSg, 
      ec2.Port.tcp(5432), 
      'Allow Lambda to access RDS PostgreSQL'
    );

    // Lambda: ALB からの HTTP/HTTPS 通信を許可
    lambdaSg.addIngressRule(
      albSg, 
      ec2.Port.tcp(80), 
      'Allow ALB to access Lambda HTTP'
    );
    lambdaSg.addIngressRule(
      albSg, 
      ec2.Port.tcp(443), 
      'Allow ALB to access Lambda HTTPS'
    );

    // ALB: インターネットからの HTTP/HTTPS 通信を許可
    albSg.addIngressRule(
      ec2.Peer.anyIpv4(), 
      ec2.Port.tcp(80), 
      'Allow HTTP traffic from internet'
    );
    albSg.addIngressRule(
      ec2.Peer.anyIpv4(), 
      ec2.Port.tcp(443), 
      'Allow HTTPS traffic from internet'
    );

    // API Gateway VPC Endpoint: Lambda からの HTTPS 通信を許可
    apiGatewaySg.addIngressRule(
      lambdaSg, 
      ec2.Port.tcp(443), 
      'Allow Lambda to access API Gateway VPC Endpoint'
    );

    return {
      lambda: lambdaSg,
      rds: rdsSg,
      alb: albSg,
      apiGateway: apiGatewaySg,
    };
  }

  private addBLEATags(props: BLEAVPCStackProps): void {
    const tags = {
      Project: props.projectName,
      Environment: props.environment,
      ManagedBy: 'BLEA-CDK',
      Purpose: 'Network and Security Infrastructure',
      Component: 'VPC',
      'BLEA-Compliant': 'true',
    };

    Object.entries(tags).forEach(([key, value]) => {
      cdk.Tags.of(this).add(key, value);
    });
  }

  /**
   * Get subnet by type and availability zone
   */
  public getSubnetByTypeAndAz(subnetType: string, az: number = 0): ec2.ISubnet {
    let subnets: ec2.ISubnet[];

    switch (subnetType.toLowerCase()) {
      case 'public':
        subnets = this.vpc.publicSubnets;
        break;
      case 'private':
        subnets = this.vpc.privateSubnets;
        break;
      case 'isolated':
        subnets = this.vpc.isolatedSubnets;
        break;
      default:
        throw new Error(`Invalid subnet type: ${subnetType}`);
    }

    if (az >= subnets.length) {
      throw new Error(`Availability zone ${az} not available for subnet type ${subnetType}`);
    }

    return subnets[az];
  }

  /**
   * Create VPC Endpoints for AWS services (for enhanced security)
   */
  public createVPCEndpoints(): void {
    // S3 Gateway Endpoint
    this.vpc.addGatewayEndpoint('S3GatewayEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3,
      subnets: [
        { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
      ]
    });

    // DynamoDB Gateway Endpoint
    this.vpc.addGatewayEndpoint('DynamoDBGatewayEndpoint', {
      service: ec2.GatewayVpcEndpointAwsService.DYNAMODB,
      subnets: [
        { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        { subnetType: ec2.SubnetType.PRIVATE_ISOLATED }
      ]
    });

    // Interface Endpoints for enhanced security
    const interfaceEndpoints = [
      { name: 'SecretsManager', service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER },
      { name: 'KMS', service: ec2.InterfaceVpcEndpointAwsService.KMS },
      { name: 'CloudWatch', service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH },
      { name: 'CloudWatchLogs', service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS },
    ];

    interfaceEndpoints.forEach(endpoint => {
      this.vpc.addInterfaceEndpoint(`${endpoint.name}VPCEndpoint`, {
        service: endpoint.service,
        subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        securityGroups: [this.securityGroups.lambda],
      });
    });
  }
}