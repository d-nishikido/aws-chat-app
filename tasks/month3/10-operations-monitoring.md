# Task: BLEA運用ダッシュボードとセキュリティ運用最適化

**実施期間**: Month 3 Week 3 (Day 1-2)  
**推定工数**: 8時間  
**優先度**: 高  

## 概要

BLEA統合運用ダッシュボードの構築を完了し、セキュリティ運用プロセス、インシデント対応フロー、自動化された運用監視システムを確立する。

## 学習目標

- 包括的運用ダッシュボードの構築
- セキュリティインシデント対応の自動化
- 運用効率化とコスト最適化
- BLEA準拠の運用プロセス確立

## 前提条件

- 本番環境デプロイ完了
- パフォーマンステスト完了
- 全システム機能が正常稼働

## タスク詳細

### Day 1: 統合運用ダッシュボード構築

#### 1. BLEA統合ダッシュボード設計 (4時間)
- [ ] 運用メトリクス設計
- [ ] セキュリティ監視ダッシュボード
- [ ] アプリケーション監視統合
- [ ] コスト監視ダッシュボード

#### 2. CloudWatch統合最適化 (2時間)
- [ ] カスタムメトリクス実装
- [ ] ログ解析強化
- [ ] アラート最適化
- [ ] 自動対応設定

#### 3. 運用効率化機能実装 (2時間)
- [ ] 自動スケーリング最適化
- [ ] リソース使用率監視
- [ ] 予防保守アラート
- [ ] レポート自動生成

### Day 2: セキュリティ運用とプロセス確立

#### 1. セキュリティ運用プロセス (4時間)
- [ ] インシデント対応プロセス
- [ ] 脅威ハンティング自動化
- [ ] 脆弱性管理プロセス
- [ ] コンプライアンス継続監視

#### 2. 自動対応システム強化 (2時間)
- [ ] 自動隔離機能
- [ ] 自動通知エスカレーション
- [ ] 自動修復機能
- [ ] ログ分析自動化

#### 3. 運用ドキュメント整備 (2時間)
- [ ] 運用手順書更新
- [ ] インシデント対応手順
- [ ] 運用チェックリスト
- [ ] 災害復旧手順

### MCP サーバ活用

```
💬 "BLEA統合環境での運用ダッシュボードとセキュリティ運用プロセスを構築してください。
自動化されたインシデント対応、脅威検知、継続的なコンプライアンス監視を含めてください。"
```

## 成果物

### 1. 統合運用ダッシュボード

