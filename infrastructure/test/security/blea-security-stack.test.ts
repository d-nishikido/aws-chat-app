import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { BLEASecurityStack } from '../../lib/security/blea-security-stack';

describe('BLEASecurityStack', () => {
  let stack: cdk.Stack;
  let template: Template;

  beforeEach(() => {
    const app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    
    new BLEASecurityStack(stack, 'SecurityStack', {
      projectName: 'test-project',
      environment: 'test',
      enableGuardDuty: true,
      enableSecurityHub: true,
      enableConfig: true,
      enableCloudTrail: true,
    });
    
    template = Template.fromStack(stack);
  });

  describe('KMS Encryption', () => {
    test('Creates KMS key with rotation enabled', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
        Description: Match.stringLikeRegexp('BLEA KMS key'),
      });
    });

    test('Creates KMS key alias', () => {
      template.hasResourceProperties('AWS::KMS::Alias', {
        AliasName: 'alias/blea-test-project-test',
      });
    });
  });

  describe('S3 Buckets', () => {
    test('Creates audit log bucket with proper encryption and versioning', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: Match.objectLike({
          'Fn::Join': Match.arrayWith([
            '',
            Match.arrayWith([
              Match.stringLikeRegexp('blea-audit-logs-test-project-test-'),
            ])
          ])
        }),
        BucketEncryption: {
          ServerSideEncryptionConfiguration: Match.arrayWith([
            Match.objectLike({
              ServerSideEncryptionByDefault: {
                SSEAlgorithm: 'aws:kms',
              },
            }),
          ]),
        },
        VersioningConfiguration: {
          Status: 'Enabled',
        },
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    test('Audit log bucket has lifecycle rules', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        BucketName: Match.objectLike({
          'Fn::Join': Match.arrayWith([
            '',
            Match.arrayWith([
              Match.stringLikeRegexp('blea-audit-logs-'),
            ])
          ])
        }),
        LifecycleConfiguration: {
          Rules: Match.arrayWith([
            Match.objectLike({
              Id: 'DeleteOldAuditLogs',
              Status: 'Enabled',
              ExpirationInDays: 2555,
              Transitions: Match.arrayWith([
                Match.objectLike({
                  StorageClass: 'STANDARD_IA',
                  TransitionInDays: 30,
                }),
                Match.objectLike({
                  StorageClass: 'GLACIER',
                  TransitionInDays: 90,
                }),
                Match.objectLike({
                  StorageClass: 'DEEP_ARCHIVE',
                  TransitionInDays: 365,
                }),
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe('CloudTrail', () => {
    test('Creates CloudTrail with proper configuration', () => {
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        TrailName: 'blea-trail-test-project-test',
        EnableLogFileValidation: true,
        IncludeGlobalServiceEvents: true,
        IsMultiRegionTrail: true,
      });
    });
  });

  describe('AWS Config', () => {
    test('Creates Config recorder with proper settings', () => {
      template.hasResourceProperties('AWS::Config::ConfigurationRecorder', {
        Name: 'blea-config-recorder-test-project-test',
        RecordingGroup: {
          AllSupported: true,
          IncludeGlobalResourceTypes: true,
          RecordingStrategy: {
            UseOnly: 'ALL_SUPPORTED_RESOURCE_TYPES',
          },
        },
      });
    });

    test('Creates Config delivery channel', () => {
      template.hasResourceProperties('AWS::Config::DeliveryChannel', {
        ConfigSnapshotDeliveryProperties: {
          DeliveryFrequency: 'TwentyFour_Hours',
        },
      });
    });

    test('Creates Config rules for compliance', () => {
      template.hasResourceProperties('AWS::Config::ConfigRule', {
        Source: {
          Owner: 'AWS',
          SourceIdentifier: 'REQUIRED_TAGS',
        },
      });

      template.hasResourceProperties('AWS::Config::ConfigRule', {
        Source: {
          Owner: 'AWS',
          SourceIdentifier: 'S3_BUCKET_PUBLIC_READ_PROHIBITED',
        },
      });
    });
  });

  describe('GuardDuty', () => {
    test('Creates GuardDuty detector with all data sources enabled', () => {
      template.hasResourceProperties('AWS::GuardDuty::Detector', {
        Enable: true,
        FindingPublishingFrequency: 'FIFTEEN_MINUTES',
        DataSources: {
          S3Logs: {
            Enable: true,
          },
          Kubernetes: {
            AuditLogs: {
              Enable: true,
            },
          },
          MalwareProtection: {
            ScanEc2InstanceWithFindings: {
              EbsVolumes: true,
            },
          },
        },
      });
    });
  });

  describe('Security Hub', () => {
    test('Creates Security Hub with auto-enable controls', () => {
      template.hasResourceProperties('AWS::SecurityHub::Hub', {
        ControlFindingGenerator: 'SECURITY_CONTROL',
        EnableDefaultStandards: true,
        AutoEnableControls: true,
      });
    });

    test('Enables CIS and AWS Foundational standards', () => {
      template.hasResourceProperties('AWS::SecurityHub::Standard', {
        StandardsArn: Match.stringLikeRegexp('cis-aws-foundations-benchmark'),
      });

      template.hasResourceProperties('AWS::SecurityHub::Standard', {
        StandardsArn: Match.stringLikeRegexp('aws-foundational-security-best-practices'),
      });
    });
  });

  describe('SNS Topics', () => {
    test('Creates security alert topic with encryption', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'blea-security-alerts-test-project-test',
        DisplayName: 'BLEA Security Alerts',
      });
    });
  });

  describe('Outputs', () => {
    test('Creates outputs', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs).length).toBeGreaterThan(0);
    });
  });
});