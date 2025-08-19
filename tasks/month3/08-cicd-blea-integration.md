# Task: BLEA準拠CI/CDパイプライン構築

**実施期間**: Month 3 Week 1 (Day 1-2)  
**推定工数**: 8時間  
**優先度**: 高  

## 概要

BLEAセキュリティ要件を満たすCDK統一CI/CDパイプラインを構築し、GitHub ActionsとAWS CDK Pipelinesを使用した自動デプロイシステムを実装する。

## 学習目標

- BLEA準拠のCI/CDパイプライン設計
- セキュリティスキャンの統合
- CDK統合テストとコンプライアンスチェック
- 自動承認プロセスの実装

## 前提条件

- Month 2の全タスク完了
- BLEA基盤が安定稼働
- 全アプリケーション機能が実装完了

## タスク詳細

### Day 1: BLEA統合CDKパイプライン設計

#### 1. CDK Pipelinesアーキテクチャ設計 (3時間)
- [ ] セルフ変更型パイプライン設計
- [ ] 環境別デプロイ戦略
- [ ] セキュリティゲート設計
- [ ] 承認ワークフロー設計

#### 2. セキュリティスキャン統合 (3時間)
- [ ] SAST（静的解析）統合
- [ ] DAST（動的解析）統合
- [ ] 依存関係脆弱性スキャン
- [ ] Infrastructure as Code スキャン

#### 3. 基本パイプライン実装 (2時間)
- [ ] CDK Pipeline Stack作成
- [ ] GitHub統合設定
- [ ] 基本ステージ設定
- [ ] 環境変数管理

### Day 2: GitHub Actions統合とセキュリティ強化

#### 1. GitHub Actions設定 (3時間)
- [ ] ワークフロー設定
- [ ] OIDC プロバイダー設定
- [ ] セキュリティ認証情報管理
- [ ] マトリックスビルド設定

#### 2. コンプライアンスチェック統合 (3時間)
- [ ] AWS Config Rules検証
- [ ] BLEA準拠性チェック
- [ ] セキュリティポリシー検証
- [ ] 自動修復機能

#### 3. 監視・通知設定 (2時間)
- [ ] パイプライン監視設定
- [ ] 失敗時通知設定
- [ ] Slack統合
- [ ] ダッシュボード作成

### MCP サーバ活用

```
💬 "概要設計書のBLEA統合CI/CDに従って、GitHub ActionsでCDK統一の
自動デプロイパイプラインを構築してください。BLEAセキュリティスキャン、
Config準拠性チェック、CDK統合テストを含めてください。"
```

## 成果物

### 1. CDK Pipeline Stack実装

