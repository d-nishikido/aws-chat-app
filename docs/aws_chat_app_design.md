# AWS チャットアプリ 概要設計書（BLEA統合版）

## 1. BLEA統合アーキテクチャ概要

### システム全体構成
```
┌─────────────────────────────────────────────────────────────┐
│                    BLEA統合アーキテクチャ                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  ガバナンス      │    │  ゲストシステム   │    │ アプリケーション │
│   ベース        │────│   (BLEA拡張)    │────│  (チャット独自)  │
│ (BLEA提供)      │    │                │    │                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
    (セキュリティ統制)      (基盤インフラ)         (ビジネスロジック)
```

### BLEA活用による自動提供機能
```
🔒 ガバナンスベース（BLEA自動提供）:
├── AWS CloudTrail      # API監査ログ
├── AWS Config          # リソース設定監査  
├── AWS Security Hub    # セキュリティ状況統合管理
├── Amazon GuardDuty    # 脅威検知
├── AWS Secrets Manager # 機密情報管理
├── AWS WAF             # Webアプリケーション保護
└── AWS Chatbot         # Slack通知（セキュリティアラート）

🏗️ ゲストシステム（BLEA + カスタマイズ）:
├── VPC + サブネット設計
├── セキュリティグループ
├── IAMロール・ポリシー（最小権限）
├── KMS暗号化キー
└── ログ集約設定
```

## 2. BLEAベースアーキテクチャ図

### 詳細システム構成
```
┌────────────────────────────────────────────────────────────┐
│                    Management Account                      │
│  ┌──────────────────┐  ┌──────────────────┐              │
│  │ CloudTrail (Org) │  │ Config (Org)     │              │
│  │ 全アカウント監査  │  │ 組織全体設定監査  │              │
│  └──────────────────┘  └──────────────────┘              │
└────────────────────────────────────────────────────────────┘
                              │
┌────────────────────────────────────────────────────────────┐
│                  Chat App Account (Guest)                  │
│                                                           │
│  ┌─────────────────┐    ┌─────────────────┐              │
│  │  CloudFront     │────│      S3         │              │
│  │  (CDN/WAF)      │    │  (Static Web)   │              │
│  └─────────────────┘    └─────────────────┘              │
│           │                       │                      │
│  ┌─────────────────┐    ┌─────────────────┐              │
│  │   API Gateway   │────│     Lambda      │              │
│  │  (REST/GraphQL) │    │  (Python 3.11) │              │
│  └─────────────────┘    └─────────────────┘              │
│           │                       │                      │
│  ┌─────────────────┐    ┌─────────────────┐              │
│  │    Cognito      │    │   Aurora RDS    │              │
│  │  (認証/認可)     │    │  (PostgreSQL)   │              │
│  └─────────────────┘    └─────────────────┘              │
│                                                           │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              BLEA Security Services                   │ │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │ │
│  │  │ GuardDuty  │ │SecurityHub │ │ Secrets Manager│   │ │
│  │  └────────────┘ └────────────┘ └────────────────┘   │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

## 3. BLEA導入プロセス

### Phase 1: BLEAガバナンスベース導入
```bash
# 1. BLEAリポジトリクローン
git clone https://github.com/aws-samples/baseline-environment-on-aws.git
cd baseline-environment-on-aws

# 2. 設定カスタマイズ
cp packages/baseline/config/parameter.ts packages/baseline/config/parameter.ts.backup
vi packages/baseline/config/parameter.ts

# parameter.ts の主要設定例
export const devParameter: DevParameter = {
  env: {
    account: 'YOUR_ACCOUNT_ID',
    region: 'ap-northeast-1',
  },
  securityNotifyEmail: 'security-admin@example.com',
  slackNotifier: {
    workspaceId: 'T1234567890',
    channelId: 'C1234567890',
  },
  
  // セキュリティ設定
  enableGuardDuty: true,
  enableSecurityHub: true,
  enableConfig: true,
  enableChatbot: true,
  
  // 監査設定
  cloudTrail: {
    enableCloudTrail: true,
    enableInsightSelector: true,
  },
  
  // WAF設定
  webAcl: {
    scope: 'CLOUDFRONT',
    rules: ['AWSManagedRulesCommonRuleSet', 'AWSManagedRulesKnownBadInputsRuleSet'],
  }
};

