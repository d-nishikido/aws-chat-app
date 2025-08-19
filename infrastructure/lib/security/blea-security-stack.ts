import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as config from 'aws-cdk-lib/aws-config';
import * as securityhub from 'aws-cdk-lib/aws-securityhub';
import * as guardduty from 'aws-cdk-lib/aws-guardduty';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface BLEASecurityStackProps {
  readonly projectName: string;
  readonly environment: string;
  readonly enableGuardDuty: boolean;
  readonly enableSecurityHub: boolean;
  readonly enableConfig: boolean;
  readonly enableCloudTrail: boolean;
}

export class BLEASecurityStack extends Construct {
  public readonly auditLogBucket: s3.Bucket;
  public readonly encryptionKey: kms.Key;
  public readonly securityAlertTopic: sns.Topic;
  public trail?: cloudtrail.Trail;
  public configRecorder?: config.CfnConfigurationRecorder;

  constructor(scope: Construct, id: string, props: BLEASecurityStackProps) {
    super(scope, id);

    this.encryptionKey = new kms.Key(this, 'BLEAEncryptionKey', {
      description: `BLEA KMS key for ${props.projectName} ${props.environment}`,
      enableKeyRotation: true,
      alias: `blea-${props.projectName}-${props.environment}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.encryptionKey.grantEncryptDecrypt(
      new iam.ServicePrincipal('cloudtrail.amazonaws.com')
    );
    this.encryptionKey.grantEncryptDecrypt(
      new iam.ServicePrincipal('s3.amazonaws.com')
    );
    this.encryptionKey.grantEncryptDecrypt(
      new iam.ServicePrincipal('config.amazonaws.com')
    );

    this.auditLogBucket = new s3.Bucket(this, 'AuditLogBucket', {
      bucketName: `blea-audit-logs-${props.projectName}-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [
        {
          id: 'DeleteOldAuditLogs',
          enabled: true,
          expiration: cdk.Duration.days(2555), // 7 years
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(365),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.securityAlertTopic = new sns.Topic(this, 'SecurityAlertTopic', {
      topicName: `blea-security-alerts-${props.projectName}-${props.environment}`,
      displayName: 'BLEA Security Alerts',
      masterKey: this.encryptionKey,
    });

    if (props.enableCloudTrail) {
      this.setupCloudTrail(props);
    }

    if (props.enableConfig) {
      this.setupAWSConfig(props);
    }

    if (props.enableGuardDuty) {
      this.setupGuardDuty(props);
    }

    if (props.enableSecurityHub) {
      this.setupSecurityHub(props);
    }

    new cdk.CfnOutput(this, 'AuditLogBucketName', {
      value: this.auditLogBucket.bucketName,
      description: 'Name of the audit log bucket',
    });

    new cdk.CfnOutput(this, 'EncryptionKeyArn', {
      value: this.encryptionKey.keyArn,
      description: 'ARN of the BLEA encryption key',
    });

    new cdk.CfnOutput(this, 'SecurityAlertTopicArn', {
      value: this.securityAlertTopic.topicArn,
      description: 'ARN of the security alert SNS topic',
    });
  }

  private setupCloudTrail(props: BLEASecurityStackProps): void {
    this.trail = new cloudtrail.Trail(this, 'BLEACloudTrail', {
      trailName: `blea-trail-${props.projectName}-${props.environment}`,
      bucket: this.auditLogBucket,
      encryptionKey: this.encryptionKey,
      includeGlobalServiceEvents: true,
      isMultiRegionTrail: true,
      enableFileValidation: true,
      sendToCloudWatchLogs: true,
      cloudWatchLogsRetention: cdk.aws_logs.RetentionDays.ONE_YEAR,
      managementEvents: cloudtrail.ReadWriteType.ALL,
    });

    this.trail.addEventSelector(
      cloudtrail.DataResourceType.S3_OBJECT,
      ['arn:aws:s3:::*/*'],
      {
        readWriteType: cloudtrail.ReadWriteType.ALL,
        includeManagementEvents: true,
      }
    );

    new cdk.CfnOutput(this, 'CloudTrailName', {
      value: this.trail.trailArn || 'N/A',
      description: 'ARN of the CloudTrail',
    });
  }

  private setupAWSConfig(props: BLEASecurityStackProps): void {
    const configBucket = new s3.Bucket(this, 'ConfigBucket', {
      bucketName: `blea-config-${props.projectName}-${props.environment}-${cdk.Aws.ACCOUNT_ID}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.encryptionKey,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      lifecycleRules: [
        {
          id: 'DeleteOldConfigSnapshots',
          enabled: true,
          expiration: cdk.Duration.days(365),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const configRole = new iam.Role(this, 'ConfigRole', {
      assumedBy: new iam.ServicePrincipal('config.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/ConfigRole'),
      ],
    });

    configBucket.grantReadWrite(configRole);
    this.encryptionKey.grantEncryptDecrypt(configRole);

    const deliveryChannel = new config.CfnDeliveryChannel(this, 'ConfigDeliveryChannel', {
      s3BucketName: configBucket.bucketName,
      snsTopicArn: this.securityAlertTopic.topicArn,
      configSnapshotDeliveryProperties: {
        deliveryFrequency: 'TwentyFour_Hours',
      },
    });

    this.configRecorder = new config.CfnConfigurationRecorder(this, 'ConfigRecorder', {
      name: `blea-config-recorder-${props.projectName}-${props.environment}`,
      roleArn: configRole.roleArn,
      recordingGroup: {
        allSupported: true,
        includeGlobalResourceTypes: true,
        recordingStrategy: {
          useOnly: 'ALL_SUPPORTED_RESOURCE_TYPES',
        },
      },
    });

    this.configRecorder.node.addDependency(deliveryChannel);

    new config.ManagedRule(this, 'RequiredTagsRule', {
      identifier: config.ManagedRuleIdentifiers.REQUIRED_TAGS,
      inputParameters: {
        tag1Key: 'Project',
        tag2Key: 'Environment',
        tag3Key: 'ManagedBy',
      },
    });

    new config.ManagedRule(this, 'S3BucketPublicReadProhibited', {
      identifier: config.ManagedRuleIdentifiers.S3_BUCKET_PUBLIC_READ_PROHIBITED,
    });

    new config.ManagedRule(this, 'S3BucketPublicWriteProhibited', {
      identifier: config.ManagedRuleIdentifiers.S3_BUCKET_PUBLIC_WRITE_PROHIBITED,
    });

    new config.ManagedRule(this, 'S3BucketSSLRequestsOnly', {
      identifier: config.ManagedRuleIdentifiers.S3_BUCKET_SSL_REQUESTS_ONLY,
    });

    new config.ManagedRule(this, 'EncryptedVolumes', {
      identifier: config.ManagedRuleIdentifiers.EBS_ENCRYPTED_VOLUMES,
    });

    new cdk.CfnOutput(this, 'ConfigBucketName', {
      value: configBucket.bucketName,
      description: 'Name of the AWS Config bucket',
    });
  }

  private setupGuardDuty(_props: BLEASecurityStackProps): void {
    const guardDutyDetector = new guardduty.CfnDetector(this, 'GuardDutyDetector', {
      enable: true,
      findingPublishingFrequency: 'FIFTEEN_MINUTES',
      dataSources: {
        s3Logs: {
          enable: true,
        },
        kubernetes: {
          auditLogs: {
            enable: true,
          },
        },
        malwareProtection: {
          scanEc2InstanceWithFindings: {
            ebsVolumes: true,
          },
        },
      },
    });

    new cdk.CfnOutput(this, 'GuardDutyDetectorId', {
      value: guardDutyDetector.ref,
      description: 'GuardDuty Detector ID',
    });
  }

  private setupSecurityHub(_props: BLEASecurityStackProps): void {
    const securityHubHub = new securityhub.CfnHub(this, 'SecurityHub', {
      controlFindingGenerator: 'SECURITY_CONTROL',
      enableDefaultStandards: true,
      autoEnableControls: true,
    });

    const cisStandard = new securityhub.CfnStandard(this, 'CISStandard', {
      standardsArn: 'arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.2.0',
      disabledStandardsControls: [],
    });
    cisStandard.node.addDependency(securityHubHub);

    const awsFoundationalStandard = new securityhub.CfnStandard(this, 'AWSFoundationalStandard', {
      standardsArn: 'arn:aws:securityhub:us-east-1::standards/aws-foundational-security-best-practices/v/1.0.0',
      disabledStandardsControls: [],
    });
    awsFoundationalStandard.node.addDependency(securityHubHub);

    new cdk.CfnOutput(this, 'SecurityHubArn', {
      value: securityHubHub.ref,
      description: 'Security Hub ARN',
    });
  }
}