```typescript
// lib/pipeline/chatapp-pipeline-stack.ts
export class ChatAppPipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    // ソースコード設定
    const sourceConnection = new codeconnections.CfnConnection(this, 'GitHubConnection', {
      connectionName: 'chatapp-github-connection',
      providerType: 'GitHub'
    });

    const source = pipelines.CodePipelineSource.connection(
      'your-org/aws-chat-app',
      'main',
      {
        connectionArn: sourceConnection.attrConnectionArn
      }
    );

    // セキュリティスキャン用の合成ステップ
    const synthStep = new pipelines.ShellStep('Synth', {
      input: source,
      commands: [
        // 依存関係インストール
        'npm ci',
        'pip install -r requirements.txt',
        
        // セキュリティスキャン
        'npm audit --audit-level high',
        'pip-audit -r requirements.txt',
        
        // 静的解析
        'npm run lint',
        'npm run typecheck',
        'bandit -r backend/',
        
        // CDK合成
        'npm run build',
        'npx cdk synth'
      ],
      primaryOutputDirectory: 'cdk.out'
    });

    // パイプライン作成
    const pipeline = new pipelines.CodePipeline(this, 'ChatAppPipeline', {
      pipelineName: 'ChatApp-BLEA-Pipeline',
      synth: synthStep,
      
      // セルフ変更有効化
      selfMutation: true,
      
      // クロスアカウントキー使用
      crossAccountKeys: true,
      
      // BLEA準拠のIAMロール
      codeBuildDefaults: {
        rolePolicy: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'sts:AssumeRole',
              'iam:PassRole',
              'cloudformation:*',
              'lambda:*',
              'apigateway:*',
              'rds:*',
              's3:*',
              'kms:*'
            ],
            resources: ['*'],
            conditions: {
              StringEquals: {
                'aws:RequestedRegion': ['ap-northeast-1']
              }
            }
          })
        ]
      }
    });

    // 開発環境ステージ
    const devStage = new ChatAppStage(this, 'Dev', {
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT!,
        region: 'ap-northeast-1'
      },
      stageName: 'dev'
    });

    const devStageDeployment = pipeline.addStage(devStage, {
      pre: [
        // BLEA準拠性事前チェック
        new pipelines.ShellStep('BLEA-Pre-Check', {
          commands: [
            'echo "Running BLEA compliance pre-check"',
            'python scripts/blea-compliance-check.py --stage dev'
          ]
        })
      ],
      post: [
        // セキュリティテスト
        new pipelines.ShellStep('Security-Tests', {
          commands: [
            'npm run test:security',
            'python scripts/dast-scan.py --target $DEV_API_URL'
          ],
          env: {
            DEV_API_URL: devStage.apiUrl
          }
        }),
        
        // 統合テスト
        new pipelines.ShellStep('Integration-Tests', {
          commands: [
            'npm run test:integration',
            'python scripts/blea-validation.py --environment dev'
          ]
        })
      ]
    });

    // 本番環境ステージ
    const prodStage = new ChatAppStage(this, 'Prod', {
      env: {
        account: process.env.PROD_ACCOUNT_ID!,
        region: 'ap-northeast-1'
      },
      stageName: 'prod'
    });

    pipeline.addStage(prodStage, {
      pre: [
        // 手動承認
        new pipelines.ManualApprovalStep('Approve-Production-Deployment', {
          comment: 'Please review the security scan results and approve production deployment'
        }),
        
        // 本番前最終セキュリティチェック
        new pipelines.ShellStep('Final-Security-Check', {
          commands: [
            'python scripts/final-security-validation.py',
            'python scripts/blea-prod-readiness.py'
          ]
        })
      ],
      post: [
        // 本番デプロイ後検証
        new pipelines.ShellStep('Production-Validation', {
          commands: [
            'python scripts/prod-health-check.py',
            'python scripts/blea-prod-validation.py'
          ]
        })
      ]
    });

    // パイプライン失敗通知
    this.setupFailureNotifications(pipeline);
  }

  private setupFailureNotifications(pipeline: pipelines.CodePipeline) {
    const notificationTopic = new sns.Topic(this, 'PipelineFailureNotifications', {
      topicName: 'ChatApp-Pipeline-Failures'
    });

    // Slack統合
    new chatbot.SlackChannelConfiguration(this, 'PipelineSlackNotifications', {
      slackChannelConfigurationName: 'chatapp-pipeline-alerts',
      slackWorkspaceId: process.env.SLACK_WORKSPACE_ID!,
      slackChannelId: process.env.SLACK_CHANNEL_ID!,
      notificationTopics: [notificationTopic]
    });

    // パイプライン失敗時の通知ルール
    pipeline.pipeline.onStateChange('PipelineFailure', {
      target: new targets.SnsTopic(notificationTopic),
      eventPattern: {
        detail: {
          state: ['FAILED']
        }
      }
    });
  }
}

// アプリケーションステージ
export class ChatAppStage extends cdk.Stage {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: ChatAppStageProps) {
    super(scope, id, props);

    // BLEA ガバナンススタック
    const governanceStack = new BLEAGovernanceStack(this, 'Governance', props);

    // VPCスタック
    const vpcStack = new BLEAVPCStack(this, 'VPC', {
      ...props,
      bleaContext: governanceStack
    });

    // データベーススタック
    const databaseStack = new BLEAAuroraStack(this, 'Database', {
      ...props,
      vpc: vpcStack.vpc,
      securityGroups: vpcStack.securityGroups
    });

    // アプリケーションスタック
    const appStack = new ChatAppAPIStack(this, 'API', {
      ...props,
      vpc: vpcStack.vpc,
      database: databaseStack.cluster,
      databaseSecret: databaseStack.secret
    });

    this.apiUrl = appStack.api.url;

    // BLEA準拠の依存関係設定
    vpcStack.addDependency(governanceStack);
    databaseStack.addDependency(vpcStack);
    appStack.addDependency(databaseStack);
  }
}
```

### 2. GitHub Actions ワークフロー