```typescript
// lib/monitoring/operations-dashboard-stack.ts
export class OperationsDashboardStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: OperationsDashboardStackProps) {
    super(scope, id, props);

    // メインダッシュボード
    const mainDashboard = new cloudwatch.Dashboard(this, 'ChatApp-Operations-Dashboard', {
      dashboardName: 'ChatApp-BLEA-Operations',
      widgets: [
        // システム全体概要
        [
          this.createSystemOverviewWidget(),
          this.createSecurityOverviewWidget()
        ],
        
        // アプリケーションメトリクス
        [
          this.createApplicationMetricsWidget(props),
          this.createPerformanceMetricsWidget(props)
        ],
        
        // BLEA セキュリティメトリクス
        [
          this.createBLEASecurityWidget(),
          this.createComplianceWidget()
        ],
        
        // インフラストラクチャ監視
        [
          this.createInfrastructureWidget(props),
          this.createCostOptimizationWidget()
        ],
        
        // アラートと通知
        [
          this.createActiveAlertsWidget(),
          this.createRecentIncidentsWidget()
        ]
      ]
    });

    // セキュリティ専用ダッシュボード
    const securityDashboard = new cloudwatch.Dashboard(this, 'Security-Dashboard', {
      dashboardName: 'ChatApp-Security-Operations',
      widgets: [
        [this.createThreatDetectionWidget()],
        [this.createSecurityEventsWidget()],
        [this.createVulnerabilityWidget()],
        [this.createAccessAnalyticsWidget()],
        [this.createSecurityHubFindingsWidget()],
        [this.createGuardDutyFindingsWidget()]
      ]
    });

    // 自動通知システム
    this.setupAutomatedNotifications(props);
    
    // 自動対応システム
    this.setupAutomatedResponse(props);
  }

  private createSystemOverviewWidget(): cloudwatch.IWidget {
    return new cloudwatch.SingleValueWidget({
      title: 'System Health Overview',
      metrics: [
        new cloudwatch.MathExpression({
          expression: 'IF(api_errors < 10 AND db_connections < 80 AND lambda_errors < 5, 100, 0)',
          usingMetrics: {
            api_errors: new cloudwatch.Metric({
              namespace: 'AWS/ApiGateway',
              metricName: '4XXError',
              statistic: 'Sum'
            }),
            db_connections: new cloudwatch.Metric({
              namespace: 'AWS/RDS',
              metricName: 'DatabaseConnections',
              statistic: 'Average'
            }),
            lambda_errors: new cloudwatch.Metric({
              namespace: 'AWS/Lambda',
              metricName: 'Errors',
              statistic: 'Sum'
            })
          },
          label: 'Overall Health (%)',
          period: cdk.Duration.minutes(5)
        })
      ],
      width: 6,
      height: 3
    });
  }

  private createSecurityOverviewWidget(): cloudwatch.IWidget {
    return new cloudwatch.GraphWidget({
      title: 'Security Events & Threats',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/WAF',
          metricName: 'BlockedRequests',
          statistic: 'Sum',
          label: 'WAF Blocked Requests'
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/GuardDuty',
          metricName: 'FindingCount',
          statistic: 'Sum',
          label: 'GuardDuty Findings'
        })
      ],
      right: [
        new cloudwatch.Metric({
          namespace: 'ChatApp/Security',
          metricName: 'SecurityEvents',
          statistic: 'Sum',
          label: 'Custom Security Events'
        })
      ],
      width: 6,
      height: 6
    });
  }

  private createBLEASecurityWidget(): cloudwatch.IWidget {
    return new cloudwatch.GraphWidget({
      title: 'BLEA Security Compliance',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/Config',
          metricName: 'ComplianceByConfigRule',
          statistic: 'Average',
          label: 'Config Rules Compliance'
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/SecurityHub',
          metricName: 'Findings',
          statistic: 'Sum',
          label: 'Security Hub Findings'
        })
      ],
      width: 12,
      height: 6
    });
  }

  private setupAutomatedNotifications(props: OperationsDashboardStackProps) {
    // 重要度別通知設定
    const criticalTopic = new sns.Topic(this, 'CriticalAlerts', {
      topicName: 'ChatApp-Critical-Alerts',
      displayName: 'ChatApp Critical Alerts'
    });

    const warningTopic = new sns.Topic(this, 'WarningAlerts', {
      topicName: 'ChatApp-Warning-Alerts',
      displayName: 'ChatApp Warning Alerts'
    });

    // Slack統合
    new chatbot.SlackChannelConfiguration(this, 'CriticalSlackNotifications', {
      slackChannelConfigurationName: 'chatapp-critical-alerts',
      slackWorkspaceId: props.slackWorkspaceId,
      slackChannelId: props.criticalChannelId,
      notificationTopics: [criticalTopic],
      role: this.createChatbotRole()
    });

    // メール通知
    criticalTopic.addSubscription(new subscriptions.EmailSubscription(props.emergencyEmail));
    warningTopic.addSubscription(new subscriptions.EmailSubscription(props.operationsEmail));

    // PagerDuty統合（重要アラート）
    if (props.pagerDutyEndpoint) {
      criticalTopic.addSubscription(
        new subscriptions.UrlSubscription(props.pagerDutyEndpoint)
      );
    }
  }

  private setupAutomatedResponse(props: OperationsDashboardStackProps) {
    // 自動対応Lambda
    const responseHandler = new lambda.Function(this, 'AutomatedResponseHandler', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'response_handler.lambda_handler',
      code: lambda.Code.fromAsset('backend/automated-response'),
      environment: {
        QUARANTINE_BUCKET: props.quarantineBucket?.bucketName || '',
        SECURITY_HUB_REGION: this.region,
        SLACK_WEBHOOK_URL: props.slackWebhookUrl || '',
        AUTO_REMEDIATION_ENABLED: 'true'
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512
    });

    // EventBridge ルール設定
    const securityEventRule = new events.Rule(this, 'SecurityEventRule', {
      eventPattern: {
        source: ['aws.securityhub', 'aws.guardduty', 'chatapp.security'],
        detailType: ['Security Hub Findings', 'GuardDuty Finding', 'Custom Security Event'],
        detail: {
          severity: ['HIGH', 'CRITICAL']
        }
      }
    });

    securityEventRule.addTarget(new targets.LambdaFunction(responseHandler));

    // Config非準拠対応
    const configNonComplianceRule = new events.Rule(this, 'ConfigNonComplianceRule', {
      eventPattern: {
        source: ['aws.config'],
        detailType: ['Config Rules Compliance Change'],
        detail: {
          newEvaluationResult: {
            complianceType: ['NON_COMPLIANT']
          }
        }
      }
    });

    configNonComplianceRule.addTarget(new targets.LambdaFunction(responseHandler));
  }

  private createChatbotRole(): iam.Role {
    return new iam.Role(this, 'ChatbotRole', {
      assumedBy: new iam.ServicePrincipal('chatbot.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchReadOnlyAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AWSSupportAccess')
      ]
    });
  }
}
```

### 2. 自動対応システム

