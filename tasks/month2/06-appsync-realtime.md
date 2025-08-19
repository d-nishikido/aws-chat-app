# Task: AppSync + EventBridge リアルタイム機能実装

**実施期間**: Month 2 Week 1 (Day 1-2)  
**推定工数**: 8時間  
**優先度**: 高  

## 概要

BLEA監視下でのリアルタイム通信システムを構築し、AppSync GraphQL + Subscriptionsによるリアルタイムチャット機能を実装する。

## 学習目標

- AppSync GraphQLサーバーの設計・実装
- リアルタイムSubscriptionsの実装
- EventBridgeとの統合による疎結合システム設計
- BLEA監視システムとの連携

## 前提条件

- Month 1の全タスク完了
- Aurora Database構築完了
- Lambda + API Gateway実装完了

## タスク詳細

### Day 1: AppSync GraphQL実装

#### 1. AppSync設計とスキーマ定義 (3時間)
- [ ] GraphQLスキーマ設計
- [ ] リゾルバー設計（Lambda/Direct Lambda）
- [ ] Subscription設計
- [ ] セキュリティ設定（Cognito統合）

#### 2. CDKによるAppSync構築 (3時間)
- [ ] AppSync API作成
- [ ] データソース設定（Lambda/Aurora）
- [ ] リゾルバー実装
- [ ] WAF統合設定

#### 3. 基本GraphQL機能実装 (2時間)
- [ ] Query実装（メッセージ取得）
- [ ] Mutation実装（メッセージ送信）
- [ ] BLEA統合ログ設定
- [ ] X-Ray統合

### Day 2: Subscriptions とEventBridge統合

#### 1. リアルタイムSubscriptions実装 (3時間)
- [ ] Message Subscriptions
- [ ] User Status Subscriptions
- [ ] Room Event Subscriptions
- [ ] セキュリティイベントSubscriptions

#### 2. EventBridge統合 (3時間)
- [ ] EventBridge設定
- [ ] カスタムイベントバス
- [ ] イベントルール設定
- [ ] Lambda統合

#### 3. 監視・ログ統合 (2時間)
- [ ] AppSync CloudWatch統合
- [ ] BLEA セキュリティ監視
- [ ] パフォーマンス監視
- [ ] エラートラッキング

### MCP サーバ活用

```
💬 "概要設計書に従って、AppSync GraphQLとSubscriptionsを実装してください。
BLEA監視システムとの統合、セキュリティログ、X-Ray統合を含めてください。
EventBridgeとの連携も実装してください。"
```

## 成果物

### 1. AppSync CDK実装