```yaml
# .github/workflows/blea-cicd.yml
name: BLEA Integrated CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

permissions:
  id-token: write
  contents: read
  security-events: write

env:
  AWS_REGION: ap-northeast-1
  NODE_VERSION: 18
  PYTHON_VERSION: 3.11

jobs:
  security-scan:
    name: Security Scanning
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          npm ci
          pip install -r requirements.txt
          pip install bandit safety semgrep

      - name: Run npm audit
        run: npm audit --audit-level high

      - name: Run Python security scan
        run: |
          bandit -r backend/ -f json -o bandit-report.json || true
          safety check --json --output safety-report.json || true

      - name: Run Semgrep SAST
        run: |
          semgrep --config=auto --json --output=semgrep-report.json . || true

      - name: Upload security scan results
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: semgrep-report.json

      - name: Check security thresholds
        run: |
          python scripts/security-gate-check.py \
            --bandit-report bandit-report.json \
            --safety-report safety-report.json \
            --semgrep-report semgrep-report.json

  infrastructure-scan:
    name: Infrastructure Security Scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Install security scanners
        run: |
          npm install -g @aws-cdk/cli
          pip install checkov

      - name: Synthesize CDK
        run: |
          npm run build
          npx cdk synth --all

      - name: Run Checkov scan
        run: |
          checkov -d cdk.out --framework cloudformation \
            --output json --output-file checkov-report.json || true

      - name: Run CDK security analysis
        run: |
          python scripts/cdk-security-analysis.py \
            --cdk-out cdk.out \
            --output cdk-security-report.json

      - name: Check infrastructure security
        run: |
          python scripts/infrastructure-security-gate.py \
            --checkov-report checkov-report.json \
            --cdk-report cdk-security-report.json

  blea-compliance:
    name: BLEA Compliance Check
    runs-on: ubuntu-latest
    needs: [security-scan, infrastructure-scan]
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install BLEA tools
        run: |
          pip install boto3 botocore
          git clone https://github.com/aws-samples/baseline-environment-on-aws.git
          pip install -r baseline-environment-on-aws/requirements.txt

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Run BLEA compliance check
        run: |
          python scripts/blea-compliance-validator.py \
            --config baseline-environment-on-aws/config \
            --output blea-compliance-report.json

      - name: Validate security standards
        run: |
          python scripts/security-standards-check.py \
            --standards cis-aws-foundations \
            --output security-standards-report.json

      - name: Upload compliance reports
        uses: actions/upload-artifact@v3
        with:
          name: compliance-reports
          path: |
            blea-compliance-report.json
            security-standards-report.json

  deploy-pipeline:
    name: Deploy CDK Pipeline
    runs-on: ubuntu-latest
    needs: [blea-compliance]
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_PIPELINE_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Deploy pipeline
        run: |
          npm run build
          npx cdk deploy ChatApp-Pipeline-Stack \
            --require-approval never \
            --context blea-enabled=true

      - name: Verify pipeline deployment
        run: |
          python scripts/pipeline-health-check.py \
            --pipeline-name ChatApp-BLEA-Pipeline

  notification:
    name: Notification
    runs-on: ubuntu-latest
    needs: [deploy-pipeline]
    if: always()
    steps:
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          channel: '#chatapp-ci-cd'
          webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

### 3. セキュリティチェックスクリプト

```python
# scripts/blea-compliance-validator.py
"""
BLEA準拠性検証スクリプト
"""

import json
import boto3
import argparse
import sys
from typing import Dict, List, Any