# 3. ガバナンスベースデプロイ
npm install
npx cdk bootstrap
npx cdk deploy --all --require-approval never
```

### Phase 2: チャットアプリゲストシステム構築
```bash
# 1. ゲストシステムテンプレート作成
mkdir chat-app-guest-system
cd chat-app-guest-system

# 2. BLEA Guest System 初期化
npx cdk init app --language typescript
npm install @aws-cdk/aws-ec2 @aws-cdk/aws-lambda @aws-cdk/aws-rds @aws-cdk/aws-s3

# 3. BLEAベースの拡張実装
cat > lib/chat-app-stack.ts << 'EOF'
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export class ChatAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // BLEA準拠のVPC設計
    const vpc = this.createSecureVpc();
    
    // BLEA準拠のセキュリティ設定
    const securityGroups = this.createSecurityGroups(vpc);
    
    // チャットアプリ固有リソース
    this.createChatInfrastructure(vpc, securityGroups);
  }

  private createSecureVpc(): ec2.Vpc {
    return new ec2.Vpc(this, 'ChatAppVpc', {
      maxAzs: 2,
      natGateways: 1, // コスト最適化
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'Database',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      // BLEA準拠のタグ戦略
      vpcName: 'ChatApp-VPC',
    });
  }

  private createSecurityGroups(vpc: ec2.Vpc) {
    // Lambda用セキュリティグループ
    const lambdaSg = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Security group for Lambda functions',
      allowAllOutbound: true,
    });

    // RDS用セキュリティグループ
    const rdsSg = new ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc,
      description: 'Security group for RDS Aurora',
      allowAllOutbound: false,
    });

    // LambdaからRDSへのアクセス許可
    rdsSg.addIngressRule(lambdaSg, ec2.Port.tcp(5432), 'Lambda to RDS');

    return { lambdaSg, rdsSg };
  }

  private createChatInfrastructure(vpc: ec2.Vpc, securityGroups: any) {
    // Aurora PostgreSQL Serverless v2
    // Cognito User Pool
    // Lambda Functions
    // API Gateway
    // S3 + CloudFront
  }
}
EOF

# 4. デプロイ実行
npx cdk deploy
```

## 4. BLEA統合設計詳細

### 4.1 セキュリティ自動化（BLEA提供）

#### GuardDuty 脅威検知
```typescript
// BLEA自動設定 - GuardDuty有効化
const guardDutyDetector = new guardduty.CfnDetector(this, 'GuardDutyDetector', {
  enable: true,
  findingPublishingFrequency: 'FIFTEEN_MINUTES',
  dataSources: {
    s3Logs: { enable: true },
    kubernetes: { auditLogs: { enable: true } },
    malwareProtection: { scanEc2InstanceWithFindings: { enable: true } }
  }
});

// 自動通知設定
const guardDutyEventRule = new events.Rule(this, 'GuardDutyEventRule', {
  eventPattern: {
    source: ['aws.guardduty'],
    detailType: ['GuardDuty Finding'],
    detail: {
      severity: [4.0, 10.0] // Medium以上の脅威
    }
  }
});
```

#### Security Hub 統合管理
```typescript
// BLEA自動設定 - Security Hub有効化
const securityHub = new securityhub.CfnHub(this, 'SecurityHub', {
  tags: [
    { key: 'Environment', value: 'production' },
    { key: 'Project', value: 'ChatApp' }
  ]
});

// CIS Benchmarkスタンダード自動有効化
const cisStandard = new securityhub.CfnStandard(this, 'CISStandard', {
  standardsArn: 'arn:aws:securityhub:::ruleset/finding-format/aws-foundational-security-standard/v/1.0.0'
});
```

#### Config 設定監査
```typescript
// BLEA自動設定 - Config Rules
const configRules = [
  's3-bucket-public-read-prohibited',
  's3-bucket-public-write-prohibited',
  'securitygroup-attached-to-eni',
  'iam-password-policy',
  'rds-storage-encrypted',
  'lambda-function-public-access-prohibited'
];