```typescript
// lib/graphql/appsync-stack.ts
export class ChatAppGraphQLStack extends cdk.Stack {
  public readonly api: appsync.GraphqlApi;
  public readonly eventBus: events.EventBus;

  constructor(scope: Construct, id: string, props: ChatAppGraphQLStackProps) {
    super(scope, id, props);

    // AppSync API作成
    this.api = new appsync.GraphqlApi(this, 'ChatAppGraphQLAPI', {
      name: 'ChatApp-GraphQL-API',
      schema: appsync.SchemaFile.fromAsset('schema/schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
            defaultAction: appsync.UserPoolDefaultAction.ALLOW
          }
        }
      },
      // X-Ray統合
      xrayEnabled: true,
      // ログ設定
      logConfig: {
        level: appsync.LogLevel.ALL,
        retention: logs.RetentionDays.ONE_MONTH
      }
    });

    // EventBridge カスタムバス
    this.eventBus = new events.EventBus(this, 'ChatAppEventBus', {
      eventBusName: 'ChatApp-Events'
    });

    // Aurora データソース
    const auroraDataSource = this.api.addRdsDataSource(
      'AuroraDataSource',
      props.cluster,
      props.databaseSecret,
      'chatapp'
    );

    // Lambda データソース
    const messageLambda = this.createMessageLambda(props);
    const lambdaDataSource = this.api.addLambdaDataSource(
      'MessageLambdaDataSource',
      messageLambda
    );

    // EventBridge データソース
    const eventBridgeDataSource = this.api.addEventBridgeDataSource(
      'EventBridgeDataSource',
      this.eventBus
    );

    // リゾルバー設定
    this.createResolvers(auroraDataSource, lambdaDataSource, eventBridgeDataSource);

    // WAF統合
    this.attachWAF();
  }

  private createMessageLambda(props: ChatAppGraphQLStackProps): lambda.Function {
    return new lambda.Function(this, 'GraphQLMessageHandler', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'handler.lambda_handler',
      code: lambda.Code.fromAsset('backend/graphql'),
      environment: {
        DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
        EVENT_BUS_NAME: this.eventBus.eventBusName,
        SECURITY_HUB_REGION: this.region
      },
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      // BLEA準拠のセキュリティグループ
      securityGroups: [props.lambdaSecurityGroup],
      // X-Ray統合
      tracing: lambda.Tracing.ACTIVE,
      // 監視設定
      deadLetterQueue: new sqs.Queue(this, 'GraphQLDLQ'),
      timeout: cdk.Duration.seconds(30)
    });
  }

  private createResolvers(
    auroraDs: appsync.BaseDataSource,
    lambdaDs: appsync.BaseDataSource,
    eventDs: appsync.BaseDataSource
  ) {
    // Query リゾルバー
    this.api.createResolver('GetMessagesResolver', {
      typeName: 'Query',
      fieldName: 'messages',
      dataSource: auroraDs,
      requestMappingTemplate: appsync.MappingTemplate.fromFile('resolvers/Query.messages.req.vtl'),
      responseMappingTemplate: appsync.MappingTemplate.fromFile('resolvers/Query.messages.res.vtl')
    });

    // Mutation リゾルバー
    this.api.createResolver('SendMessageResolver', {
      typeName: 'Mutation',
      fieldName: 'sendMessage',
      dataSource: lambdaDs,
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult()
    });

    // Subscription リゾルバー
    this.api.createResolver('MessageAddedResolver', {
      typeName: 'Subscription',
      fieldName: 'messageAdded',
      dataSource: eventDs,
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
        {
          "version": "2018-05-29",
          "operation": "PutEvents",
          "events": [
            {
              "source": "chatapp.messages",
              "detailType": "Message Added",
              "detail": $util.toJson($context.arguments)
            }
          ]
        }
      `),
      responseMappingTemplate: appsync.MappingTemplate.fromString('$util.toJson($context.result)')
    });

    // セキュリティイベントSubscription
    this.api.createResolver('SecurityEventResolver', {
      typeName: 'Subscription',
      fieldName: 'securityEventAdded',
      dataSource: eventDs
    });
  }

  private attachWAF() {
    const webAcl = new wafv2.CfnWebACL(this, 'GraphQLWebACL', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      rules: [
        {
          name: 'AWSManagedRulesGraphQLRuleSet',
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
            metricName: 'GraphQLRuleSetMetric'
          }
        },
        // GraphQL特有の攻撃パターン対策
        {
          name: 'GraphQLDepthLimit',
          priority: 2,
          statement: {
            byteMatchStatement: {
              searchString: 'query',
              fieldToMatch: { body: {} },
              textTransformations: [
                { priority: 0, type: 'LOWERCASE' }
              ],
              positionalConstraint: 'CONTAINS'
            }
          },
          action: { allow: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'GraphQLDepthLimitMetric'
          }
        }
      ]
    });

    // CloudFront ディストリビューションにWAF適用
    new wafv2.CfnWebACLAssociation(this, 'GraphQLWebACLAssociation', {
      resourceArn: `arn:aws:apigateway:${this.region}::/restapis/${this.api.apiId}/stages/*`,
      webAclArn: webAcl.attrArn
    });
  }
}
```

### 2. GraphQLスキーマ定義

```graphql
# schema/schema.graphql
type Query {
  # メッセージ関連
  messages(roomId: ID!, limit: Int = 50, nextToken: String): MessageConnection
  message(id: ID!): Message
  
  # ルーム関連
  rooms(limit: Int = 20): RoomConnection
  room(id: ID!): Room
  
  # ユーザー関連
  me: User
  onlineUsers(roomId: ID!): [OnlineUser]
  
  # BLEA統合セキュリティ
  securityEvents(limit: Int = 50, severity: SecuritySeverity): SecurityEventConnection
  auditLogs(limit: Int = 50): AuditLogConnection
}