class BLEAComplianceValidator:
    def __init__(self, region='ap-northeast-1'):
        self.region = region
        self.config_client = boto3.client('config', region_name=region)
        self.security_hub_client = boto3.client('securityhub', region_name=region)
        self.cloudtrail_client = boto3.client('cloudtrail', region_name=region)
        
    def validate_blea_services(self) -> Dict[str, Any]:
        """BLEAサービスの有効化状況確認"""
        results = {
            'cloudtrail': self.check_cloudtrail_enabled(),
            'config': self.check_config_enabled(),
            'security_hub': self.check_security_hub_enabled(),
            'guardduty': self.check_guardduty_enabled()
        }
        return results
    
    def check_cloudtrail_enabled(self) -> Dict[str, Any]:
        """CloudTrail有効化確認"""
        try:
            trails = self.cloudtrail_client.describe_trails()
            
            active_trails = []
            for trail in trails['trailList']:
                status = self.cloudtrail_client.get_trail_status(
                    Name=trail['TrailARN']
                )
                if status['IsLogging']:
                    active_trails.append({
                        'name': trail['Name'],
                        'is_multi_region': trail.get('IsMultiRegionTrail', False),
                        'include_global_events': trail.get('IncludeGlobalServiceEvents', False)
                    })
            
            return {
                'enabled': len(active_trails) > 0,
                'active_trails': active_trails,
                'compliance_status': 'COMPLIANT' if active_trails else 'NON_COMPLIANT'
            }
        except Exception as e:
            return {
                'enabled': False,
                'error': str(e),
                'compliance_status': 'NON_COMPLIANT'
            }
    
    def check_config_enabled(self) -> Dict[str, Any]:
        """AWS Config有効化確認"""
        try:
            recorders = self.config_client.describe_configuration_recorders()
            delivery_channels = self.config_client.describe_delivery_channels()
            
            active_recorders = []
            for recorder in recorders['ConfigurationRecorders']:
                status = self.config_client.describe_configuration_recorder_status(
                    ConfigurationRecorderNames=[recorder['name']]
                )
                if status['ConfigurationRecordersStatus'][0]['recording']:
                    active_recorders.append(recorder['name'])
            
            return {
                'enabled': len(active_recorders) > 0 and len(delivery_channels['DeliveryChannels']) > 0,
                'active_recorders': active_recorders,
                'delivery_channels': len(delivery_channels['DeliveryChannels']),
                'compliance_status': 'COMPLIANT' if active_recorders and delivery_channels['DeliveryChannels'] else 'NON_COMPLIANT'
            }
        except Exception as e:
            return {
                'enabled': False,
                'error': str(e),
                'compliance_status': 'NON_COMPLIANT'
            }
    
    def check_security_hub_enabled(self) -> Dict[str, Any]:
        """Security Hub有効化確認"""
        try:
            hub = self.security_hub_client.describe_hub()
            standards = self.security_hub_client.get_enabled_standards()
            
            return {
                'enabled': True,
                'hub_arn': hub['HubArn'],
                'enabled_standards': len(standards['StandardsSubscriptions']),
                'compliance_status': 'COMPLIANT'
            }
        except self.security_hub_client.exceptions.InvalidAccessException:
            return {
                'enabled': False,
                'error': 'Security Hub not enabled',
                'compliance_status': 'NON_COMPLIANT'
            }
        except Exception as e:
            return {
                'enabled': False,
                'error': str(e),
                'compliance_status': 'NON_COMPLIANT'
            }
    
    def check_guardduty_enabled(self) -> Dict[str, Any]:
        """GuardDuty有効化確認"""
        try:
            guardduty_client = boto3.client('guardduty', region_name=self.region)
            detectors = guardduty_client.list_detectors()
            
            active_detectors = []
            for detector_id in detectors['DetectorIds']:
                detector = guardduty_client.get_detector(DetectorId=detector_id)
                if detector['Status'] == 'ENABLED':
                    active_detectors.append({
                        'detector_id': detector_id,
                        'finding_frequency': detector['FindingPublishingFrequency'],
                        'data_sources': detector.get('DataSources', {})
                    })
            
            return {
                'enabled': len(active_detectors) > 0,
                'active_detectors': active_detectors,
                'compliance_status': 'COMPLIANT' if active_detectors else 'NON_COMPLIANT'
            }
        except Exception as e:
            return {
                'enabled': False,
                'error': str(e),
                'compliance_status': 'NON_COMPLIANT'
            }
    
    def validate_config_rules(self) -> Dict[str, Any]:
        """AWS Config Rules準拠性確認"""
        try:
            rules = self.config_client.describe_config_rules()
            compliance_results = {}
            
            for rule in rules['ConfigRules']:
                try:
                    compliance = self.config_client.get_compliance_details_by_config_rule(
                        ConfigRuleName=rule['ConfigRuleName']
                    )
                    
                    compliance_summary = {
                        'compliant': 0,
                        'non_compliant': 0,
                        'not_applicable': 0
                    }
                    
                    for result in compliance['EvaluationResults']:
                        status = result['ComplianceType'].lower().replace('_', ' ')
                        if status in compliance_summary:
                            compliance_summary[status] += 1
                    
                    compliance_results[rule['ConfigRuleName']] = {
                        'source': rule['Source']['Owner'],
                        'compliance_summary': compliance_summary,
                        'overall_compliance': 'COMPLIANT' if compliance_summary['non_compliant'] == 0 else 'NON_COMPLIANT'
                    }
                except Exception as rule_error:
                    compliance_results[rule['ConfigRuleName']] = {
                        'error': str(rule_error),
                        'overall_compliance': 'ERROR'
                    }
            
            return {
                'total_rules': len(rules['ConfigRules']),
                'rule_details': compliance_results,
                'overall_compliance': 'COMPLIANT' if all(
                    result.get('overall_compliance') == 'COMPLIANT' 
                    for result in compliance_results.values()
                ) else 'NON_COMPLIANT'
            }
        except Exception as e:
            return {
                'error': str(e),
                'overall_compliance': 'ERROR'
            }
    
    def generate_compliance_report(self) -> Dict[str, Any]:
        """総合BLEA準拠性レポート生成"""
        print("Validating BLEA compliance...")
        
        blea_services = self.validate_blea_services()
        config_rules = self.validate_config_rules()
        
        # 総合判定
        service_compliance = all(
            service['compliance_status'] == 'COMPLIANT' 
            for service in blea_services.values()
        )
        
        rules_compliance = config_rules.get('overall_compliance') == 'COMPLIANT'
        
        overall_compliance = service_compliance and rules_compliance
        
        report = {
            'timestamp': boto3.Session().get_available_regions('ec2')[0],  # placeholder
            'region': self.region,
            'blea_services': blea_services,
            'config_rules': config_rules,
            'overall_compliance': 'COMPLIANT' if overall_compliance else 'NON_COMPLIANT',
            'recommendations': self.generate_recommendations(blea_services, config_rules)
        }
        
        return report
    
    def generate_recommendations(self, services: Dict, rules: Dict) -> List[str]:
        """改善推奨事項生成"""
        recommendations = []
        
        for service_name, service_status in services.items():
            if service_status['compliance_status'] != 'COMPLIANT':
                recommendations.append(f"Enable {service_name.title()} service")
        
        if rules.get('overall_compliance') != 'COMPLIANT':
            recommendations.append("Review and remediate non-compliant Config Rules")
        
        return recommendations