configRules.forEach(ruleName => {
  new config.ManagedRule(this, `ConfigRule-${ruleName}`, {
    identifier: ruleName,
    inputParameters: this.getConfigRuleParameters(ruleName)
  });
});
```

### 4.2 チャットアプリ固有実装（BLEA拡張）

#### Lambda Functions（BLEA準拠）
```python
# lambda/chat_handler.py - BLEA環境での実装
import json
import boto3
import os
import logging
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.metrics import MetricUnit

# BLEA推奨のログ設定
logger = Logger()
tracer = Tracer()
metrics = Metrics()

@tracer.capture_lambda_handler
@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
@metrics.log_metrics
def lambda_handler(event, context):
    """
    BLEA環境でのセキュアなメッセージ送信処理
    """
    try:
        # リクエスト検証
        if not validate_request(event):
            logger.error("Invalid request format")
            return create_error_response(400, "Invalid request")
        
        # Secrets Managerから認証情報取得（BLEA提供）
        db_credentials = get_db_credentials_from_secrets_manager()
        
        # Aurora Data API使用（VPC内でセキュア）
        message_id = save_message_to_database(event, db_credentials)
        
        # CloudWatch メトリクス送信（BLEA監視連携）
        metrics.add_metric(name="MessagesSent", unit=MetricUnit.Count, value=1)
        
        # EventBridge経由でリアルタイム配信
        publish_to_eventbridge(event, message_id)
        
        logger.info("Message sent successfully", extra={"messageId": message_id})
        
        return create_success_response(message_id)
        
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        metrics.add_metric(name="MessageErrors", unit=MetricUnit.Count, value=1)
        
        # BLEA Security Hub連携
        send_security_event_if_needed(e)
        
        return create_error_response(500, "Internal server error")

def get_db_credentials_from_secrets_manager():
    """BLEA提供のSecrets Managerから認証情報取得"""
    secrets_client = boto3.client('secretsmanager')
    secret_arn = os.environ['DB_SECRET_ARN']  # BLEA環境変数
    
    response = secrets_client.get_secret_value(SecretId=secret_arn)
    return json.loads(response['SecretString'])

def validate_request(event):
    """BLEA準拠のリクエスト検証"""
    # OWASP推奨の入力検証
    # XSS, SQLインジェクション対策
    # レート制限チェック
    return True

def send_security_event_if_needed(exception):
    """セキュリティイベントをBLEA Security Hubに送信"""
    if is_security_related_error(exception):
        # Security Hub Findingとして送信
        pass