type Mutation {
  # メッセージ操作
  sendMessage(input: SendMessageInput!): Message
  editMessage(messageId: ID!, content: String!): Message
  deleteMessage(messageId: ID!): Boolean
  
  # ルーム操作
  createRoom(input: CreateRoomInput!): Room
  joinRoom(roomId: ID!): RoomMember
  leaveRoom(roomId: ID!): Boolean
  
  # ユーザー状態
  updateUserStatus(status: UserStatus!, roomId: ID): Session
  
  # BLEA統合セキュリティ
  reportSecurityEvent(input: SecurityEventInput!): SecurityEvent
}

type Subscription {
  # メッセージ更新
  messageAdded(roomId: ID!): Message
    @aws_subscribe(mutations: ["sendMessage"])
  
  messageUpdated(roomId: ID!): Message
    @aws_subscribe(mutations: ["editMessage"])
  
  messageDeleted(roomId: ID!): MessageDeleted
    @aws_subscribe(mutations: ["deleteMessage"])
  
  # ユーザー状態更新
  userStatusChanged(roomId: ID!): OnlineUser
    @aws_subscribe(mutations: ["updateUserStatus"])
  
  # BLEA統合セキュリティイベント
  securityEventAdded: SecurityEvent
    @aws_subscribe(mutations: ["reportSecurityEvent"])
  
  # システムイベント（管理者向け）
  systemAlert: SystemAlert
    @aws_auth(cognito_groups: ["Administrators"])
}

# 型定義
type Message {
  id: ID!
  content: String!
  messageType: MessageType!
  user: User!
  room: Room!
  replyTo: Message
  isEdited: Boolean!
  createdAt: AWSDateTime!
  updatedAt: AWSDateTime!
}

type User {
  id: ID!
  username: String!
  displayName: String
  email: AWSEmail!
  avatarUrl: AWSURL
  lastLoginAt: AWSDateTime
  isActive: Boolean!
  createdAt: AWSDateTime!
}

type Room {
  id: ID!
  name: String!
  description: String
  roomType: RoomType!
  memberCount: Int!
  lastMessage: Message
  unreadCount: Int
  createdAt: AWSDateTime!
}

# BLEA統合セキュリティ型
type SecurityEvent {
  id: ID!
  eventType: String!
  severity: SecuritySeverity!
  sourceService: String!
  user: User
  sourceIp: String
  eventDetails: AWSJSON!
  createdAt: AWSDateTime!
  resolved: Boolean!
}

type AuditLog {
  id: ID!
  tableName: String!
  operation: String!
  user: User
  changedFields: [String]
  createdAt: AWSDateTime!
}

# 列挙型
enum MessageType {
  TEXT
  IMAGE
  FILE
  SYSTEM
}

enum RoomType {
  PUBLIC
  PRIVATE
  DIRECT
}

enum UserStatus {
  ONLINE
  AWAY
  OFFLINE
}

enum SecuritySeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

# 入力型
input SendMessageInput {
  roomId: ID!
  content: String!
  messageType: MessageType = TEXT
  replyToId: ID
}

input CreateRoomInput {
  name: String!
  description: String
  roomType: RoomType = PUBLIC
}

input SecurityEventInput {
  eventType: String!
  severity: SecuritySeverity!
  sourceService: String!
  eventDetails: AWSJSON!
}

# 接続型
type MessageConnection {
  items: [Message]
  nextToken: String
}

type RoomConnection {
  items: [Room]
  nextToken: String
}