def main():
    parser = argparse.ArgumentParser(description='BLEA Compliance Validator')
    parser.add_argument('--region', default='ap-northeast-1', help='AWS Region')
    parser.add_argument('--output', required=True, help='Output JSON file')
    
    args = parser.parse_args()
    
    try:
        validator = BLEAComplianceValidator(region=args.region)
        report = validator.generate_compliance_report()
        
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        print(f"Compliance report generated: {args.output}")
        print(f"Overall compliance: {report['overall_compliance']}")
        
        # 非準拠の場合は終了コード1で終了
        if report['overall_compliance'] != 'COMPLIANT':
            print("BLEA compliance validation failed!")
            sys.exit(1)
        else:
            print("BLEA compliance validation passed!")
            
    except Exception as e:
        print(f"Error during validation: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## 検証項目

- [ ] GitHub Actions ワークフローが正常に実行される
- [ ] セキュリティスキャンが機能する
- [ ] CDK Pipeline が作成される
- [ ] 自動デプロイが機能する
- [ ] セキュリティゲートが機能する
- [ ] 手動承認プロセスが動作する
- [ ] BLEA準拠性チェックが実行される
- [ ] 失敗時通知が機能する
- [ ] Slack統合が動作する

## セキュリティ考慮事項

- [ ] OIDC認証の適切な設定
- [ ] 最小権限IAMロールの実装
- [ ] シークレット管理の徹底
- [ ] セキュリティスキャンの閾値設定
- [ ] パイプライン監査ログの記録
- [ ] デプロイ承認プロセスの実装

## 次のタスクへの引き継ぎ事項

- CI/CDパイプライン設定詳細
- セキュリティスキャン結果
- デプロイ戦略情報
- 監視・アラート設定状況

## 参考資料

- [AWS CDK Pipelines](https://docs.aws.amazon.com/cdk/v2/guide/cdk_pipeline.html)
- [GitHub Actions OIDC](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [AWS DevSecOps](https://aws.amazon.com/solutions/implementations/devsecops-on-aws/)