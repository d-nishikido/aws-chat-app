import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BLEASecurityStack } from '../security/blea-security-stack';

export interface BLEAMonitoringStackProps {
  readonly projectName: string;
  readonly environment: string;
  readonly securityStack: BLEASecurityStack;
}

export class BLEAMonitoringStack extends Construct {
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;
  public readonly metricNamespace: string;

  constructor(scope: Construct, id: string, props: BLEAMonitoringStackProps) {
    super(scope, id);

    this.metricNamespace = `BLEA/${props.projectName}/${props.environment}`;

    this.alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `blea-alarms-${props.projectName}-${props.environment}`,
      displayName: 'BLEA Monitoring Alarms',
      masterKey: props.securityStack.encryptionKey,
    });

    this.dashboard = new cloudwatch.Dashboard(this, 'BLEADashboard', {
      dashboardName: `blea-${props.projectName}-${props.environment}`,
      defaultInterval: cdk.Duration.hours(1),
    });

    this.setupSecurityMetrics(props);
    this.setupCostMetrics(props);
    this.setupPerformanceMetrics(props);
    this.setupComplianceMetrics(props);
    this.setupAnomalyDetection(props);

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${cdk.Aws.REGION}#dashboards:name=${this.dashboard.dashboardName}`,
      description: 'URL to the CloudWatch Dashboard',
    });

    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: this.alarmTopic.topicArn,
      description: 'ARN of the monitoring alarm SNS topic',
    });
  }

  private setupSecurityMetrics(props: BLEAMonitoringStackProps): void {
    const unauthorizedApiCallsMetric = new cloudwatch.Metric({
      namespace: 'CloudTrailMetrics',
      metricName: 'UnauthorizedAPICalls',
      dimensionsMap: {
        Environment: props.environment,
      },
    });

    const unauthorizedApiCallsAlarm = new cloudwatch.Alarm(this, 'UnauthorizedApiCallsAlarm', {
      metric: unauthorizedApiCallsMetric,
      threshold: 5,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when unauthorized API calls exceed threshold',
    });
    unauthorizedApiCallsAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(this.alarmTopic)
    );

    const rootAccountUsageMetric = new cloudwatch.Metric({
      namespace: 'CloudTrailMetrics',
      metricName: 'RootAccountUsage',
      dimensionsMap: {
        Environment: props.environment,
      },
    });

    const rootAccountUsageAlarm = new cloudwatch.Alarm(this, 'RootAccountUsageAlarm', {
      metric: rootAccountUsageMetric,
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when root account is used',
    });
    rootAccountUsageAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(props.securityStack.securityAlertTopic)
    );

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Security Events',
        left: [unauthorizedApiCallsMetric],
        right: [rootAccountUsageMetric],
        width: 12,
        height: 6,
      })
    );
  }

  private setupCostMetrics(props: BLEAMonitoringStackProps): void {
    const estimatedChargesMetric = new cloudwatch.Metric({
      namespace: 'AWS/Billing',
      metricName: 'EstimatedCharges',
      dimensionsMap: {
        Currency: 'USD',
      },
      statistic: 'Maximum',
      period: cdk.Duration.hours(6),
    });

    const billingAlarm = new cloudwatch.Alarm(this, 'BillingAlarm', {
      metric: estimatedChargesMetric,
      threshold: props.environment === 'prod' ? 1000 : 100,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'Alert when estimated charges exceed threshold',
    });
    billingAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(this.alarmTopic)
    );

    this.dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'Estimated Monthly Charges',
        metrics: [estimatedChargesMetric],
        width: 6,
        height: 4,
      })
    );
  }

  private setupPerformanceMetrics(props: BLEAMonitoringStackProps): void {
    const apiGateway4xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '4XXError',
      dimensionsMap: {
        ApiName: `${props.projectName}-api`,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const apiGateway5xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5XXError',
      dimensionsMap: {
        ApiName: `${props.projectName}-api`,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const apiErrorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
      metric: apiGateway5xxMetric,
      threshold: 10,
      evaluationPeriods: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Alert when API 5XX errors exceed threshold',
    });
    apiErrorAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(this.alarmTopic)
    );

    const lambdaErrorMetric = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Errors',
      dimensionsMap: {
        FunctionName: `${props.projectName}-*`,
      },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });

    const lambdaDurationMetric = new cloudwatch.Metric({
      namespace: 'AWS/Lambda',
      metricName: 'Duration',
      dimensionsMap: {
        FunctionName: `${props.projectName}-*`,
      },
      statistic: 'Average',
      period: cdk.Duration.minutes(5),
    });

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway Errors',
        left: [apiGateway4xxMetric, apiGateway5xxMetric],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Performance',
        left: [lambdaErrorMetric],
        right: [lambdaDurationMetric],
        width: 12,
        height: 6,
      })
    );
  }

  private setupComplianceMetrics(props: BLEAMonitoringStackProps): void {
    const configComplianceMetric = new cloudwatch.Metric({
      namespace: 'AWS/Config',
      metricName: 'ComplianceScore',
      dimensionsMap: {
        Environment: props.environment,
      },
    });

    const complianceAlarm = new cloudwatch.Alarm(this, 'ComplianceAlarm', {
      metric: configComplianceMetric,
      threshold: 90,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      evaluationPeriods: 1,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
      alarmDescription: 'Alert when compliance score drops below 90%',
    });
    complianceAlarm.addAlarmAction(
      new cloudwatch_actions.SnsAction(props.securityStack.securityAlertTopic)
    );

    const securityHubFindingsMetric = new cloudwatch.Metric({
      namespace: 'AWS/SecurityHub',
      metricName: 'ComplianceScore',
      dimensionsMap: {
        ComplianceType: 'CRITICAL',
      },
    });

    this.dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Compliance Status',
        left: [configComplianceMetric],
        right: [securityHubFindingsMetric],
        width: 12,
        height: 6,
      })
    );
  }

  private setupAnomalyDetection(props: BLEAMonitoringStackProps): void {
    const logGroup = new logs.LogGroup(this, 'AnomalyDetectionLogs', {
      logGroupName: `/aws/blea/${props.projectName}/${props.environment}/anomaly`,
      retention: logs.RetentionDays.ONE_MONTH,
      encryptionKey: props.securityStack.encryptionKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const anomalyDetectorRole = new iam.Role(this, 'AnomalyDetectorRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    anomalyDetectorRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cloudwatch:PutMetricData',
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:ListMetrics',
      ],
      resources: ['*'],
    }));

    anomalyDetectorRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [logGroup.logGroupArn],
    }));

    const customMetric = new cloudwatch.Metric({
      namespace: this.metricNamespace,
      metricName: 'CustomSecurityScore',
      dimensionsMap: {
        Environment: props.environment,
        Type: 'Security',
      },
    });

    new cloudwatch.CfnAnomalyDetector(this, 'SecurityAnomalyDetector', {
      metricName: customMetric.metricName,
      namespace: customMetric.namespace,
      dimensions: Object.entries(customMetric.dimensions || {}).map(([name, value]) => ({
        name,
        value,
      })),
      stat: 'Average',
    });

    this.dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `## Anomaly Detection\n\nMonitoring for unusual patterns in:\n- API call patterns\n- Resource modifications\n- Access patterns\n- Cost variations`,
        width: 12,
        height: 4,
      })
    );

    new cdk.CfnOutput(this, 'AnomalyLogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch Log Group for anomaly detection',
    });
  }
}