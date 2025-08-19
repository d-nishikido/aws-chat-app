# Task: S3ファイルアップロード + セキュリティ統合

**実施期間**: Month 2 Week 2 (Day 1-2)  
**推定工数**: 8時間  
**優先度**: 高  

## 概要

BLEA統合セキュリティ機能を含むファイルアップロード機能を実装し、ウイルススキャン、データ漏洩防止（DLP）、アクセス制御を統合したセキュアなファイル共有システムを構築する。

## 学習目標

- S3 Presigned URL によるセキュアファイルアップロード
- ウイルススキャン統合（Amazon Inspector/ClamAV）
- DLP（データ漏洩防止）機能実装
- BLEA準拠のファイルアクセス監査

## 前提条件

- AppSync + EventBridge実装完了
- BLEA基盤構築完了
- Lambda + API Gateway実装完了

## タスク詳細

### Day 1: セキュアファイルアップロード実装

#### 1. S3バケット設計とCDK実装 (3時間)
- [ ] BLEA準拠S3バケット作成
- [ ] 暗号化設定（KMS統合）
- [ ] バケットポリシー設定
- [ ] ライフサイクル管理設定

#### 2. Presigned URLシステム実装 (3時間)
- [ ] ファイルアップロードAPI実装
- [ ] Pre-signed URL生成機能
- [ ] ファイル形式・サイズ検証
- [ ] メタデータ管理

#### 3. Lambda処理関数実装 (2時間)
- [ ] ファイルアップロード完了処理
- [ ] ファイル情報データベース保存
- [ ] 監査ログ記録
- [ ] イベント通知

### Day 2: セキュリティスキャン統合

#### 1. ウイルススキャン統合 (4時間)
- [ ] ClamAV on Lambda 実装
- [ ] スキャン結果処理
- [ ] 隔離機能実装
- [ ] スキャン結果通知

#### 2. DLP（データ漏洩防止）機能 (2時間)
- [ ] ファイル内容スキャン
- [ ] 機密情報検出パターン
- [ ] 自動分類機能
- [ ] アクセス制御強化

#### 3. 監査・モニタリング強化 (2時間)
- [ ] ファイルアクセス監査ログ
- [ ] BLEA Security Hub統合
- [ ] 異常検知アラート
- [ ] コンプライアンスレポート

### MCP サーバ活用

```
💬 "概要設計書に従って、S3を使用したセキュアなファイルアップロード機能を実装してください。
BLEA統合セキュリティ機能、ウイルススキャン、DLP機能を含めてください。"
```

## 成果物

### 1. S3セキュリティ設定 CDK実装

