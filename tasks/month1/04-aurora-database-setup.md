# Task: Aurora Database + セキュリティ統合

**実施期間**: Month 1 Week 2 (Day 3-4)  
**推定工数**: 8時間  
**優先度**: 高  

## 概要

BLEA準拠のAurora PostgreSQL Serverless v2データベースを構築し、暗号化、バックアップ、監査ログを含む包括的なセキュリティ統合を実装する。

## 学習目標

- Aurora Serverless v2の設計・実装
- BLEA準拠のデータベースセキュリティ
- 暗号化と監査ログの実装
- データベーススキーマ設計

## 前提条件

- BLEA基盤構築完了
- VPCとセキュリティ基盤構築完了
- Lambda + API Gateway実装完了

## タスク詳細

### Day 3: BLEA準拠データベース設計

#### 1. Aurora設計とCDK実装 (4時間)
- [ ] Aurora Serverless v2 クラスター設計
- [ ] KMS暗号化キー作成・設定
- [ ] Secrets Manager認証情報設定
- [ ] VPC内配置とセキュリティグループ設定

#### 2. データベーススキーマ設計 (2時間)
- [ ] チャットアプリ用テーブル設計
- [ ] BLEA監査カラム追加
- [ ] 行レベルセキュリティ設定
- [ ] データ分類設定

#### 3. バックアップ・復旧設定 (2時間)
- [ ] 自動バックアップ設定
- [ ] Point-in-timeリカバリ設定
- [ ] クロスリージョンバックアップ
- [ ] 復旧テスト手順作成

### Day 4: 監査とセキュリティ強化

#### 1. 監査ログ設定 (3時間)
- [ ] PostgreSQLログ有効化
- [ ] CloudWatch Logs統合
- [ ] 監査トリガー実装
- [ ] データアクセスログ記録

#### 2. データセキュリティ強化 (3時間)
- [ ] 列レベル暗号化実装
- [ ] データマスキング設定
- [ ] アクセス制御強化
- [ ] データ漏洩防止策

#### 3. パフォーマンス最適化 (2時間)
- [ ] インデックス設計
- [ ] クエリ最適化
- [ ] Performance Insights設定
- [ ] モニタリング設定

### MCP サーバ活用

```
💬 "概要設計書に従って、Aurora PostgreSQL Serverless v2をCDKで実装し、
BLEA統制システムと連携する設定を追加してください。暗号化、監査ログ、セキュリティ設定を含めて。"
```

## 成果物

### 1. Aurora CDK実装