```python
# backend/automated-response/response_handler.py
"""
BLEA統合自動対応システム
"""

import json
import boto3
import os
import logging
from datetime import datetime
from typing import Dict, Any, List
from enum import Enum

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SeverityLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM" 
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ResponseAction(Enum):
    NOTIFY = "notify"
    ISOLATE = "isolate"
    BLOCK = "block"
    REMEDIATE = "remediate"
    ESCALATE = "escalate"

class AutomatedResponseHandler:
    def __init__(self):
        self.region = os.environ.get('AWS_REGION', 'ap-northeast-1')
        self.security_hub = boto3.client('securityhub', region_name=self.region)
        self.ec2 = boto3.client('ec2', region_name=self.region)
        self.waf = boto3.client('wafv2', region_name=self.region)
        self.s3 = boto3.client('s3')
        self.sns = boto3.client('sns')
        
        self.quarantine_bucket = os.environ.get('QUARANTINE_BUCKET')
        self.slack_webhook = os.environ.get('SLACK_WEBHOOK_URL')
        self.auto_remediation_enabled = os.environ.get('AUTO_REMEDIATION_ENABLED', 'false').lower() == 'true'
        
    def lambda_handler(self, event: Dict[str, Any], context) -> Dict[str, Any]:
        """
        自動対応メインハンドラー
        """
        try:
            logger.info(f"Processing security event: {json.dumps(event, default=str)}")
            
            # イベント解析
            event_details = self.parse_security_event(event)
            
            if not event_details:
                logger.warning("Unable to parse security event")
                return {'statusCode': 400, 'body': 'Invalid event format'}
            
            # 対応アクション決定
            actions = self.determine_response_actions(event_details)
            
            # 自動対応実行
            response_results = []
            for action in actions:
                result = self.execute_response_action(action, event_details)
                response_results.append(result)
            
            # 結果通知
            self.send_response_notification(event_details, response_results)
            
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'event_id': event_details.get('event_id'),
                    'actions_taken': len(response_results),
                    'results': response_results
                })
            }
            
        except Exception as e:
            logger.error(f"Error in automated response: {str(e)}")
            return {'statusCode': 500, 'body': f'Error: {str(e)}'}
    
    def parse_security_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """セキュリティイベント解析"""
        detail = event.get('detail', {})
        source = event.get('source')
        
        # Security Hub イベント
        if source == 'aws.securityhub':
            return {
                'event_id': detail.get('id'),
                'severity': detail.get('severity', {}).get('label', 'LOW'),
                'title': detail.get('title'),
                'description': detail.get('description'),
                'resources': detail.get('resources', []),
                'source': 'security-hub',
                'raw_event': event
            }
        
        # GuardDuty イベント
        elif source == 'aws.guardduty':
            return {
                'event_id': detail.get('id'),
                'severity': detail.get('severity'),
                'title': detail.get('title'),
                'description': detail.get('description'),
                'service': detail.get('service', {}),
                'source': 'guardduty',
                'raw_event': event
            }
        
        # カスタムセキュリティイベント
        elif source == 'chatapp.security':
            return {
                'event_id': detail.get('event_id'),
                'severity': detail.get('severity', 'LOW'),
                'event_type': detail.get('event_type'),
                'details': detail.get('event_details', {}),
                'source': 'custom',
                'raw_event': event
            }
        
        # Config非準拠イベント
        elif source == 'aws.config':
            return {
                'event_id': detail.get('configRuleName'),
                'severity': 'MEDIUM',
                'title': f"Config Rule Non-Compliance: {detail.get('configRuleName')}",
                'description': f"Resource {detail.get('resourceId')} is non-compliant",
                'resource_id': detail.get('resourceId'),
                'resource_type': detail.get('resourceType'),
                'source': 'config',
                'raw_event': event
            }
        
        return None
    
    def determine_response_actions(self, event_details: Dict[str, Any]) -> List[ResponseAction]:
        """対応アクション決定"""
        severity = event_details.get('severity', 'LOW')
        source = event_details.get('source')
        event_type = event_details.get('event_type', '')
        
        actions = []
        
        # 重要度別基本アクション
        if severity in ['CRITICAL', 'HIGH']:
            actions.append(ResponseAction.NOTIFY)
            actions.append(ResponseAction.ESCALATE)
        elif severity == 'MEDIUM':
            actions.append(ResponseAction.NOTIFY)
        
        # イベント種別別アクション
        if 'malware' in event_type.lower() or 'virus' in event_type.lower():
            actions.extend([ResponseAction.ISOLATE, ResponseAction.REMEDIATE])
        
        if 'brute_force' in event_type.lower() or 'unauthorized_access' in event_type.lower():
            actions.extend([ResponseAction.BLOCK, ResponseAction.REMEDIATE])
        
        if source == 'config' and self.auto_remediation_enabled:
            actions.append(ResponseAction.REMEDIATE)
        
        return list(set(actions))  # 重複削除
    
    def execute_response_action(self, action: ResponseAction, event_details: Dict[str, Any]) -> Dict[str, Any]:
        """個別対応アクション実行"""
        action_result = {
            'action': action.value,
            'success': False,
            'message': '',
            'timestamp': datetime.utcnow().isoformat()
        }
        
        try:
            if action == ResponseAction.NOTIFY:
                action_result.update(self.send_notification(event_details))
            
            elif action == ResponseAction.ISOLATE:
                action_result.update(self.isolate_resource(event_details))
            
            elif action == ResponseAction.BLOCK:
                action_result.update(self.block_source(event_details))
            
            elif action == ResponseAction.REMEDIATE:
                action_result.update(self.auto_remediate(event_details))
            
            elif action == ResponseAction.ESCALATE:
                action_result.update(self.escalate_incident(event_details))
            
        except Exception as e:
            action_result['message'] = f"Action failed: {str(e)}"
            logger.error(f"Action {action.value} failed: {str(e)}")
        
        return action_result
    
    def send_notification(self, event_details: Dict[str, Any]) -> Dict[str, Any]:
        """通知送信"""
        try:
            severity = event_details.get('severity', 'LOW')
            title = event_details.get('title', 'Security Event')
            
            # Slack通知
            if self.slack_webhook:
                self.send_slack_notification(event_details)
            
            return {
                'success': True,
                'message': f'Notification sent for {severity} severity event'
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def isolate_resource(self, event_details: Dict[str, Any]) -> Dict[str, Any]:
        """リソース隔離"""
        try:
            resources = event_details.get('resources', [])
            isolated_resources = []
            
            for resource in resources:
                resource_type = resource.get('Type', '')
                resource_id = resource.get('Id', '')
                
                if 'AwsEc2Instance' in resource_type:
                    # EC2インスタンス隔離
                    instance_id = resource_id.split('/')[-1]
                    self.isolate_ec2_instance(instance_id)
                    isolated_resources.append(instance_id)
                
                elif 'AwsS3Object' in resource_type:
                    # S3オブジェクト隔離
                    self.quarantine_s3_object(resource_id)
                    isolated_resources.append(resource_id)
            
            return {
                'success': True,
                'message': f'Isolated {len(isolated_resources)} resources',
                'isolated_resources': isolated_resources
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def isolate_ec2_instance(self, instance_id: str):
        """EC2インスタンス隔離"""
        # 隔離用セキュリティグループ作成/取得
        isolation_sg = self.get_or_create_isolation_security_group()
        
        # インスタンスのセキュリティグループを隔離SGに変更
        self.ec2.modify_instance_attribute(
            InstanceId=instance_id,
            Groups=[isolation_sg]
        )
        
        # インスタンスにタグ追加
        self.ec2.create_tags(
            Resources=[instance_id],
            Tags=[
                {'Key': 'SecurityStatus', 'Value': 'Isolated'},
                {'Key': 'IsolationTimestamp', 'Value': datetime.utcnow().isoformat()}
            ]
        )
    
    def quarantine_s3_object(self, object_arn: str):
        """S3オブジェクト隔離"""
        if not self.quarantine_bucket:
            raise ValueError("Quarantine bucket not configured")
        
        # ARNからバケット名とキーを抽出
        parts = object_arn.replace('arn:aws:s3:::', '').split('/', 1)
        source_bucket = parts[0]
        object_key = parts[1] if len(parts) > 1 else ''
        
        # 隔離バケットにコピー
        quarantine_key = f"quarantine/{datetime.utcnow().strftime('%Y/%m/%d')}/{object_key}"
        
        self.s3.copy_object(
            CopySource={'Bucket': source_bucket, 'Key': object_key},
            Bucket=self.quarantine_bucket,
            Key=quarantine_key,
            MetadataDirective='REPLACE',
            Metadata={
                'OriginalLocation': f"{source_bucket}/{object_key}",
                'QuarantineTimestamp': datetime.utcnow().isoformat(),
                'QuarantineReason': 'Security threat detected'
            }
        )
        
        # 元オブジェクトを削除
        self.s3.delete_object(Bucket=source_bucket, Key=object_key)
    
    def block_source(self, event_details: Dict[str, Any]) -> Dict[str, Any]:
        """攻撃元ブロック"""
        try:
            # GuardDutyイベントからIPアドレス抽出
            service_details = event_details.get('service', {})
            remote_ip = service_details.get('remoteIpDetails', {}).get('ipAddressV4')
            
            if remote_ip:
                # WAFでIPアドレスブロック
                self.add_ip_to_waf_blocklist(remote_ip)
                return {
                    'success': True,
                    'message': f'Blocked IP address: {remote_ip}'
                }
            
            return {
                'success': False,
                'message': 'No IP address found to block'
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def add_ip_to_waf_blocklist(self, ip_address: str):
        """WAF IPブロックリスト追加"""
        # IPセット更新（実装は環境に応じて調整）
        # この例では既存のIPセットを更新
        ip_set_id = 'chatapp-blocked-ips'
        
        try:
            # 既存のIPアドレス一覧取得
            response = self.waf.get_ip_set(
                Scope='CLOUDFRONT',
                Id=ip_set_id,
                Name='ChatApp-Blocked-IPs'
            )
            
            current_addresses = response['IPSet']['Addresses']
            
            # 新しいIPアドレス追加
            if f"{ip_address}/32" not in current_addresses:
                current_addresses.append(f"{ip_address}/32")
                
                # IPセット更新
                self.waf.update_ip_set(
                    Scope='CLOUDFRONT',
                    Id=ip_set_id,
                    Name='ChatApp-Blocked-IPs',
                    Addresses=current_addresses,
                    LockToken=response['LockToken']
                )
                
        except self.waf.exceptions.WAFNonexistentItemException:
            logger.warning(f"IP set {ip_set_id} not found")
    
    def auto_remediate(self, event_details: Dict[str, Any]) -> Dict[str, Any]:
        """自動修復"""
        try:
            source = event_details.get('source')
            
            if source == 'config':
                return self.remediate_config_non_compliance(event_details)
            elif source == 'security-hub':
                return self.remediate_security_finding(event_details)
            
            return {
                'success': False,
                'message': f'No remediation available for source: {source}'
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def remediate_config_non_compliance(self, event_details: Dict[str, Any]) -> Dict[str, Any]:
        """Config非準拠自動修復"""
        rule_name = event_details.get('event_id')
        resource_id = event_details.get('resource_id')
        resource_type = event_details.get('resource_type')
        
        remediation_actions = {
            's3-bucket-public-read-prohibited': self.remediate_s3_public_read,
            's3-bucket-public-write-prohibited': self.remediate_s3_public_write,
            'rds-storage-encrypted': self.remediate_rds_encryption
        }
        
        if rule_name in remediation_actions:
            remediation_actions[rule_name](resource_id)
            return {
                'success': True,
                'message': f'Remediated {rule_name} for resource {resource_id}'
            }
        
        return {
            'success': False,
            'message': f'No automated remediation available for rule: {rule_name}'
        }
    
    def escalate_incident(self, event_details: Dict[str, Any]) -> Dict[str, Any]:
        """インシデントエスカレーション"""
        try:
            # Security Hubに高重要度所見として記録
            finding_id = f"escalated-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
            
            self.security_hub.batch_import_findings(
                Findings=[{
                    'SchemaVersion': '2018-10-08',
                    'Id': finding_id,
                    'ProductArn': f"arn:aws:securityhub:{self.region}::product/custom/chatapp-auto-response",
                    'GeneratorId': 'automated-response-system',
                    'AwsAccountId': boto3.Session().get_credentials().access_key.split(':')[4] if ':' in boto3.Session().get_credentials().access_key else '',
                    'CreatedAt': datetime.utcnow().isoformat() + 'Z',
                    'UpdatedAt': datetime.utcnow().isoformat() + 'Z',
                    'Severity': {'Label': 'HIGH'},
                    'Title': f"Escalated Security Incident: {event_details.get('title', 'Unknown')}",
                    'Description': f"Automated escalation of security incident: {event_details.get('description', 'No description')}",
                    'Types': ['Unusual Behaviors/Application'],
                    'WorkflowState': 'NEW',
                    'RecordState': 'ACTIVE'
                }]
            )
            
            return {
                'success': True,
                'message': f'Incident escalated with finding ID: {finding_id}'
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def send_slack_notification(self, event_details: Dict[str, Any]):
        """Slack通知送信"""
        import requests
        
        severity = event_details.get('severity', 'LOW')
        title = event_details.get('title', 'Security Event')
        description = event_details.get('description', 'No description')
        
        # 重要度に応じた色設定
        color_map = {
            'CRITICAL': '#FF0000',
            'HIGH': '#FF6600',
            'MEDIUM': '#FFFF00',
            'LOW': '#00FF00'
        }
        
        payload = {
            'attachments': [{
                'color': color_map.get(severity, '#808080'),
                'title': f'🚨 {severity} Security Alert: {title}',
                'text': description,
                'fields': [
                    {
                        'title': 'Event ID',
                        'value': event_details.get('event_id', 'Unknown'),
                        'short': True
                    },
                    {
                        'title': 'Timestamp',
                        'value': datetime.utcnow().isoformat(),
                        'short': True
                    }
                ],
                'footer': 'ChatApp Security System',
                'ts': int(datetime.utcnow().timestamp())
            }]
        }
        
        requests.post(self.slack_webhook, json=payload)
    
    def send_response_notification(self, event_details: Dict[str, Any], results: List[Dict[str, Any]]):
        """対応結果通知"""
        if self.slack_webhook:
            successful_actions = [r for r in results if r['success']]
            failed_actions = [r for r in results if not r['success']]
            
            payload = {
                'attachments': [{
                    'color': '#00FF00' if not failed_actions else '#FF6600',
                    'title': '🤖 Automated Response Summary',
                    'text': f"Event: {event_details.get('title', 'Security Event')}",
                    'fields': [
                        {
                            'title': 'Successful Actions',
                            'value': ', '.join([r['action'] for r in successful_actions]) or 'None',
                            'short': True
                        },
                        {
                            'title': 'Failed Actions', 
                            'value': ', '.join([r['action'] for r in failed_actions]) or 'None',
                            'short': True
                        }
                    ]
                }]
            }
            
            requests.post(self.slack_webhook, json=payload)
    
    def get_or_create_isolation_security_group(self) -> str:
        """隔離用セキュリティグループ取得/作成"""
        try:
            # 既存の隔離SGを検索
            response = self.ec2.describe_security_groups(
                Filters=[
                    {'Name': 'group-name', 'Values': ['chatapp-isolation-sg']}
                ]
            )
            
            if response['SecurityGroups']:
                return response['SecurityGroups'][0]['GroupId']
            
            # 隔離SG作成
            vpc_response = self.ec2.describe_vpcs(
                Filters=[{'Name': 'tag:Name', 'Values': ['ChatApp-VPC']}]
            )
            
            if not vpc_response['Vpcs']:
                raise ValueError("ChatApp VPC not found")
            
            vpc_id = vpc_response['Vpcs'][0]['VpcId']
            
            sg_response = self.ec2.create_security_group(
                GroupName='chatapp-isolation-sg',
                Description='Security group for isolating compromised resources',
                VpcId=vpc_id
            )
            
            return sg_response['GroupId']
            
        except Exception as e:
            logger.error(f"Failed to get/create isolation security group: {str(e)}")
            raise

# Lambda エントリポイント
def lambda_handler(event, context):
    handler = AutomatedResponseHandler()
    return handler.lambda_handler(event, context)
```