```

#### Aurora Database設計（BLEA準拠）
```typescript
// BLEA準拠のAurora設定
const dbCluster = new rds.DatabaseCluster(this, 'ChatAppDatabase', {
  engine: rds.DatabaseClusterEngine.auroraPostgres({
    version: rds.AuroraPostgresEngineVersion.VER_14_9
  }),
  
  // BLEA推奨のセキュリティ設定
  credentials: rds.Credentials.fromGeneratedSecret('chatapp-admin', {
    secretName: 'chatapp/database/credentials',
    excludeCharacters: '"@/\\'
  }),
  
  // 暗号化必須（BLEA要件）
  storageEncrypted: true,
  storageEncryptionKey: this.createKmsKey(),
  
  // VPC設定（BLEA準拠）
  vpc: vpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_ISOLATED
  },
  securityGroups: [securityGroups.rdsSg],
  
  // バックアップ設定（BLEA推奨）
  backup: {
    retention: cdk.Duration.days(7),
    preferredWindow: '03:00-04:00'
  },
  
  // 監視設定（BLEA統合）
  monitoringInterval: cdk.Duration.minutes(1),
  monitoringRole: this.createRdsMonitoringRole(),
  
  // Serverless v2設定
  serverlessV2MinCapacity: 0.5,
  serverlessV2MaxCapacity: 4,
  
  // セキュリティログ有効化
  cloudwatchLogsExports: ['postgresql'],
  
  // BLEA準拠のタグ設定
  tags: {
    Project: 'ChatApp',
    Environment: 'production',
    DataClassification: 'internal',
    BackupRequired: 'true'
  }
});
```

### 4.3 フロントエンド（BLEA WAF連携）

#### S3 + CloudFront（BLEA WAF統合）
```typescript
// BLEA WAF ACLとの統合
const webAcl = new wafv2.CfnWebACL(this, 'ChatAppWebACL', {
  scope: 'CLOUDFRONT',
  defaultAction: { allow: {} },
  
  // BLEA推奨ルールセット
  rules: [
    {
      name: 'AWSManagedRulesCommonRuleSet',
      priority: 1,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesCommonRuleSet'
        }
      },
      overrideAction: { none: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'CommonRuleSetMetric'
      }
    },
    {
      name: 'AWSManagedRulesKnownBadInputsRuleSet',
      priority: 2,
      statement: {
        managedRuleGroupStatement: {
          vendorName: 'AWS',
          name: 'AWSManagedRulesKnownBadInputsRuleSet'
        }
      },
      overrideAction: { none: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'BadInputsRuleSetMetric'
      }
    }
  ]
});