```typescript
// lib/database/aurora-stack.ts
export class BLEAAuroraStack extends cdk.Stack {
  public readonly cluster: rds.DatabaseCluster;
  public readonly secret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: BLEAAuroraStackProps) {
    super(scope, id, props);

    // KMS暗号化キー
    const kmsKey = new kms.Key(this, 'ChatAppDatabaseKey', {
      description: 'ChatApp Aurora encryption key',
      enableKeyRotation: true,
      keyPolicy: this.createDatabaseKmsPolicy()
    });

    // データベース認証情報
    this.secret = new secretsmanager.Secret(this, 'ChatAppDatabaseSecret', {
      description: 'ChatApp Aurora database credentials',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'chatapp_admin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\\'',
        includeSpace: false,
        passwordLength: 32
      },
      encryptionKey: kmsKey
    });

    // Aurora Serverless v2 クラスター
    this.cluster = new rds.DatabaseCluster(this, 'ChatAppDatabase', {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_14_9
      }),
      
      // BLEA準拠セキュリティ設定
      credentials: rds.Credentials.fromSecret(this.secret),
      
      // 暗号化設定
      storageEncrypted: true,
      storageEncryptionKey: kmsKey,
      
      // VPC設定
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      securityGroups: [props.databaseSecurityGroup],
      
      // Serverless v2設定
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 4,
      
      // バックアップ設定
      backup: {
        retention: cdk.Duration.days(7),
        preferredWindow: '03:00-04:00'
      },
      
      // 監視設定
      monitoringInterval: cdk.Duration.minutes(1),
      monitoringRole: this.createRdsMonitoringRole(),
      
      // ログ設定
      cloudwatchLogsExports: ['postgresql'],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_MONTH,
      
      // Performance Insights
      performanceInsightEncryptionKey: kmsKey,
      performanceInsightRetention: rds.PerformanceInsightRetention.DEFAULT,
      
      // BLEA準拠タグ
      tags: {
        Project: 'ChatApp',
        Environment: props.environment,
        DataClassification: 'internal',
        BackupRequired: 'true',
        Encrypted: 'true'
      }
    });

    // データベース初期化Lambda
    this.createDatabaseInitializer(props);
  }

  private createDatabaseInitializer(props: BLEAAuroraStackProps) {
    const dbInitializer = new lambda.Function(this, 'DatabaseInitializer', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
import boto3
import json
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event, context):
    """データベース初期化処理"""
    try:
        # Secrets Managerから認証情報取得
        secrets_client = boto3.client('secretsmanager')
        secret = secrets_client.get_secret_value(
            SecretId=event['SecretArn']
        )
        
        db_config = json.loads(secret['SecretString'])
        
        # データベース接続
        conn = psycopg2.connect(
            host=event['DatabaseEndpoint'],
            database='postgres',
            user=db_config['username'],
            password=db_config['password'],
            port=5432
        )
        
        # DDL実行
        with conn.cursor() as cursor:
            cursor.execute(create_tables_sql())
            cursor.execute(create_audit_triggers_sql())
            cursor.execute(create_row_level_security_sql())
        
        conn.commit()
        conn.close()
        
        return {'statusCode': 200, 'body': 'Database initialized successfully'}
        
    except Exception as e:
        print(f"Database initialization failed: {str(e)}")
        raise e

def create_tables_sql():
    return '''
    -- BLEA準拠の暗号化・監査設定
    -- 全テーブルでKMS暗号化、行レベルセキュリティ有効化
    
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    
    -- ユーザーテーブル
    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        cognito_id VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        display_name VARCHAR(100),
        avatar_url TEXT,
        status VARCHAR(20) DEFAULT 'offline',
        last_active TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- BLEA監査カラム
        created_by VARCHAR(255),
        last_modified_by VARCHAR(255),
        security_classification VARCHAR(50) DEFAULT 'internal',
        data_retention_days INTEGER DEFAULT 2555
    );
    
    -- チャットルームテーブル
    CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        room_type VARCHAR(20) DEFAULT 'public',
        max_members INTEGER DEFAULT 100,
        created_by UUID REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- BLEA監査カラム
        last_modified_by VARCHAR(255),
        security_classification VARCHAR(50) DEFAULT 'internal'
    );
    
    -- メッセージテーブル
    CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID REFERENCES rooms(id),
        user_id UUID REFERENCES users(id),
        content TEXT NOT NULL,
        message_type VARCHAR(20) DEFAULT 'text',
        reply_to_id UUID REFERENCES messages(id),
        file_upload_id UUID,
        is_edited BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- BLEA監査カラム
        source_ip INET,
        user_agent TEXT,
        request_id VARCHAR(255),
        security_classification VARCHAR(50) DEFAULT 'internal'
    );
    
    -- 監査ログテーブル
    CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        table_name VARCHAR(255) NOT NULL,
        operation VARCHAR(10) NOT NULL,
        record_id UUID NOT NULL,
        old_values JSONB,
        new_values JSONB,
        changed_fields TEXT[],
        user_id UUID,
        cognito_user_id VARCHAR(255),
        ip_address INET,
        user_agent TEXT,
        api_endpoint VARCHAR(255),
        request_id VARCHAR(255),
        compliance_context JSONB,
        data_classification VARCHAR(50) DEFAULT 'internal',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    '''
    
def create_audit_triggers_sql():
    return '''
    -- 監査トリガー関数
    CREATE OR REPLACE FUNCTION audit_trigger_function()
    RETURNS TRIGGER AS $$
    BEGIN
        INSERT INTO audit_logs (
            table_name, operation, record_id, old_values, new_values,
            changed_fields, created_at
        ) VALUES (
            TG_TABLE_NAME,
            TG_OP,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
            CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
            CASE 
                WHEN TG_OP = 'UPDATE' THEN 
                    array(SELECT key FROM jsonb_each(to_jsonb(NEW)) 
                          WHERE to_jsonb(NEW)->>key != to_jsonb(OLD)->>key)
                ELSE NULL 
            END,
            CURRENT_TIMESTAMP
        );
        RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
    
    -- 監査トリガー作成
    CREATE TRIGGER users_audit_trigger
        AFTER INSERT OR UPDATE OR DELETE ON users
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
        
    CREATE TRIGGER rooms_audit_trigger
        AFTER INSERT OR UPDATE OR DELETE ON rooms
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
        
    CREATE TRIGGER messages_audit_trigger
        AFTER INSERT OR UPDATE OR DELETE ON messages
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    '''

def create_row_level_security_sql():
    return '''
    -- 行レベルセキュリティ有効化
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
    ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
    ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
    
    -- ユーザー分離ポリシー
    CREATE POLICY user_isolation_policy ON users
        FOR ALL TO authenticated_users 
        USING (cognito_id = current_setting('app.current_user_id'));
        
    -- ルームアクセスポリシー
    CREATE POLICY room_access_policy ON rooms
        FOR ALL TO authenticated_users
        USING (
            id IN (
                SELECT room_id FROM room_members 
                WHERE user_id = (
                    SELECT id FROM users 
                    WHERE cognito_id = current_setting('app.current_user_id')
                )
            )
        );
    '''
      `),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
      },
      environment: {
        SECRET_ARN: this.secret.secretArn,
        DATABASE_ENDPOINT: this.cluster.clusterEndpoint.hostname
      }
    });

    // Lambda実行権限
    this.secret.grantRead(dbInitializer);
    this.cluster.grantConnect(dbInitializer);
  }
}
```

### 2. データベーススキーマ設計

#### 主要テーブル
- **users**: ユーザー情報とBLEA監査カラム
- **rooms**: チャットルーム情報
- **messages**: メッセージデータ（暗号化対応）
- **audit_logs**: BLEA準拠監査ログ

#### セキュリティ機能
- **行レベルセキュリティ**: ユーザー単位のデータ分離
- **監査トリガー**: 全DML操作の自動記録
- **暗号化**: KMS統合による保存時暗号化

## 検証項目

- [ ] Aurora クラスターが正常に作成される
- [ ] KMS暗号化が有効になる
- [ ] Secrets Manager 認証情報が機能する
- [ ] データベーススキーマが正常に作成される
- [ ] 監査ログが記録される
- [ ] 行レベルセキュリティが機能する
- [ ] バックアップが実行される
- [ ] Performance Insights が動作する

## セキュリティ考慮事項

- [ ] 暗号化キーのローテーション設定
- [ ] 最小権限アクセス制御
- [ ] ネットワーク分離（Isolated subnet）
- [ ] 監査ログの改ざん防止
- [ ] データ保存期間の管理
- [ ] 個人情報の適切な取り扱い

## 次のタスクへの引き継ぎ事項

- Aurora クラスターエンドポイント
- Secrets Manager ARN
- データベーススキーマ情報
- セキュリティ設定詳細

## 参考資料

- [Aurora Serverless v2](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [RDS セキュリティ](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.html)
- [PostgreSQL行レベルセキュリティ](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)