```typescript
// lib/storage/s3-secure-stack.ts
export class SecureFileStorageStack extends cdk.Stack {
  public readonly uploadBucket: s3.Bucket;
  public readonly quarantineBucket: s3.Bucket;
  public readonly kmsKey: kms.Key;

  constructor(scope: Construct, id: string, props: SecureFileStorageStackProps) {
    super(scope, id, props);

    // BLEA準拠KMS暗号化キー
    this.kmsKey = new kms.Key(this, 'FileStorageEncryptionKey', {
      description: 'ChatApp file storage encryption key',
      enableKeyRotation: true,
      keyPolicy: this.createFileStorageKmsPolicy(),
      keyUsage: kms.KeyUsage.ENCRYPT_DECRYPT,
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT
    });

    // メインファイルストレージバケット
    this.uploadBucket = new s3.Bucket(this, 'ChatAppFileStorage', {
      bucketName: `chatapp-files-${props.environment}-${this.account}`,
      
      // BLEA準拠セキュリティ設定
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      
      // アクセスログ
      serverAccessLogsBucket: this.createAccessLogsBucket(),
      serverAccessLogsPrefix: 'access-logs/',
      
      // ライフサイクル管理
      lifecycleRules: [
        {
          id: 'DeleteIncompleteUploads',
          abortIncompleteMultipartUploadsAfter: cdk.Duration.days(1)
        },
        {
          id: 'TransitionToIA',
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(30)
            }
          ]
        }
      ],
      
      // 削除保護
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      
      // BLEA準拠タグ
      tags: {
        Project: 'ChatApp',
        Environment: props.environment,
        DataClassification: 'internal',
        BackupRequired: 'true',
        EncryptionRequired: 'true'
      }
    });

    // 隔離バケット（ウイルス検出ファイル用）
    this.quarantineBucket = new s3.Bucket(this, 'ChatAppQuarantine', {
      bucketName: `chatapp-quarantine-${props.environment}-${this.account}`,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: this.kmsKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      // 隔離ファイルは90日後自動削除
      lifecycleRules: [{
        id: 'QuarantineCleanup',
        expiration: cdk.Duration.days(90)
      }]
    });

    // バケット通知設定
    this.setupBucketNotifications(props);

    // CloudTrail統合（BLEA要件）
    this.setupCloudTrailLogging(props);
  }

  private createAccessLogsBucket(): s3.Bucket {
    return new s3.Bucket(this, 'FileStorageAccessLogs', {
      bucketName: `chatapp-access-logs-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      lifecycleRules: [{
        id: 'AccessLogRetention',
        expiration: cdk.Duration.days(90)
      }]
    });
  }

  private setupBucketNotifications(props: SecureFileStorageStackProps) {
    // ファイルアップロード完了時の処理Lambda
    const fileProcessorLambda = new lambda.Function(this, 'FileProcessorLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'processor.lambda_handler',
      code: lambda.Code.fromAsset('backend/file-processing'),
      environment: {
        QUARANTINE_BUCKET: this.quarantineBucket.bucketName,
        DATABASE_SECRET_ARN: props.databaseSecret.secretArn,
        SECURITY_HUB_REGION: this.region
      },
      vpc: props.vpc,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024
    });

    // S3イベント通知
    this.uploadBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(fileProcessorLambda)
    );

    // 権限付与
    this.uploadBucket.grantReadWrite(fileProcessorLambda);
    this.quarantineBucket.grantReadWrite(fileProcessorLambda);
    this.kmsKey.grantEncryptDecrypt(fileProcessorLambda);
  }

  private setupCloudTrailLogging(props: SecureFileStorageStackProps) {
    // BLEA統合CloudTrail設定
    const cloudTrailLogGroup = new logs.LogGroup(this, 'FileStorageCloudTrailLogs', {
      logGroupName: '/aws/cloudtrail/chatapp-file-storage',
      retention: logs.RetentionDays.ONE_YEAR
    });

    new cloudtrail.Trail(this, 'FileStorageCloudTrail', {
      trailName: 'ChatApp-FileStorage-Trail',
      bucket: props.cloudTrailBucket,
      s3KeyPrefix: 'file-storage-trails/',
      includeGlobalServiceEvents: false,
      isMultiRegionTrail: false,
      cloudWatchLogGroup: cloudTrailLogGroup,
      
      // S3バケットのAPI呼び出しを記録
      eventRuleARN: `arn:aws:s3:::${this.uploadBucket.bucketName}/*`
    });
  }

  private createFileStorageKmsPolicy(): iam.PolicyDocument {
    return new iam.PolicyDocument({
      statements: [
        new iam.PolicyStatement({
          sid: 'EnableFileStorageAccess',
          effect: iam.Effect.ALLOW,
          principals: [
            new iam.ServicePrincipal('s3.amazonaws.com'),
            new iam.ServicePrincipal('lambda.amazonaws.com')
          ],
          actions: [
            'kms:Decrypt',
            'kms:DescribeKey',
            'kms:Encrypt',
            'kms:GenerateDataKey',
            'kms:ReEncrypt*'
          ],
          resources: ['*']
        })
      ]
    });
  }
}
```

### 2. ファイルアップロードAPI実装

```python
# backend/file-upload/handler.py
import json
import boto3
import os
import uuid
import hashlib
from datetime import datetime, timedelta
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from botocore.exceptions import ClientError

logger = Logger()
tracer = Tracer()
metrics = Metrics()

# AWS clients
s3 = boto3.client('s3')
secretsmanager = boto3.client('secretsmanager')
securityhub = boto3.client('securityhub')