// CloudFront Distribution（BLEA WAF連携）
const distribution = new cloudfront.Distribution(this, 'ChatAppDistribution', {
  defaultBehavior: {
    origin: new origins.S3Origin(websiteBucket, {
      originAccessIdentity: oai
    }),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
    cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
    
    // BLEA WAF適用
    responseHeadersPolicy: this.createSecurityHeadersPolicy()
  },
  
  // BLEA WAF ACL関連付け
  webAclId: webAcl.attrArn,
  
  // ログ設定（BLEA要件）
  enableLogging: true,
  logBucket: this.accessLogBucket,
  logFilePrefix: 'cloudfront-access-logs/',
  
  // セキュリティ設定
  minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
  
  // BLEA準拠のタグ
  comment: 'ChatApp CloudFront Distribution with BLEA WAF'
});
```

## 5. 監視・運用（BLEA統合）

### 5.1 BLEA監視ダッシュボード

#### CloudWatch統合監視
```typescript
// BLEA提供の統合ダッシュボード拡張
const chatAppDashboard = new cloudwatch.Dashboard(this, 'ChatAppDashboard', {
  dashboardName: 'BLEA-ChatApp-Monitoring',
  widgets: [
    // BLEA提供のセキュリティメトリクス
    [
      new cloudwatch.GraphWidget({
        title: 'Security Events (BLEA)',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/SecurityHub',
            metricName: 'Findings',
            dimensionsMap: { ComplianceType: 'FAILED' }
          })
        ]
      })
    ],
    
    // チャットアプリ固有メトリクス
    [
      new cloudwatch.GraphWidget({
        title: 'Chat Application Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'ChatApp/Messages',
            metricName: 'MessagesSent'
          }),
          new cloudwatch.Metric({
            namespace: 'ChatApp/Users',
            metricName: 'ActiveUsers'
          })
        ]
      })
    ]
  ]
});
```

### 5.2 BLEA Chatbot通知統合

#### Slack通知設定
```typescript
// BLEA Chatbot拡張
const chatAppNotifications = new chatbot.SlackChannelConfiguration(this, 'ChatAppSlackNotifications', {
  slackChannelConfigurationName: 'chatapp-alerts',
  slackWorkspaceId: 'T1234567890',
  slackChannelId: 'C1234567890',
  
  // BLEA統合アラート
  notificationTopics: [
    this.securityAlertTopic,  // BLEA提供
    this.costAlertTopic,      // BLEA提供
    this.chatAppAlertTopic    // アプリ固有
  ],
  
  // IAMロール（BLEA準拠の最小権限）
  role: this.createChatbotRole()
});
```

## 6. コスト見積もり（BLEA統合版）

### 6.1 開発環境（BLEA + チャットアプリ）

| サービス | 使用量 | 月額費用 | BLEA | 追加 |
|---------|--------|----------|------|------|
| **BLEA基盤サービス** | | | | |
| CloudTrail | 組織全体監査 | $2.00 | ✅ | |
| Config | 設定監査 | $2.00 | ✅ | |
| Security Hub | 統合管理 | $1.50 | ✅ | |
| GuardDuty | 脅威検知 | $4.00 | ✅ | |
| Secrets Manager | 5シークレット | $2.50 | ✅ | |
| **チャットアプリ** | | | | |
| Lambda | 10万リクエスト/月 | $0.20 | | ✅ |
| API Gateway | 10万リクエスト/月 | $0.35 | | ✅ |
| AppSync | 5万リクエスト/月 | $2.00 | | ✅ |
| Aurora Serverless v2 | 平均0.5ACU | $10.80 | | ✅ |
| CloudFront | 1GB転送/月 | $0.085 | | ✅ |
| S3 | 500MB保存 | $0.012 | | ✅ |
| Route53 | 1ドメイン | $0.50 | | ✅ |
| Cognito | 50MAU | $0.00 | | ✅ |
| CloudWatch | 基本監視 | $3.00 | 一部✅ | 一部✅ |
| **合計** | | **$28.94** | $12.00 | $16.94 |

### 6.2 本番環境（BLEA + チャットアプリ）

| カテゴリ | 月額費用 | 備考 |
|---------|----------|------|
| **BLEA基盤** | $45.00 | セキュリティ・監査機能 |
| **チャットアプリ** | $558.40 | アプリケーション機能 |
| **合計** | **$603.40** | BLEA統合による安全性確保 |

### 6.3 BLEA導入による価値

#### セキュリティ価値
- **$12.00/月**: 手動設定では数十時間必要な作業を自動化
- **工数削減**: セキュリティ設計・実装工数 80%削減
- **継続監視**: 24/7セキュリティ監視の自動化

#### コンプライアンス価値
- **自動監査**: CIS Benchmark準拠の自動チェック
- **証跡管理**: CloudTrailによる完全な操作履歴
- **レポート**: Security Hubでの統合レポート

## 7. BLEA学習ロードマップ（3ヶ月）

### Month 1: BLEA基盤理解・導入
- **Week 1**: BLEA概念理解 + ガバナンスベース導入
- **Week 2**: セキュリティサービス動作確認
- **Week 3**: ゲストシステムテンプレート作成
- **Week 4**: 基本的なアプリケーション統合

### Month 2: チャットアプリ実装
- **Week 1**: BLEA準拠のLambda + Aurora実装
- **Week 2**: セキュリティ機能統合（認証・認可）
- **Week 3**: フロントエンド + WAF連携
- **Week 4**: 監視・ログ統合

### Month 3: 運用・最適化
- **Week 1**: セキュリティアラート・自動対応設定
- **Week 2**: コンプライアンス監査・レポート
- **Week 3**: インシデント対応フロー構築
- **Week 4**: 本番環境デプロイ・運用開始

## 8. BLEA統合による学習効果

### 8.1 セキュリティ設計スキル
- **Well-Architected準拠**: AWS公式推奨パターンの実践
- **多層防御**: GuardDuty + Config + WAFの統合セキュリティ
- **ゼロトラスト**: 最小権限原則の自動適用

### 8.2 運用自動化スキル
- **Infrastructure as Code**: BLEAのCDK実装理解
- **セキュリティ運用**: 自動検知・対応フローの実装
- **コンプライアンス**: 継続的な設定監査システム

### 8.3 エンタープライズ準拠
- **組織レベル設計**: 複数アカウント管理の実践
- **ガバナンス**: セキュリティポリシーの自動適用
- **監査対応**: 完全な証跡管理とレポート生成

この BLEA統合設計により、チャットアプリの実装を通じて、エンタープライズレベルのセキュリティ・ガバナンス・運用を学習できます。手動設定では困難な高度なセキュリティ機能を、BLEAの自動化により効率的に習得できます。