### 3. 運用レポート自動生成

```python
# scripts/generate-operations-report.py
"""
BLEA統合運用レポート自動生成
"""

import boto3
import json
from datetime import datetime, timedelta
import pandas as pd
from typing import Dict, List, Any
import argparse

class OperationsReportGenerator:
    def __init__(self, region='ap-northeast-1'):
        self.region = region
        self.cloudwatch = boto3.client('cloudwatch', region_name=region)
        self.security_hub = boto3.client('securityhub', region_name=region)
        self.config = boto3.client('config', region_name=region)
        self.cost_explorer = boto3.client('ce', region_name='us-east-1')  # Cost Explorer is global
        
    def generate_weekly_report(self) -> Dict[str, Any]:
        """週次運用レポート生成"""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=7)
        
        report = {
            'report_period': {
                'start': start_time.isoformat(),
                'end': end_time.isoformat(),
                'duration_days': 7
            },
            'system_health': self.get_system_health_metrics(start_time, end_time),
            'security_summary': self.get_security_summary(start_time, end_time),
            'performance_metrics': self.get_performance_metrics(start_time, end_time),
            'compliance_status': self.get_compliance_status(),
            'cost_analysis': self.get_cost_analysis(start_time, end_time),
            'incidents': self.get_incident_summary(start_time, end_time),
            'recommendations': []
        }
        
        # 推奨事項生成
        report['recommendations'] = self.generate_recommendations(report)
        
        return report
    
    def get_system_health_metrics(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """システムヘルスメトリクス取得"""
        try:
            # API Gateway メトリクス
            api_metrics = self.cloudwatch.get_metric_statistics(
                Namespace='AWS/ApiGateway',
                MetricName='Count',
                Dimensions=[{'Name': 'ApiName', 'Value': 'ChatApp-API'}],
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,
                Statistics=['Sum']
            )
            
            # Lambda メトリクス
            lambda_metrics = self.cloudwatch.get_metric_statistics(
                Namespace='AWS/Lambda',
                MetricName='Invocations',
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,
                Statistics=['Sum']
            )
            
            # RDS メトリクス
            rds_metrics = self.cloudwatch.get_metric_statistics(
                Namespace='AWS/RDS',
                MetricName='CPUUtilization',
                Dimensions=[{'Name': 'DBClusterIdentifier', 'Value': 'chatapp-cluster'}],
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,
                Statistics=['Average', 'Maximum']
            )
            
            total_api_requests = sum([point['Sum'] for point in api_metrics['Datapoints']])
            total_lambda_invocations = sum([point['Sum'] for point in lambda_metrics['Datapoints']])
            avg_cpu_utilization = sum([point['Average'] for point in rds_metrics['Datapoints']]) / len(rds_metrics['Datapoints']) if rds_metrics['Datapoints'] else 0
            
            return {
                'api_requests_total': total_api_requests,
                'lambda_invocations_total': total_lambda_invocations,
                'database_cpu_avg': round(avg_cpu_utilization, 2),
                'uptime_percentage': self.calculate_uptime(start_time, end_time),
                'availability_sla_met': avg_cpu_utilization < 80  # 80%未満を正常とする
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_security_summary(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """セキュリティサマリー取得"""
        try:
            # Security Hub 所見
            findings = self.security_hub.get_findings(
                Filters={
                    'CreatedAt': [
                        {
                            'Start': start_time,
                            'End': end_time
                        }
                    ],
                    'RecordState': [{'Value': 'ACTIVE', 'Comparison': 'EQUALS'}]
                },
                MaxResults=100
            )
            
            # 重要度別集計
            severity_counts = {'CRITICAL': 0, 'HIGH': 0, 'MEDIUM': 0, 'LOW': 0}
            for finding in findings['Findings']:
                severity = finding['Severity']['Label']
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
            
            # WAF ブロック数
            waf_metrics = self.cloudwatch.get_metric_statistics(
                Namespace='AWS/WAFV2',
                MetricName='BlockedRequests',
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,
                Statistics=['Sum']
            )
            
            blocked_requests = sum([point['Sum'] for point in waf_metrics['Datapoints']])
            
            return {
                'total_findings': len(findings['Findings']),
                'findings_by_severity': severity_counts,
                'blocked_requests': blocked_requests,
                'new_vulnerabilities': len([f for f in findings['Findings'] if 'vulnerability' in f['Title'].lower()]),
                'resolved_findings': self.get_resolved_findings_count(start_time, end_time)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_performance_metrics(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """パフォーマンスメトリクス取得"""
        try:
            # API レスポンス時間
            latency_metrics = self.cloudwatch.get_metric_statistics(
                Namespace='AWS/ApiGateway',
                MetricName='Latency',
                Dimensions=[{'Name': 'ApiName', 'Value': 'ChatApp-API'}],
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,
                Statistics=['Average', 'Maximum']
            )
            
            # エラー率
            error_metrics = self.cloudwatch.get_metric_statistics(
                Namespace='AWS/ApiGateway',
                MetricName='4XXError',
                Dimensions=[{'Name': 'ApiName', 'Value': 'ChatApp-API'}],
                StartTime=start_time,
                EndTime=end_time,
                Period=3600,
                Statistics=['Sum']
            )
            
            avg_latency = sum([point['Average'] for point in latency_metrics['Datapoints']]) / len(latency_metrics['Datapoints']) if latency_metrics['Datapoints'] else 0
            max_latency = max([point['Maximum'] for point in latency_metrics['Datapoints']]) if latency_metrics['Datapoints'] else 0
            total_errors = sum([point['Sum'] for point in error_metrics['Datapoints']])
            
            return {
                'avg_response_time_ms': round(avg_latency, 2),
                'max_response_time_ms': round(max_latency, 2),
                'error_count': total_errors,
                'performance_sla_met': avg_latency < 1000,  # 1秒未満を目標
                'reliability_score': self.calculate_reliability_score(total_errors, avg_latency)
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_compliance_status(self) -> Dict[str, Any]:
        """コンプライアンス状況取得"""
        try:
            # Config Rules 準拠状況
            compliance = self.config.describe_compliance_by_config_rule()
            
            compliant_rules = 0
            non_compliant_rules = 0
            
            for rule in compliance['ComplianceByConfigRules']:
                compliance_type = rule['Compliance']['ComplianceType']
                if compliance_type == 'COMPLIANT':
                    compliant_rules += 1
                elif compliance_type == 'NON_COMPLIANT':
                    non_compliant_rules += 1
            
            total_rules = compliant_rules + non_compliant_rules
            compliance_percentage = (compliant_rules / total_rules * 100) if total_rules > 0 else 0
            
            return {
                'total_rules': total_rules,
                'compliant_rules': compliant_rules,
                'non_compliant_rules': non_compliant_rules,
                'compliance_percentage': round(compliance_percentage, 2),
                'blea_standards_met': compliance_percentage >= 95
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def get_cost_analysis(self, start_time: datetime, end_time: datetime) -> Dict[str, Any]:
        """コスト分析取得"""
        try:
            # 期間のコスト取得
            response = self.cost_explorer.get_cost_and_usage(
                TimePeriod={
                    'Start': start_time.strftime('%Y-%m-%d'),
                    'End': end_time.strftime('%Y-%m-%d')
                },
                Granularity='DAILY',
                Metrics=['BlendedCost'],
                GroupBy=[
                    {'Type': 'DIMENSION', 'Key': 'SERVICE'}
                ]
            )
            
            total_cost = 0
            service_costs = {}
            
            for result in response['ResultsByTime']:
                for group in result['Groups']:
                    service = group['Keys'][0]
                    cost = float(group['Metrics']['BlendedCost']['Amount'])
                    total_cost += cost
                    service_costs[service] = service_costs.get(service, 0) + cost
            
            # 前週との比較
            prev_start = start_time - timedelta(days=7)
            prev_end = start_time
            
            prev_response = self.cost_explorer.get_cost_and_usage(
                TimePeriod={
                    'Start': prev_start.strftime('%Y-%m-%d'),
                    'End': prev_end.strftime('%Y-%m-%d')
                },
                Granularity='DAILY',
                Metrics=['BlendedCost']
            )
            
            prev_total = sum([float(result['Total']['BlendedCost']['Amount']) for result in prev_response['ResultsByTime']])
            cost_change_percentage = ((total_cost - prev_total) / prev_total * 100) if prev_total > 0 else 0
            
            return {
                'total_cost_usd': round(total_cost, 2),
                'cost_by_service': {k: round(v, 2) for k, v in sorted(service_costs.items(), key=lambda x: x[1], reverse=True)[:5]},
                'cost_change_percentage': round(cost_change_percentage, 2),
                'budget_status': 'within_budget' if total_cost < 1000 else 'over_budget'  # 例: $1000予算
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def generate_recommendations(self, report: Dict[str, Any]) -> List[str]:
        """推奨事項生成"""
        recommendations = []
        
        # パフォーマンス推奨事項
        perf = report.get('performance_metrics', {})
        if perf.get('avg_response_time_ms', 0) > 1000:
            recommendations.append("API response time is above 1 second. Consider optimizing Lambda functions or database queries.")
        
        # セキュリティ推奨事項
        security = report.get('security_summary', {})
        critical_findings = security.get('findings_by_severity', {}).get('CRITICAL', 0)
        if critical_findings > 0:
            recommendations.append(f"There are {critical_findings} critical security findings that require immediate attention.")
        
        # コンプライアンス推奨事項
        compliance = report.get('compliance_status', {})
        if compliance.get('compliance_percentage', 100) < 95:
            recommendations.append("BLEA compliance is below 95%. Review non-compliant Config Rules.")
        
        # コスト推奨事項
        cost = report.get('cost_analysis', {})
        if cost.get('cost_change_percentage', 0) > 20:
            recommendations.append("Cost has increased by more than 20%. Review resource utilization and optimize.")
        
        return recommendations
    
    def save_report(self, report: Dict[str, Any], output_file: str):
        """レポート保存"""
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"Operations report saved to: {output_file}")
    
    def calculate_uptime(self, start_time: datetime, end_time: datetime) -> float:
        """稼働率計算（簡易版）"""
        # 実際の実装では、ヘルスチェックのメトリクスを使用
        return 99.9  # プレースホルダー
    
    def calculate_reliability_score(self, error_count: int, avg_latency: float) -> float:
        """信頼性スコア計算"""
        base_score = 100
        error_penalty = min(error_count * 0.1, 20)  # エラー1件につき0.1点減点、最大20点
        latency_penalty = max(0, (avg_latency - 500) * 0.01)  # 500ms超過分を減点
        
        return max(0, base_score - error_penalty - latency_penalty)
    
    def get_resolved_findings_count(self, start_time: datetime, end_time: datetime) -> int:
        """解決済み所見数取得"""
        try:
            resolved_findings = self.security_hub.get_findings(
                Filters={
                    'UpdatedAt': [{'Start': start_time, 'End': end_time}],
                    'RecordState': [{'Value': 'ARCHIVED', 'Comparison': 'EQUALS'}]
                },
                MaxResults=100
            )
            return len(resolved_findings['Findings'])
        except:
            return 0

def main():
    parser = argparse.ArgumentParser(description='Generate Operations Report')
    parser.add_argument('--region', default='ap-northeast-1', help='AWS Region')
    parser.add_argument('--output', default=f'operations-report-{datetime.now().strftime("%Y%m%d")}.json', help='Output file')
    parser.add_argument('--format', choices=['json', 'html'], default='json', help='Output format')
    
    args = parser.parse_args()
    
    generator = OperationsReportGenerator(region=args.region)
    report = generator.generate_weekly_report()
    generator.save_report(report, args.output)
    
    # サマリー出力
    print("\n=== Operations Report Summary ===")
    print(f"Report Period: {report['report_period']['start']} to {report['report_period']['end']}")
    print(f"System Health: {'✅ Good' if report['system_health'].get('availability_sla_met') else '⚠️ Issues'}")
    print(f"Security: {report['security_summary'].get('total_findings', 0)} total findings")
    print(f"Performance: {'✅ Good' if report['performance_metrics'].get('performance_sla_met') else '⚠️ Issues'}")
    print(f"Compliance: {report['compliance_status'].get('compliance_percentage', 0):.1f}%")
    print(f"Cost: ${report['cost_analysis'].get('total_cost_usd', 0):.2f}")
    
    if report['recommendations']:
        print("\n=== Recommendations ===")
        for i, rec in enumerate(report['recommendations'], 1):
            print(f"{i}. {rec}")

if __name__ == "__main__":
    main()
```