type SecurityEventConnection {
  items: [SecurityEvent]
  nextToken: String
}

type AuditLogConnection {
  items: [AuditLog]
  nextToken: String
}

# イベント型
type MessageDeleted {
  messageId: ID!
  roomId: ID!
  deletedBy: User!
  deletedAt: AWSDateTime!
}

type OnlineUser {
  user: User!
  status: UserStatus!
  lastActivity: AWSDateTime!
}

type SystemAlert {
  id: ID!
  type: String!
  severity: SecuritySeverity!
  message: String!
  createdAt: AWSDateTime!
}
```

### 3. Lambda GraphQL Handler

```python
# backend/graphql/handler.py
import json
import boto3
import os
from datetime import datetime
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit

logger = Logger()
tracer = Tracer()
metrics = Metrics()

# AWS clients
eventbridge = boto3.client('events')
secretsmanager = boto3.client('secretsmanager')
securityhub = boto3.client('securityhub')

@tracer.capture_lambda_handler
@logger.inject_lambda_context
@metrics.log_metrics
def lambda_handler(event, context):
    """
    AppSync GraphQL リゾルバーハンドラー
    """
    try:
        field_name = event['info']['fieldName']
        arguments = event.get('arguments', {})
        
        # BLEA監査ログ記録
        log_graphql_request(event, context)
        
        # フィールド別処理
        if field_name == 'sendMessage':
            return handle_send_message(arguments, event)
        elif field_name == 'reportSecurityEvent':
            return handle_security_event(arguments, event)
        else:
            raise ValueError(f"Unknown field: {field_name}")
            
    except Exception as e:
        logger.error(f"GraphQL handler error: {str(e)}")
        metrics.add_metric(name="GraphQLErrors", unit=MetricUnit.Count, value=1)
        
        # セキュリティイベント記録
        report_security_event({
            'event_type': 'graphql_error',
            'severity': 'medium',
            'source_service': 'appsync',
            'event_details': {
                'error': str(e),
                'field_name': event.get('info', {}).get('fieldName'),
                'user_id': get_user_id_from_event(event)
            }
        })
        
        raise e

