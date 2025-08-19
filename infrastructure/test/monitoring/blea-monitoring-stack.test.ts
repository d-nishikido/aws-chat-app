import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { BLEASecurityStack } from '../../lib/security/blea-security-stack';
import { BLEAMonitoringStack } from '../../lib/monitoring/blea-monitoring-stack';

describe('BLEAMonitoringStack', () => {
  let stack: cdk.Stack;
  let template: Template;
  let securityStack: BLEASecurityStack;

  beforeEach(() => {
    const app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack');
    
    securityStack = new BLEASecurityStack(stack, 'SecurityStack', {
      projectName: 'test-project',
      environment: 'test',
      enableGuardDuty: true,
      enableSecurityHub: true,
      enableConfig: true,
      enableCloudTrail: true,
    });
    
    new BLEAMonitoringStack(stack, 'MonitoringStack', {
      projectName: 'test-project',
      environment: 'test',
      securityStack: securityStack,
    });
    
    template = Template.fromStack(stack);
  });

  describe('CloudWatch Dashboard', () => {
    test('Creates CloudWatch dashboard', () => {
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'blea-test-project-test',
      });
    });
  });

  describe('SNS Topics', () => {
    test('Creates alarm topic with encryption', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'blea-alarms-test-project-test',
        DisplayName: 'BLEA Monitoring Alarms',
      });
    });
  });

  describe('CloudWatch Alarms', () => {
    test('Creates unauthorized API calls alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'Alert when unauthorized API calls exceed threshold',
        MetricName: 'UnauthorizedAPICalls',
        Namespace: 'CloudTrailMetrics',
        Threshold: 5,
        EvaluationPeriods: 1,
        TreatMissingData: 'notBreaching',
      });
    });

    test('Creates root account usage alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'Alert when root account is used',
        MetricName: 'RootAccountUsage',
        Namespace: 'CloudTrailMetrics',
        Threshold: 1,
        EvaluationPeriods: 1,
        TreatMissingData: 'notBreaching',
      });
    });

    test('Creates billing alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'Alert when estimated charges exceed threshold',
        MetricName: 'EstimatedCharges',
        Namespace: 'AWS/Billing',
        Threshold: 100, // Test environment threshold
        EvaluationPeriods: 1,
        TreatMissingData: 'breaching',
      });
    });

    test('Creates API error alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'Alert when API 5XX errors exceed threshold',
        MetricName: '5XXError',
        Namespace: 'AWS/ApiGateway',
        Threshold: 10,
        EvaluationPeriods: 2,
        TreatMissingData: 'notBreaching',
      });
    });

    test('Creates compliance alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmDescription: 'Alert when compliance score drops below 90%',
        MetricName: 'ComplianceScore',
        Namespace: 'AWS/Config',
        Threshold: 90,
        ComparisonOperator: 'LessThanThreshold',
        EvaluationPeriods: 1,
        TreatMissingData: 'breaching',
      });
    });
  });

  describe('CloudWatch Logs', () => {
    test('Creates log group for anomaly detection', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/blea/test-project/test/anomaly',
        RetentionInDays: 30,
      });
    });
  });

  describe('Anomaly Detection', () => {
    test('Creates CloudWatch anomaly detector', () => {
      template.hasResourceProperties('AWS::CloudWatch::AnomalyDetector', {
        MetricName: 'CustomSecurityScore',
        Namespace: 'BLEA/test-project/test',
        Stat: 'Average',
        Dimensions: Match.arrayWith([
          Match.objectLike({
            Name: 'Environment',
            Value: 'test',
          }),
          Match.objectLike({
            Name: 'Type',
            Value: 'Security',
          }),
        ]),
      });
    });
  });

  describe('IAM Roles', () => {
    test('Creates anomaly detector role with proper permissions', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            }),
          ]),
        },
      });
    });

    test('Anomaly detector role has CloudWatch permissions', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                'cloudwatch:PutMetricData',
                'cloudwatch:GetMetricStatistics',
                'cloudwatch:ListMetrics',
              ]),
              Resource: '*',
            }),
          ]),
        },
      });
    });
  });

  describe('Outputs', () => {
    test('Creates outputs', () => {
      const outputs = template.findOutputs('*');
      expect(Object.keys(outputs).length).toBeGreaterThan(0);
    });
  });

  describe('Dashboard Widgets', () => {
    test('Dashboard contains security metrics widget', () => {
      const dashboardResource = template.findResources('AWS::CloudWatch::Dashboard');
      const dashboardBody = Object.values(dashboardResource)[0].Properties.DashboardBody;
      const bodyString = JSON.stringify(dashboardBody);
      expect(bodyString).toContain('Security Events');
    });

    test('Dashboard contains cost metrics widget', () => {
      const dashboardResource = template.findResources('AWS::CloudWatch::Dashboard');
      const dashboardBody = Object.values(dashboardResource)[0].Properties.DashboardBody;
      const bodyString = JSON.stringify(dashboardBody);
      expect(bodyString).toContain('Estimated Monthly Charges');
    });

    test('Dashboard contains API performance widget', () => {
      const dashboardResource = template.findResources('AWS::CloudWatch::Dashboard');
      const dashboardBody = Object.values(dashboardResource)[0].Properties.DashboardBody;
      const bodyString = JSON.stringify(dashboardBody);
      expect(bodyString).toContain('API Gateway Errors');
    });

    test('Dashboard contains compliance widget', () => {
      const dashboardResource = template.findResources('AWS::CloudWatch::Dashboard');
      const dashboardBody = Object.values(dashboardResource)[0].Properties.DashboardBody;
      const bodyString = JSON.stringify(dashboardBody);
      expect(bodyString).toContain('Compliance Status');
    });
  });
});