## 検証項目

- [ ] 統合運用ダッシュボードが表示される
- [ ] セキュリティ監視ダッシュボードが機能する
- [ ] 自動対応システムが動作する
- [ ] アラート通知システムが機能する
- [ ] Slack統合が動作する
- [ ] インシデント自動エスカレーションが機能する
- [ ] 運用レポートが自動生成される
- [ ] コンプライアンス監視が継続的に動作する
- [ ] コスト監視アラートが機能する
- [ ] 自動修復機能が適切に動作する

## 運用KPI目標

- [ ] セキュリティインシデント検知時間: < 5分
- [ ] インシデント対応時間: < 15分
- [ ] 自動対応成功率: > 90%
- [ ] システム可用性: > 99.9%
- [ ] コンプライアンス準拠率: > 95%
- [ ] 月次運用工数: < 8時間

## 次のタスクへの引き継ぎ事項

- 運用ダッシュボード設定完了
- 自動対応システム動作状況
- セキュリティ運用プロセス確立状況
- 運用レポート自動生成機能

## 参考資料

- [AWS Security Hub](https://docs.aws.amazon.com/securityhub/)
- [CloudWatch Dashboards](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html)
- [AWS Chatbot](https://docs.aws.amazon.com/chatbot/)
- [Security Incident Response](https://docs.aws.amazon.com/whitepapers/latest/aws-security-incident-response-guide/)