# Task: Lambda + API Gateway実装（BLEA準拠）

**実施期間**: Month 1 Week 2 (Day 1-2)  
**推定工数**: 8時間  
**優先度**: 高  

## 概要

BLEAセキュリティ要件を満たすサーバーレスAPIを実装し、Lambda関数とAPI Gatewayの基本機能を構築する。

## 学習目標

- BLEA準拠のLambda実装パターン
- API GatewayとWAFの統合
- セキュリティログとX-Ray統合
- AWS Lambda Powertoolsの活用

## 前提条件

- BLEA基盤構築完了
- VPCとセキュリティ基盤構築完了

## タスク詳細

### Day 1: BLEA準拠Lambda実装

#### 1. Lambda関数の基本構造作成 (3時間)
- [ ] Lambda関数用のディレクトリ構造作成
- [ ] AWS Lambda Powertoolsセットアップ
- [ ] BLEA準拠のログ設定
- [ ] エラーハンドリングパターン実装

#### 2. 認証・認可機能実装 (3時間)
- [ ] JWT トークン検証機能
- [ ] Cognito統合認証
- [ ] セキュリティ監査ログ
- [ ] レート制限対応

#### 3. API Gateway基本設定 (2時間)
- [ ] REST API作成
- [ ] CORS設定
- [ ] レスポンス形式標準化
- [ ] エラーレスポンス統一

### Day 2: WAF統合とセキュリティ強化

#### 1. WAF統合設定 (2時間)
- [ ] AWS WAF ACL作成
- [ ] 共通攻撃パターン防御ルール
- [ ] レート制限ルール
- [ ] API Gateway への WAF 関連付け

#### 2. X-Ray統合とモニタリング (3時間)
- [ ] X-Ray トレース有効化
- [ ] カスタムメトリクス実装
- [ ] CloudWatch ログ統合
- [ ] アラート設定

#### 3. セキュリティ監査ログ (3時間)
- [ ] API コールログ記録
- [ ] セキュリティイベント記録
- [ ] BLEA Security Hub 統合
- [ ] 監査証跡設定

### MCP サーバ活用

```
💬 "概要設計書のBLEA統合設計に従って、Lambda関数とAPI Gatewayを実装してください。
BLEA統制システムとの連携、セキュリティログ、X-Ray統合を含めてください。"
```

## 成果物

### 1. Lambda関数実装

#### 認証ハンドラー
```python
# backend/auth/handler.py
import json
import boto3
import os
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.metrics import MetricUnit

logger = Logger()
tracer = Tracer()
metrics = Metrics()

@tracer.capture_lambda_handler
@logger.inject_lambda_context(correlation_id_path=correlation_paths.API_GATEWAY_REST)
@metrics.log_metrics
def lambda_handler(event, context):
    """
    BLEA準拠認証処理
    """
    try:
        # JWT トークン検証
        token = extract_token_from_event(event)
        user_info = validate_jwt_token(token)
        
        # セキュリティ監査ログ
        log_authentication_event(user_info, event)
        
        # メトリクス記録
        metrics.add_metric(name="AuthenticationSuccess", unit=MetricUnit.Count, value=1)
        
        return create_success_response(user_info)
        
    except Exception as e:
        logger.error(f"Authentication failed: {str(e)}")
        metrics.add_metric(name="AuthenticationFailed", unit=MetricUnit.Count, value=1)
        
        # セキュリティイベント記録
        send_security_event("authentication_failed", event, str(e))
        
        return create_error_response(401, "Authentication failed")

def validate_jwt_token(token):
    """Cognito JWT トークン検証"""
    # JWT検証ロジック
    pass

def log_authentication_event(user_info, event):
    """BLEA監査ログ記録"""
    logger.info("Authentication event", extra={
        "user_id": user_info.get("sub"),
        "source_ip": event.get("sourceIp"),
        "user_agent": event.get("userAgent"),
        "request_id": context.aws_request_id
    })

def send_security_event(event_type, event, error_details):
    """Security Hub にセキュリティイベント送信"""
    # Security Hub 連携ロジック
    pass
```

#### メッセージハンドラー
```python
# backend/messages/handler.py
import json
import boto3
from aws_lambda_powertools import Logger, Tracer, Metrics
from botocore.exceptions import ClientError

logger = Logger()
tracer = Tracer()
metrics = Metrics()

@tracer.capture_lambda_handler
@logger.inject_lambda_context
@metrics.log_metrics
def send_message(event, context):
    """
    BLEA準拠メッセージ送信処理
    """
    try:
        # リクエスト検証
        if not validate_message_request(event):
            return create_error_response(400, "Invalid request")
        
        # Secrets Manager から DB 認証情報取得
        db_credentials = get_db_credentials_from_secrets_manager()
        
        # メッセージ保存
        message_id = save_message_to_database(event, db_credentials)
        
        # EventBridge でリアルタイム配信
        publish_to_eventbridge(event, message_id)
        
        # 成功メトリクス
        metrics.add_metric(name="MessagesSent", unit=MetricUnit.Count, value=1)
        
        return create_success_response({"message_id": message_id})
        
    except Exception as e:
        logger.error(f"Failed to send message: {str(e)}")
        metrics.add_metric(name="MessageErrors", unit=MetricUnit.Count, value=1)
        return create_error_response(500, "Internal server error")
```

### 2. API Gateway設定

#### CDK実装
```typescript
// lib/api/api-gateway-stack.ts
export class ChatAppAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ChatAppAPIStackProps) {
    super(scope, id, props);

    // WAF ACL作成
    const webAcl = new wafv2.CfnWebACL(this, 'ChatAppWebACL', {
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
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
        }
      ]
    });

    // API Gateway作成
    const api = new apigateway.RestApi(this, 'ChatAppAPI', {
      restApiName: 'ChatApp REST API',
      description: 'BLEA統合チャットアプリAPI',
      endpointTypes: [apigateway.EndpointType.REGIONAL],
      cloudWatchRole: true,
      deployOptions: {
        stageName: 'v1',
        tracingEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        accessLogDestination: new apigateway.LogGroupLogDestination(logGroup),
        accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields()
      }
    });

    // WAF関連付け
    new wafv2.CfnWebACLAssociation(this, 'WebACLAssociation', {
      resourceArn: api.deploymentStage.stageArn,
      webAclArn: webAcl.attrArn
    });
  }
}
```

## 検証項目

- [ ] Lambda関数が正常に動作する
- [ ] API Gatewayでリクエストが処理される
- [ ] JWT認証が機能する
- [ ] WAFルールが適用される
- [ ] X-Rayトレースが記録される
- [ ] CloudWatchログが出力される
- [ ] セキュリティメトリクスが記録される
- [ ] エラーハンドリングが適切に動作する

## セキュリティ考慮事項

- [ ] 最小権限IAMロール設定
- [ ] 環境変数の暗号化
- [ ] Secrets Manager使用
- [ ] VPC内Lambda配置
- [ ] セキュリティヘッダー設定
- [ ] レート制限実装

## 次のタスクへの引き継ぎ事項

- Lambda関数ARN一覧
- API GatewayエンドポイントURL
- IAMロール設定情報
- セキュリティ設定詳細

## 参考資料

- [AWS Lambda Powertools](https://awslabs.github.io/aws-lambda-powertools-python/)
- [API Gateway セキュリティ](https://docs.aws.amazon.com/apigateway/latest/developerguide/security.html)
- [AWS WAF 開発者ガイド](https://docs.aws.amazon.com/waf/latest/developerguide/)