@tracer.capture_method
def handle_send_message(arguments, event):
    """メッセージ送信処理"""
    try:
        user_id = get_user_id_from_event(event)
        room_id = arguments['input']['roomId']
        content = arguments['input']['content']
        
        # セキュリティ検証
        if not validate_message_content(content):
            report_security_event({
                'event_type': 'malicious_content_detected',
                'severity': 'high',
                'source_service': 'appsync',
                'event_details': {
                    'user_id': user_id,
                    'room_id': room_id,
                    'content_length': len(content)
                }
            })
            raise ValueError("Content validation failed")
        
        # データベース保存（Auroraに直接保存）
        message_id = save_message_to_database(arguments['input'], user_id)
        
        # EventBridge経由でリアルタイム配信
        publish_message_event({
            'messageId': message_id,
            'roomId': room_id,
            'userId': user_id,
            'content': content,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # 成功メトリクス
        metrics.add_metric(name="MessagesProcessed", unit=MetricUnit.Count, value=1)
        
        return {
            'id': message_id,
            'content': content,
            'messageType': arguments['input'].get('messageType', 'TEXT'),
            'createdAt': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Send message error: {str(e)}")
        metrics.add_metric(name="MessageErrors", unit=MetricUnit.Count, value=1)
        raise e

@tracer.capture_method
def handle_security_event(arguments, event):
    """セキュリティイベント報告処理"""
    try:
        user_id = get_user_id_from_event(event)
        security_event = arguments['input']
        
        # Security Hubに送信
        finding_id = send_to_security_hub({
            **security_event,
            'reporter_user_id': user_id,
            'source_component': 'appsync_graphql'
        })
        
        # EventBridge経由で管理者に通知
        publish_security_event({
            'findingId': finding_id,
            'eventType': security_event['eventType'],
            'severity': security_event['severity'],
            'reportedBy': user_id
        })
        
        return {
            'id': finding_id,
            'eventType': security_event['eventType'],
            'severity': security_event['severity'],
            'createdAt': datetime.utcnow().isoformat(),
            'resolved': False
        }
        
    except Exception as e:
        logger.error(f"Security event error: {str(e)}")
        raise e

def validate_message_content(content: str) -> bool:
    """メッセージ内容の安全性検証"""
    # XSS攻撃パターンチェック
    dangerous_patterns = [
        '<script',
        'javascript:',
        'onclick=',
        'onerror=',
        'eval(',
        'document.cookie'
    ]
    
    content_lower = content.lower()
    for pattern in dangerous_patterns:
        if pattern in content_lower:
            return False
    
    return True

def log_graphql_request(event, context):
    """GraphQLリクエスト監査ログ"""
    logger.info("GraphQL request", extra={
        'field_name': event.get('info', {}).get('fieldName'),
        'user_id': get_user_id_from_event(event),
        'request_id': context.aws_request_id,
        'source_ip': event.get('sourceIp'),
        'user_agent': event.get('userAgent')
    })

def get_user_id_from_event(event) -> str:
    """イベントからユーザーID抽出"""
    identity = event.get('identity', {})
    return identity.get('sub') or identity.get('username', 'anonymous')

def publish_message_event(message_data):
    """メッセージイベントをEventBridgeに送信"""
    eventbridge.put_events(
        Entries=[{
            'Source': 'chatapp.messages',
            'DetailType': 'Message Added',
            'Detail': json.dumps(message_data),
            'EventBusName': os.environ['EVENT_BUS_NAME']
        }]
    )

def publish_security_event(security_data):
    """セキュリティイベントをEventBridgeに送信"""
    eventbridge.put_events(
        Entries=[{
            'Source': 'chatapp.security',
            'DetailType': 'Security Event',
            'Detail': json.dumps(security_data),
            'EventBusName': os.environ['EVENT_BUS_NAME']
        }]
    )

def send_to_security_hub(security_event):
    """Security Hubにセキュリティ所見送信"""
    finding_id = f"chatapp-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    securityhub.batch_import_findings(
        Findings=[{
            'SchemaVersion': '2018-10-08',
            'Id': finding_id,
            'ProductArn': f"arn:aws:securityhub:{os.environ['AWS_REGION']}::product/custom/chatapp",
            'GeneratorId': 'chatapp-appsync',
            'AwsAccountId': os.environ['AWS_ACCOUNT_ID'],
            'CreatedAt': datetime.utcnow().isoformat() + 'Z',
            'UpdatedAt': datetime.utcnow().isoformat() + 'Z',
            'Severity': {
                'Label': security_event['severity'].upper()
            },
            'Title': f"ChatApp Security Event: {security_event['eventType']}",
            'Description': json.dumps(security_event['eventDetails']),
            'Types': ['Unusual Behaviors/Application']
        }]
    )
    
    return finding_id
```

## 検証項目

- [ ] AppSync API が正常に作成される
- [ ] GraphQL クエリが動作する
- [ ] Mutations が正常に処理される
- [ ] Subscriptions が機能する
- [ ] EventBridge統合が動作する
- [ ] X-Ray トレースが記録される
- [ ] WAF ルールが適用される
- [ ] セキュリティイベントが記録される
- [ ] リアルタイム通信が安定している

## セキュリティ考慮事項

- [ ] GraphQL スキーマの深度制限
- [ ] リゾルバーレベルの認証・認可
- [ ] クエリの複雑度制限
- [ ] レート制限の実装
- [ ] 入力値検証の実装
- [ ] セキュリティヘッダーの設定

## 次のタスクへの引き継ぎ事項

- AppSync API エンドポイント情報
- EventBridge 設定詳細
- セキュリティ統合状況
- パフォーマンス監視データ

## 参考資料

- [AWS AppSync](https://docs.aws.amazon.com/appsync/)
- [GraphQL Security](https://graphql.org/learn/security/)
- [EventBridge](https://docs.aws.amazon.com/eventbridge/)