@tracer.capture_lambda_handler
@logger.inject_lambda_context
@metrics.log_metrics
def generate_presigned_url(event, context):
    """
    セキュアなPresigned URL生成
    """
    try:
        body = json.loads(event['body'])
        user_id = get_user_id_from_event(event)
        
        # ファイル検証
        file_validation = validate_file_request(body)
        if not file_validation['valid']:
            return create_error_response(400, file_validation['error'])
        
        # アップロードID生成
        upload_id = str(uuid.uuid4())
        file_key = f"uploads/{user_id}/{upload_id}/{body['file_name']}"
        
        # Presigned URL生成
        presigned_data = generate_secure_presigned_url(
            bucket=os.environ['UPLOAD_BUCKET'],
            key=file_key,
            file_size=body['file_size'],
            mime_type=body['mime_type'],
            user_id=user_id
        )
        
        # アップロード記録をデータベースに保存
        save_upload_record({
            'upload_id': upload_id,
            'user_id': user_id,
            'file_name': body['file_name'],
            'file_size': body['file_size'],
            'mime_type': body['mime_type'],
            'file_key': file_key,
            'status': 'pending'
        })
        
        # 監査ログ記録
        log_file_upload_event('presigned_url_generated', user_id, {
            'upload_id': upload_id,
            'file_name': body['file_name'],
            'file_size': body['file_size']
        })
        
        metrics.add_metric(name="PresignedURLGenerated", unit=MetricUnit.Count, value=1)
        
        return create_success_response({
            'upload_id': upload_id,
            'presigned_url': presigned_data['url'],
            'fields': presigned_data['fields'],
            'expires_at': (datetime.utcnow() + timedelta(hours=1)).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Presigned URL generation failed: {str(e)}")
        metrics.add_metric(name="PresignedURLErrors", unit=MetricUnit.Count, value=1)
        return create_error_response(500, "Internal server error")

def validate_file_request(body):
    """ファイルリクエストの検証"""
    required_fields = ['file_name', 'file_size', 'mime_type']
    for field in required_fields:
        if field not in body:
            return {'valid': False, 'error': f'Missing required field: {field}'}
    
    # ファイルサイズ制限（10MB）
    max_size = 10 * 1024 * 1024
    if body['file_size'] > max_size:
        return {'valid': False, 'error': 'File size exceeds limit'}
    
    # 許可されたMIMEタイプ
    allowed_types = [
        'image/jpeg', 'image/png', 'image/gif',
        'application/pdf', 'text/plain',
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    
    if body['mime_type'] not in allowed_types:
        return {'valid': False, 'error': 'File type not allowed'}
    
    # ファイル名検証（セキュリティ）
    dangerous_extensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js']
    file_name_lower = body['file_name'].lower()
    
    for ext in dangerous_extensions:
        if file_name_lower.endswith(ext):
            return {'valid': False, 'error': 'Dangerous file type detected'}
    
    return {'valid': True}

def generate_secure_presigned_url(bucket, key, file_size, mime_type, user_id):
    """セキュアなPresigned URL生成"""
    conditions = [
        {"bucket": bucket},
        {"key": key},
        {"Content-Type": mime_type},
        ["content-length-range", 1, file_size],
        {"x-amz-meta-user-id": user_id},
        {"x-amz-meta-upload-time": datetime.utcnow().isoformat()},
        {"x-amz-server-side-encryption": "aws:kms"},
        {"x-amz-server-side-encryption-aws-kms-key-id": os.environ['KMS_KEY_ID']}
    ]
    
    presigned_post = s3.generate_presigned_post(
        Bucket=bucket,
        Key=key,
        Fields={
            "Content-Type": mime_type,
            "x-amz-meta-user-id": user_id,
            "x-amz-meta-upload-time": datetime.utcnow().isoformat(),
            "x-amz-server-side-encryption": "aws:kms",
            "x-amz-server-side-encryption-aws-kms-key-id": os.environ['KMS_KEY_ID']
        },
        Conditions=conditions,
        ExpiresIn=3600  # 1時間
    )
    
    return presigned_post

def save_upload_record(upload_data):
    """アップロード記録をデータベースに保存"""
    # データベース接続とINSERT処理
    # (Aurora接続コードは省略)
    pass

def log_file_upload_event(event_type, user_id, event_data):
    """ファイルアップロード監査ログ"""
    logger.info(f"File upload event: {event_type}", extra={
        'event_type': event_type,
        'user_id': user_id,
        'event_data': event_data,
        'timestamp': datetime.utcnow().isoformat()
    })
```

### 3. ウイルススキャン Lambda実装

```python
# backend/file-processing/virus_scanner.py
import json
import boto3
import os
import subprocess
import tempfile
from aws_lambda_powertools import Logger, Tracer, Metrics

logger = Logger()
tracer = Tracer()
metrics = Metrics()

s3 = boto3.client('s3')
securityhub = boto3.client('securityhub')

@tracer.capture_lambda_handler
@logger.inject_lambda_context
@metrics.log_metrics
def scan_uploaded_file(event, context):
    """
    アップロードファイルのウイルススキャン
    """
    try:
        # S3イベントから情報取得
        record = event['Records'][0]
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']
        
        logger.info(f"Starting virus scan for {bucket}/{key}")
        
        # ファイルダウンロード
        with tempfile.NamedTemporaryFile() as temp_file:
            s3.download_fileobj(bucket, key, temp_file)
            temp_file.flush()
            
            # ClamAVスキャン実行
            scan_result = run_clamav_scan(temp_file.name)
            
            if scan_result['infected']:
                # ウイルス検出時の処理
                handle_infected_file(bucket, key, scan_result)
                metrics.add_metric(name="InfectedFilesDetected", unit=MetricUnit.Count, value=1)
            else:
                # クリーンファイルの処理
                handle_clean_file(bucket, key, scan_result)
                metrics.add_metric(name="CleanFilesProcessed", unit=MetricUnit.Count, value=1)
        
        return {'statusCode': 200, 'body': json.dumps('Scan completed')}
        
    except Exception as e:
        logger.error(f"Virus scan failed: {str(e)}")
        metrics.add_metric(name="ScanErrors", unit=MetricUnit.Count, value=1)
        raise e

def run_clamav_scan(file_path):
    """ClamAVスキャン実行"""
    try:
        # ClamAVスキャン実行
        result = subprocess.run([
            '/opt/bin/clamscan',
            '--no-summary',
            '--infected',
            '--stdout',
            file_path
        ], capture_output=True, text=True, timeout=300)
        
        infected = result.returncode != 0
        
        return {
            'infected': infected,
            'output': result.stdout,
            'error': result.stderr if result.stderr else None
        }
        
    except subprocess.TimeoutExpired:
        logger.error("ClamAV scan timeout")
        return {
            'infected': True,  # タイムアウトは感染として扱う
            'output': 'Scan timeout',
            'error': 'Scan timeout expired'
        }
    except Exception as e:
        logger.error(f"ClamAV scan error: {str(e)}")
        return {
            'infected': True,  # エラーは感染として扱う
            'output': 'Scan error',
            'error': str(e)
        }

def handle_infected_file(bucket, key, scan_result):
    """感染ファイルの処理"""
    try:
        # 隔離バケットに移動
        quarantine_bucket = os.environ['QUARANTINE_BUCKET']
        quarantine_key = f"quarantine/{key}"
        
        # ファイルコピー
        s3.copy_object(
            CopySource={'Bucket': bucket, 'Key': key},
            Bucket=quarantine_bucket,
            Key=quarantine_key,
            ServerSideEncryption='aws:kms',
            SSEKMSKeyId=os.environ['KMS_KEY_ID']
        )
        
        # 元ファイル削除
        s3.delete_object(Bucket=bucket, Key=key)
        
        # Security Hubに報告
        send_security_finding({
            'type': 'virus_detected',
            'severity': 'CRITICAL',
            'title': 'Virus Detected in Uploaded File',
            'description': f'Virus detected in file {key}. File quarantined.',
            'details': {
                'original_location': f"{bucket}/{key}",
                'quarantine_location': f"{quarantine_bucket}/{quarantine_key}",
                'scan_output': scan_result['output']
            }
        })
        
        logger.warning(f"Infected file quarantined: {bucket}/{key}")
        
    except Exception as e:
        logger.error(f"Failed to quarantine infected file: {str(e)}")
        raise e

def handle_clean_file(bucket, key, scan_result):
    """クリーンファイルの処理"""
    try:
        # ファイルにクリーンマーク追加
        s3.put_object_tagging(
            Bucket=bucket,
            Key=key,
            Tagging={
                'TagSet': [
                    {'Key': 'VirusScanStatus', 'Value': 'clean'},
                    {'Key': 'ScanTimestamp', 'Value': datetime.utcnow().isoformat()},
                    {'Key': 'ScanEngine', 'Value': 'clamav'}
                ]
            }
        )
        
        # DLPスキャン実行
        dlp_result = run_dlp_scan(bucket, key)
        
        # データベース更新
        update_file_scan_status(key, {
            'virus_scan': 'clean',
            'dlp_scan': dlp_result['status'],
            'scan_timestamp': datetime.utcnow().isoformat()
        })
        
        logger.info(f"Clean file processed: {bucket}/{key}")
        
    except Exception as e:
        logger.error(f"Failed to process clean file: {str(e)}")
        raise e

def run_dlp_scan(bucket, key):
    """データ漏洩防止スキャン"""
    try:
        # ファイル内容取得
        response = s3.get_object(Bucket=bucket, Key=key)
        content = response['Body'].read()
        
        # テキスト抽出（ファイル形式に応じて）
        text_content = extract_text_content(content, key)
        
        # 機密情報パターンチェック
        sensitive_patterns = check_sensitive_patterns(text_content)
        
        if sensitive_patterns:
            # 機密情報検出時の処理
            handle_sensitive_content(bucket, key, sensitive_patterns)
            return {'status': 'sensitive_detected', 'patterns': sensitive_patterns}
        else:
            return {'status': 'clean', 'patterns': []}
            
    except Exception as e:
        logger.error(f"DLP scan failed: {str(e)}")
        return {'status': 'error', 'error': str(e)}

def check_sensitive_patterns(text):
    """機密情報パターンチェック"""
    import re
    
    patterns = {
        'credit_card': r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        'ssn': r'\b\d{3}-\d{2}-\d{4}\b',
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'phone': r'\b\d{3}-\d{3}-\d{4}\b',
        'api_key': r'[Aa][Pp][Ii]_?[Kk][Ee][Yy].*[A-Za-z0-9]{20,}'
    }
    
    detected = []
    for pattern_name, pattern in patterns.items():
        matches = re.findall(pattern, text)
        if matches:
            detected.append({
                'type': pattern_name,
                'count': len(matches)
            })
    
    return detected

def send_security_finding(finding_data):
    """Security Hubにセキュリティ所見送信"""
    finding_id = f"chatapp-file-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    
    securityhub.batch_import_findings(
        Findings=[{
            'SchemaVersion': '2018-10-08',
            'Id': finding_id,
            'ProductArn': f"arn:aws:securityhub:{os.environ['AWS_REGION']}::product/custom/chatapp",
            'GeneratorId': 'chatapp-file-scanner',
            'AwsAccountId': os.environ.get('AWS_ACCOUNT_ID', ''),
            'CreatedAt': datetime.utcnow().isoformat() + 'Z',
            'UpdatedAt': datetime.utcnow().isoformat() + 'Z',
            'Severity': {
                'Label': finding_data['severity']
            },
            'Title': finding_data['title'],
            'Description': finding_data['description'],
            'Types': ['Unusual Behaviors/Malware'],
            'Resources': [{
                'Type': 'AwsS3Object',
                'Id': finding_data['details']['original_location']
            }]
        }]
    )
```

## 検証項目

- [ ] S3バケットが正しく設定される
- [ ] Presigned URLが生成される
- [ ] ファイルアップロードが機能する
- [ ] ウイルススキャンが動作する
- [ ] DLPスキャンが機能する
- [ ] 感染ファイルが隔離される
- [ ] 監査ログが記録される
- [ ] Security Hub統合が動作する
- [ ] 暗号化が適用される
- [ ] アクセス制御が機能する

## セキュリティ考慮事項

- [ ] ファイル形式検証の徹底
- [ ] サイズ制限の適切な実装
- [ ] 危険な拡張子のブロック
- [ ] ウイルス定義の定期更新
- [ ] 隔離ファイルの適切な管理
- [ ] 機密情報の検出精度向上
- [ ] アクセスログの完全性保護

## 次のタスクへの引き継ぎ事項

- S3バケット設定詳細
- ウイルススキャン統合状況
- DLP機能実装状況
- セキュリティ監視設定

## 参考資料

- [S3 セキュリティベストプラクティス](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [ClamAV on Lambda](https://aws.amazon.com/blogs/developer/virus-scan-s3-buckets-with-lambda-clamav/)
- [AWS Macie](https://docs.aws.amazon.com/macie/)