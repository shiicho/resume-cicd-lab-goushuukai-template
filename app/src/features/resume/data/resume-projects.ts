export type ProjectId = 'pj1' | 'pj2' | 'pj3' | 'pj4' | 'pj5';

export interface ResumeGuide {
  title: string;
  description: string;
  followUp: string;
}

export interface ResumeTrack {
  label: '30秒' | '60秒' | '90秒';
  body: string;
}

export interface ResumeQa {
  category: string;
  question: string;
  answer: string;
}

export type DiagramNodeRole =
  | 'entry'
  | 'compute'
  | 'storage'
  | 'monitoring'
  | 'integration'
  | 'governance';

export interface DiagramNode {
  id: string;
  label: string;
  role: DiagramNodeRole;
  attested: boolean;
  description: string;
  cfnHint?: string;
  relatedQaIds?: string[];
}

export interface ResumeDiagram {
  src: string;
  caption: string;
  fromResume: string[];
  imagined: string[];
  nodes?: DiagramNode[];
}

export interface ResumeProject {
  id: ProjectId;
  slug: string;
  code: string;
  shortTitle: string;
  title: string;
  subtitle: string;
  period: string;
  role: string;
  team: string;
  summary: string;
  learningFocus: string;
  stageChips: string[];
  techChips: string[];
  responsibilities: string[];
  evidence: string[];
  attested: boolean;
  attestationSource?: string;
  compare: {
    entry: string;
    process: string;
    storage: string;
    monitor: string;
    responsibility: string;
    deepDive: string;
  };
  tracks: ResumeTrack[];
  qas: ResumeQa[];
  followUps: string[];
  diagram: ResumeDiagram;
}

export const resumeGuides: ResumeGuide[] = [
  {
    title: '話す前提',
    description:
      '派遣案件で基本設計や業務要件は先にあり、自分は詳細設計から構築、試験、運用保守を担当した前提で話す。',
    followUp: '何を担当したか / どこまで一人でやったか',
  },
  {
    title: '説明の型',
    description:
      '最初に全部を広げず、入口、処理、保存、監視の4点だけで構成を短く説明する。自分が触った箇所に絞る。',
    followUp: 'どんな構成か / どこを担当したか',
  },
  {
    title: '詳細設計の説明',
    description:
      '基本設計の方針を、実際に構築できる設定値へ落とし込む工程として説明する。迷う値は検証してから記載した前提で話す。',
    followUp: '何を書いたか / どう決めたか / 設計変更はあったか',
  },
  {
    title: '設定値試験',
    description:
      '構築後に、詳細設計と実機設定が一致しているか確認する試験として説明する。AWSはコンソール、OSやMWはコマンドで確認した。',
    followUp: 'どこまで試験したか / エビデンスは何か',
  },
];

export const resumeProjects: ResumeProject[] = [
  {
    id: 'pj1',
    slug: 'ec-site-foundation',
    code: 'PJ1',
    shortTitle: 'ECサイト基盤',
    title: 'ECサイト基盤構築・運用',
    subtitle: 'VPC、ALB、EC2、RDS、CloudWatch を入口から監視まで短く説明する AWS 基盤案件。',
    period: '2025年4月 - 2026年4月',
    role: 'SE',
    team: '5名',
    summary:
      '職務経歴書では EC サイト向け AWS 基盤の詳細設計、CloudFormation 構築、接続確認、運用保守を担当している。面接では ALB で受けて EC2 で処理し、RDS と S3 を使い、CloudWatch と SNS で監視する骨格で話すと自然。',
    learningFocus:
      'ネットワーク設計と接続確認を軸に、入口、処理、保存、監視の4点で説明できる標準的な AWS 基盤案件として使う。',
    stageChips: ['詳細設計', '実装', '単体試験', '運用保守'],
    techChips: ['Amazon Linux 2023', 'VPC', 'EC2', 'ALB', 'RDS', 'S3', 'CloudFormation', 'CloudWatch', 'SNS', 'Nginx', 'MySQL', 'Bash'],
    responsibilities: [
      'VPC、Subnet、RouteTable、SecurityGroup の詳細設計',
      'EC2 / ALB / RDS / S3 の構成設計と CloudFormation 実装',
      'EC2 初期設定、Nginx 設定、CloudWatch Logs / Alarm 設定',
      'ALB -> EC2、EC2 -> RDS、SNS 通知の単体確認と運用保守',
    ],
    evidence: ['職務経歴書 28-37 行', '面接Q&A ECサイト基盤', '背景・状況設定 PJ1'],
    attested: true,
    attestationSource: '職務経歴書 28-37 行',
    compare: {
      entry: 'Internet -> ALB',
      process: 'EC2 / Nginx',
      storage: 'RDS / S3',
      monitor: 'CloudWatch / SNS / 接続試験',
      responsibility: 'VPC / Subnet / RouteTable / SecurityGroup / CloudFormation',
      deepDive: 'CIDR、許可元、ALB->EC2->RDS 疎通、Alarm 閾値',
    },
    tracks: [
      {
        label: '30秒',
        body:
          'EC サイト向け AWS 基盤案件で、ALB が入口、EC2 が処理、RDS と S3 が保存、CloudWatch と SNS が監視という骨格です。自分は詳細設計から CloudFormation 構築、接続確認、運用保守まで担当しました。',
      },
      {
        label: '60秒',
        body:
          '詳細設計では VPC、Subnet、RouteTable、SecurityGroup と EC2 / ALB / RDS / S3 の構成を整理しました。実装では CloudFormation で主要リソースを作り、EC2 初期設定、Nginx 設定、CloudWatch Logs / Alarm を入れ、単体試験では ALB -> EC2 と EC2 -> RDS、通知到達を順番に確認しました。',
      },
      {
        label: '90秒',
        body:
          '面接では CIDR とサブネットの分け方、SecurityGroup の許可元、CloudFormation のパラメータ化、Nginx のログ出力先、Alarm のしきい値設計まで話せます。運用保守ではアラート発生時に対象リソース、時刻、メトリクス、Nginx ログ、CloudWatch Logs を見て一次切り分けしていました。',
      },
    ],
    qas: [
      {
        category: '詳細設計',
        question: 'VPC 設計では何を担当しましたか。',
        answer:
          'CIDR、サブネット分割の前提、通信経路の考え方を整理しました。後続の RouteTable と SecurityGroup を組みやすいように、役割ごとの分離を意識して設計しました。',
      },
      {
        category: '実装',
        question: 'CloudFormation では何を実装しましたか。',
        answer:
          'VPC、Subnet、RouteTable、SecurityGroup、EC2、ALB、RDS、S3、CloudWatch 関連を CloudFormation で構築し、手作業を減らして再現できる形にしました。',
      },
      {
        category: '単体試験',
        question: 'EC2 / ALB / RDS の接続確認はどう進めましたか。',
        answer:
          'ALB 経由で EC2 に疎通できるか、EC2 から RDS に接続できるかを順番に確認しました。どこで止まるか見やすいように経路ごとに切り分けました。',
      },
      {
        category: '運用保守',
        question: 'アラート確認のときはまず何を見ましたか。',
        answer:
          '対象リソース名、発生時刻、メトリクス内容を最初に見て、その後に関連ログと直近の設定変更有無を確認して一次切り分けしていました。',
      },
    ],
    followUps: ['VPC / SG / ALB / RDS は何を設計したか', '何を監視したか / 閾値 / 通知先', 'どこまで一人でやったか'],
    diagram: {
      src: '/architecture/pj1.svg',
      caption:
        '3-tier AWS 基盤。Route 53 → ALB → Multi-AZ の EC2 + Nginx → RDS MySQL (Primary/Standby)。S3 は VPC Endpoint 経由で私設接続、SSM Session で bastion-less 運用、SSM Parameter Store で DB 認証情報を管理。CloudWatch → SNS で運用担当へメール通知。全リソースは CloudFormation で構築。',
      fromResume: [
        'VPC / Subnet / RouteTable / SecurityGroup 設計',
        'EC2 / ALB / RDS / S3 構成',
        'CloudWatch Logs / Alarm、SNS、IAM',
        'CloudFormation による構築',
        'Nginx、MySQL、Bash',
        'SSM Session Manager で bastion-less 運用',
      ],
      imagined: [
        'Multi-AZ 配置 (AZ 1a / 1c) と DB subnet group',
        'ALB への ACM 証明書付与 (HTTPS :443)',
        'NAT Gateway 経由のアウトバウンド',
        'Route 53 Hosted Zone による DNS',
        'S3 Gateway VPC Endpoint で私設 EC2→S3 経路',
        'SSM Parameter Store で DB 認証情報 (SecureString)',
        '利用者 / 開発者 / 運用担当の 3 アクターを明示',
      ],
      nodes: [
        {
          id: 'alb',
          label: 'ALB (Internet-facing)',
          role: 'entry',
          attested: true,
          description:
            '公開サブネット配置の Application Load Balancer。HTTPS を受けて AZ 1a/1c の EC2 に振り分け、SecurityGroup は ALB→EC2 の 443/80 のみ許可。',
          cfnHint: 'AWS::ElasticLoadBalancingV2::LoadBalancer + TargetGroup',
          relatedQaIds: ['pj1-qa-03', 'pj1-qa-10'],
        },
        {
          id: 'ec2',
          label: 'EC2 (Nginx, Amazon Linux 2023)',
          role: 'compute',
          attested: true,
          description:
            'ALB から受けた通信を Nginx で処理。Multi-AZ 配置でロール毎に SecurityGroup を分ける。EC2 初期設定と Nginx 設定は担当範囲。',
          cfnHint: 'AWS::EC2::Instance + LaunchTemplate',
          relatedQaIds: ['pj1-qa-08', 'pj1-qa-09'],
        },
        {
          id: 'rds',
          label: 'RDS MySQL (Multi-AZ)',
          role: 'storage',
          attested: true,
          description:
            'Primary/Standby で AZ 跨ぎに冗長化した MySQL。EC2 からのアクセスのみ SecurityGroup で許可し、認証情報は SSM Parameter Store 経由で取得。',
          cfnHint: 'AWS::RDS::DBInstance + DBSubnetGroup',
          relatedQaIds: ['pj1-qa-11'],
        },
        {
          id: 's3-vpce',
          label: 'S3 via Gateway VPC Endpoint',
          role: 'storage',
          attested: true,
          description:
            'S3 へのトラフィックを NAT 経由せず VPC Endpoint で私設接続。Egress コストと露出面を同時に下げるプラクティス。',
          cfnHint: 'AWS::EC2::VPCEndpoint (Gateway type)',
        },
        {
          id: 'cloudwatch',
          label: 'CloudWatch (Logs + Alarm + SNS)',
          role: 'monitoring',
          attested: true,
          description:
            'EC2/ALB/RDS のメトリクスと Nginx ログを集約。しきい値超過時は Alarm → SNS → 運用担当メール。',
          cfnHint: 'AWS::CloudWatch::Alarm + AWS::SNS::Topic',
          relatedQaIds: ['pj1-qa-05', 'pj1-qa-13'],
        },
        {
          id: 'cfn',
          label: 'CloudFormation',
          role: 'governance',
          attested: true,
          description:
            'VPC/SG/EC2/ALB/RDS/S3/CloudWatch を 1 テンプレートで構築。Parameters で環境差分を吸収し、手作業を排除。',
          relatedQaIds: ['pj1-qa-06', 'pj1-qa-07'],
        },
        {
          id: 'route53',
          label: 'Route 53 Hosted Zone',
          role: 'entry',
          attested: false,
          description:
            '業界標準として前段に Route 53 を配置。ALB への A レコード (Alias) でヘルスチェック + DNS フェイルオーバの余地を残す。',
          cfnHint: 'AWS::Route53::RecordSet (Alias)',
        },
        {
          id: 'ssm-session',
          label: 'SSM Session Manager',
          role: 'governance',
          attested: true,
          description:
            'bastion を置かず SSM Session で EC2 にアクセス。公開鍵配布・踏み台コスト・SG 0.0.0.0/0 22 を排除。',
          cfnHint: 'AWS::IAM::Role for SSM + VPC Endpoint ssm/ssmmessages/ec2messages',
        },
      ],
    },
  },
  {
    id: 'pj2',
    slug: 'monitoring-job-platform',
    code: 'PJ2',
    shortTitle: '監視・ジョブ基盤',
    title: '社内業務システム向け監視・ジョブ基盤構築',
    subtitle: 'CloudWatch を中心に、EventBridge と Lambda のジョブ連携までを同じ運用面で説明する案件。',
    period: '2023年11月 - 2025年3月',
    role: 'SE',
    team: '5名',
    summary:
      '監視基盤と運用ジョブ基盤を AWS で構築した案件。CloudWatch Metrics / Logs / Alarm、EventBridge Rule、Lambda、S3 ログ保管、SNS 通知をつないだ運用導線として説明できる。',
    learningFocus:
      'ジョブそのものの業務要件ではなく、監視条件、起動条件、通知経路、結合試験の考え方を語る案件として整理する。',
    stageChips: ['詳細設計', '実装', '単体試験', '結合試験'],
    techChips: ['RHEL', 'EC2', 'CloudWatch Metrics', 'CloudWatch Logs', 'CloudWatch Alarm', 'EventBridge Rule', 'Lambda', 'S3', 'SNS', 'Systems Manager', 'CloudFormation', 'Bash', 'Python'],
    responsibilities: [
      'CloudWatch による監視設計、Alarm 条件、通知先の整理',
      'EventBridge Rule と Lambda によるジョブ連携設計と実装',
      'CloudWatch Logs 収集設定、S3 ログ保管設計、手順書作成',
      '障害検知 -> 通知 -> ジョブ実行 -> ログ確認の一連試験と運用改善',
    ],
    evidence: ['職務経歴書 56-65 行', '面接Q&A 監視・ジョブ基盤', '背景・状況設定 PJ2'],
    attested: true,
    attestationSource: '職務経歴書 56-65 行',
    compare: {
      entry: '監視対象 EC2 / 運用要求',
      process: 'CloudWatch / EventBridge / Lambda',
      storage: 'S3 ログ保管',
      monitor: 'Alarm -> SNS / 一連結合試験',
      responsibility: '閾値設計、Rule、Lambda、手順書、ジョブ変更対応',
      deepDive: '誤検知対策、Lambda 設定値、通知経路、ログ確認順',
    },
    tracks: [
      {
        label: '30秒',
        body:
          '社内業務システム向けに、監視とジョブ起動の土台を AWS で整えた案件です。CloudWatch で検知し、Alarm と SNS で通知し、EventBridge と Lambda でジョブを動かす流れを担当しました。',
      },
      {
        label: '60秒',
        body:
          '詳細設計では監視対象、しきい値、通知先、EventBridge の起動条件、Lambda の処理内容を整理しました。実装では Metrics / Logs / Alarm を設定し、EventBridge Rule と Lambda を作り、単体試験ではアラート発報とジョブ起動を確認しました。',
      },
      {
        label: '90秒',
        body:
          '結合試験では障害検知から通知、ジョブ実行、ログ確認までを通しで確認しました。深掘りされたら Alarm の評価回数、Lambda のタイムアウトや IAM、CloudWatch Logs の見方、運用での閾値見直しやジョブ登録変更対応まで具体的に話せます。',
      },
    ],
    qas: [
      {
        category: '詳細設計',
        question: 'EventBridge / Lambda によるジョブ連携設計では、何を決めましたか。',
        answer:
          'EventBridge Rule の起動条件、Lambda の処理内容、受け渡すパラメータ、失敗時の確認ポイントを整理しました。',
      },
      {
        category: '実装',
        question: 'CloudWatch Logs 収集設定はどう進めましたか。',
        answer:
          '収集対象ログを整理して CloudWatch Logs に送る設定を行い、ロググループも運用しやすい形で揃えました。',
      },
      {
        category: '単体試験',
        question: 'ジョブ起動確認では何を確認しましたか。',
        answer:
          'EventBridge から Lambda が起動すること、想定どおり処理されること、CloudWatch Logs に結果が出ることを確認しました。',
      },
      {
        category: '運用保守',
        question: '監視閾値の見直しはどう対応しましたか。',
        answer:
          '実際のアラート発生状況を見ながら、誤検知が多い項目はしきい値や評価回数を見直しました。',
      },
    ],
    followUps: ['EventBridge で何を起動したか', 'Lambda で何をしたか', 'どうデバッグしたか'],
    diagram: {
      src: '/architecture/pj2.svg',
      caption:
        '6 台の RHEL ワークロードから CloudWatch Agent で Metrics / Logs を収集。Metric Filter → Alarm 超過時は SNS → メール通知。ジョブは EventBridge Rule → Lambda で実行、失敗は DLQ (SQS) に退避。Lambda は SSM Parameter Store で設定取得、ログ (Agent 経由 + Lambda 経由) は S3 へ長期保管。Log Group は KMS 暗号化。',
      fromResume: [
        'CloudWatch Metrics / Logs / Alarm',
        'EventBridge Rule、Lambda',
        'S3 ログ保管、SNS 通知',
        'Systems Manager、IAM 最小権限',
        'CloudFormation 構築、Bash / Python',
      ],
      imagined: [
        '監視対象を 6 台の EC2 ワークロードとして描画',
        'Metric Filter を明示 (log → metric 変換)',
        'Lambda 失敗時の DLQ (SQS) 退避',
        'Lambda Logs と Agent Logs のログストリーム分離',
        'CloudWatch Log Group の KMS 暗号化',
        'CloudWatch Dashboard によるワークロード別ビュー',
        '運用担当 / ジョブオーナーの 2 アクターを明示',
      ],
      nodes: [
        {
          id: 'cloudwatch-agent',
          label: 'CloudWatch Agent (RHEL × 6)',
          role: 'monitoring',
          attested: true,
          description:
            '監視対象 6 台の RHEL ワークロードから Metrics と Logs を CloudWatch に収集。Agent 設定は SSM Parameter Store で管理。',
          cfnHint: 'CloudWatch Agent config via SSM Parameter Store',
        },
        {
          id: 'metric-filter',
          label: 'Metric Filter',
          role: 'monitoring',
          attested: false,
          description:
            'ロググループから異常パターンを抽出して Metric に変換。しきい値監視が可能になる業界標準プラクティス。',
          cfnHint: 'AWS::Logs::MetricFilter',
        },
        {
          id: 'cw-alarm',
          label: 'CloudWatch Alarm → SNS',
          role: 'monitoring',
          attested: true,
          description:
            'Metric しきい値超過時に SNS トピック経由でメール通知。評価回数・Period・Datapoints to Alarm は運用見直しポイント。',
          relatedQaIds: ['pj2-qa-05'],
        },
        {
          id: 'eventbridge',
          label: 'EventBridge Rule',
          role: 'integration',
          attested: true,
          description:
            'スケジュール or イベントベースで Lambda をトリガ。失敗時のリトライ・DLQ 連携を合わせて設計。',
          cfnHint: 'AWS::Events::Rule + Target',
          relatedQaIds: ['pj2-qa-04'],
        },
        {
          id: 'lambda',
          label: 'Lambda (Python / Bash)',
          role: 'compute',
          attested: true,
          description:
            '運用ジョブの処理本体。CloudWatch Logs に結果出力、SSM Parameter Store で設定取得、失敗時は DLQ。',
          cfnHint: 'AWS::Lambda::Function + EventInvokeConfig',
        },
        {
          id: 'dlq',
          label: 'Lambda DLQ (SQS)',
          role: 'integration',
          attested: false,
          description:
            'Lambda が失敗したイベントを SQS DLQ に退避。再処理用に DLQ 滞留を監視。',
          cfnHint: 'AWS::SQS::Queue + DeadLetterConfig',
        },
        {
          id: 's3-logs',
          label: 'S3 ログ保管 (+ KMS)',
          role: 'storage',
          attested: true,
          description:
            '長期保管用にロググループから S3 へ転送。KMS で暗号化し、CloudWatch Log Group はライフサイクル管理。',
          cfnHint: 'AWS::Logs::LogGroup + KMS + S3 Export Task',
        },
        {
          id: 'systems-manager',
          label: 'Systems Manager',
          role: 'governance',
          attested: true,
          description:
            'Run Command / Automation / Parameter Store を運用フローで活用。IAM 最小権限で Agent・Lambda 間の権限境界を設計。',
          cfnHint: 'AWS::SSM::Document + Parameter',
        },
      ],
    },
  },
  {
    id: 'pj3',
    slug: 'container-cicd-platform',
    code: 'PJ3',
    shortTitle: 'コンテナ基盤 / CI/CD',
    title: 'コンテナアプリケーション実行基盤構築',
    subtitle: 'ECS 実行基盤の上に、GitHub Actions による CI/CD パイプラインを主役として説明する案件。',
    period: '2022年7月 - 2023年10月',
    role: 'SE',
    team: '4名',
    summary:
      '職務経歴書では ECS / Fargate 構成設計、ALB ルーティング、ECR イメージ管理、GitHub Actions による CI/CD パイプライン構築、タスク定義更新、コンテナログ確認を担当している。学習用の主軸は GitHub Actions -> ECR -> Task Definition -> ECS までの CD 導線。',
    learningFocus:
      'このページでは「コンテナ基盤」の中でも GitHub Actions による CI/CD パイプライン構築を案件の主題として扱う。ECS 実行系はデプロイ先として最小限に置き、CI / CD の流れを優先して説明する。',
    stageChips: ['詳細設計', '実装', '単体試験', '運用保守'],
    techChips: ['Amazon Linux 2', 'ECS', 'Fargate', 'ECR', 'ALB', 'Route53', 'CloudWatch Logs', 'CloudWatch Alarm', 'SSM Parameter Store', 'IAM', 'CloudFormation', 'GitHub Actions', 'Bash', 'Nginx'],
    responsibilities: [
      'ECS / Fargate 構成、ALB ルーティング、ECR イメージ管理の詳細設計',
      'CloudFormation による基盤構築と ECS タスク定義の作成',
      'GitHub Actions で build、ECR 登録、タスク定義更新、ECS 反映の自動化',
      '起動確認、ALB 疎通確認、CloudWatch Logs を使ったリリース確認と障害切り分け',
    ],
    evidence: ['職務経歴書 85-94 行', '面接Q&A コンテナ基盤', '背景・状況設定 PJ3'],
    attested: true,
    attestationSource: '職務経歴書 85-94 行',
    compare: {
      entry: '開発者 push / release + Route53 -> ALB',
      process: 'GitHub Actions / ECS / Fargate',
      storage: 'ECR / SSM Parameter Store',
      monitor: 'CloudWatch Logs / Alarm / リリース確認',
      responsibility: 'Task Definition、ECR、GitHub Actions、起動ログ確認',
      deepDive: 'CPU / Memory / ポート、タグ運用、ジョブ構成、Parameter Store 参照',
    },
    tracks: [
      {
        label: '30秒',
        body:
          'アプリ本体ではなく、アプリチームが使うコンテナ実行基盤と CI/CD 導線を担当した案件です。学習用には GitHub Actions でイメージを作り、ECR に登録し、Task Definition を更新して ECS へ反映する流れを主役にして話せます。',
      },
      {
        label: '60秒',
        body:
          '詳細設計では ECS タスク定義の CPU / Memory / ポート、CloudWatch Logs 出力、ECR イメージの扱い、ALB ルーティングを整理しました。実装では CloudFormation で基盤を作り、GitHub Actions で build、ECR push、タスク定義更新、ECS 反映までをつなぎました。',
      },
      {
        label: '90秒',
        body:
          '試験では ECS / Fargate でタスクが正常起動すること、Route53 -> ALB -> ECS の疎通、CloudWatch Logs に起動ログが出ることを確認しました。深掘りされたら CI と CD の役割分担、Task Definition 更新の確認ポイント、SSM Parameter Store の参照、リリース後にどのログを見たかまで具体的に話せます。',
      },
    ],
    qas: [
      {
        category: '詳細設計',
        question: 'ECS / Fargate 構成設計では、何を詳細設計しましたか。',
        answer:
          'ECS タスク定義に必要な CPU・メモリ、コンテナポート、CloudWatch Logs への出力、IAM と SSM Parameter Store の参照方法を整理しました。',
      },
      {
        category: '実装',
        question: 'GitHub Actions による CI/CD はどこまで担当しましたか。',
        answer:
          'コンテナイメージのビルド、ECR への登録、タスク定義更新、ECS への反映までを一連で実装しました。',
      },
      {
        category: '単体試験',
        question: 'ALB 疎通確認はどのように行いましたか。',
        answer:
          'Route53 で名前解決した URL にアクセスして、ALB 経由で Nginx の応答が返ることを確認しました。',
      },
      {
        category: '運用保守',
        question: 'コンテナリリース作業はどのように進めていましたか。',
        answer:
          'GitHub Actions でイメージを更新し、ECS へ反映した後に ALB 疎通と CloudWatch Logs を見て問題がないか確認していました。',
      },
    ],
    followUps: ['CI / CD とは何か', '何で起動するか', 'どう検証したか'],
    diagram: {
      src: '/architecture/pj3.svg',
      caption:
        '開発者 push → GitHub Actions (OIDC で assume) → ECR へ docker push + S3 Artifact へ build 成果物保管 → RegisterTaskDef で新リビジョン登録 → ECS update-service。Route 53 → IGW → ALB → ECS Fargate タスクで配信、外向き通信は NAT GW 経由。タスクは ECR から pull、SSM Parameter Store で設定取得、CloudWatch Logs → Alarm → SNS 通知。',
      fromResume: [
        'ECS / Fargate、ECR、ALB、Route 53',
        'GitHub Actions による CI/CD 一連',
        'CloudWatch Logs / Alarm、IAM、SSM Parameter Store',
        'CloudFormation 構築、Bash、Nginx',
      ],
      imagined: [
        'OIDC federation による鍵なし認証',
        'ALB への ACM 証明書 (HTTPS :443)',
        '複数 Fargate タスク並列 (multi-AZ)',
        'NAT Gateway 経由の Fargate egress',
        'S3 Artifact Bucket による build 成果物保管',
        'RegisterTaskDef → UpdateService のデプロイ 2 段階',
        'CloudWatch Alarm (5xx / CPU) → SNS',
      ],
      nodes: [
        {
          id: 'github-actions',
          label: 'GitHub Actions (OIDC)',
          role: 'integration',
          attested: true,
          description:
            'push/release トリガで build → ECR push → RegisterTaskDef → UpdateService を実行。OIDC で AWS に鍵なし assume する現代的な CI/CD。',
          cfnHint: 'OIDC Provider + IAM Role assumable from workflow',
          relatedQaIds: ['pj3-qa-06', 'pj3-qa-07'],
        },
        {
          id: 'ecr',
          label: 'ECR (Container Registry)',
          role: 'storage',
          attested: true,
          description:
            'コンテナイメージを tag 付きで保管。Image Scan と LifecyclePolicy で古いタグを掃除。',
          cfnHint: 'AWS::ECR::Repository + LifecyclePolicy',
        },
        {
          id: 'task-def',
          label: 'ECS Task Definition',
          role: 'compute',
          attested: true,
          description:
            'CPU/Memory/ポート・コンテナ設定・IAM roles・CloudWatch Logs 出力先を JSON で定義。RegisterTaskDef → UpdateService でデプロイ。',
          cfnHint: 'AWS::ECS::TaskDefinition',
          relatedQaIds: ['pj3-qa-05'],
        },
        {
          id: 'ecs-fargate',
          label: 'ECS Fargate (Multi-AZ)',
          role: 'compute',
          attested: true,
          description:
            'サーバレスコンテナ実行基盤。タスクは private subnet、NAT 経由で egress、ALB target group に登録。',
          cfnHint: 'AWS::ECS::Service (launchType Fargate)',
          relatedQaIds: ['pj3-qa-08'],
        },
        {
          id: 'alb',
          label: 'ALB (ACM HTTPS)',
          role: 'entry',
          attested: true,
          description:
            'ECS サービスの前段 ALB。ACM 証明書で HTTPS を受け、Fargate タスクにルーティング。',
          cfnHint: 'AWS::ElasticLoadBalancingV2 + AWS::CertificateManager::Certificate',
        },
        {
          id: 'ssm-param-store',
          label: 'SSM Parameter Store',
          role: 'governance',
          attested: true,
          description:
            'タスク起動時に環境変数として設定値を注入。SecureString + KMS で機密情報も統合管理。',
          cfnHint: 'AWS::SSM::Parameter (Type: String / SecureString)',
        },
        {
          id: 's3-artifact',
          label: 'S3 Artifact Bucket',
          role: 'storage',
          attested: false,
          description:
            'ビルド成果物を tag 付きで S3 に保管。デプロイ失敗時のロールバック根拠として機能。',
          cfnHint: 'AWS::S3::Bucket + VersionConfiguration',
        },
        {
          id: 'cloudwatch',
          label: 'CloudWatch Logs / Alarm',
          role: 'monitoring',
          attested: true,
          description:
            'Fargate タスクの stdout/stderr を CloudWatch Logs に集約。5xx/CPU しきい値は Alarm → SNS。',
        },
      ],
    },
  },
  {
    id: 'pj4',
    slug: 'file-integration-platform',
    code: 'PJ4',
    shortTitle: 'ファイル連携基盤',
    title: 'ファイル連携システム基盤構築・運用',
    subtitle: 'Transfer Family で受信し、S3 に保管し、Lambda と通知につなぐ外部連携案件。',
    period: '2021年3月 - 2022年6月',
    role: 'SE',
    team: '6名',
    summary:
      '外部システムから安全にファイルを受け取り、S3 に格納し、Lambda の後続処理と通知につなげる案件。Transfer Family、S3、Lambda、KMS、VPC Endpoint、CloudWatch、SNS を入口から通知までの流れで説明できる。',
    learningFocus:
      'Transfer Family の役割、S3 の格納先設計、Lambda の受信後処理、Windows Server を含む実機試験を一連の連携導線として話す。',
    stageChips: ['詳細設計', '実装', '単体試験', '結合試験'],
    techChips: ['RHEL', 'Windows Server', 'AWS Transfer Family', 'S3', 'Lambda', 'CloudWatch Logs', 'CloudWatch Alarm', 'SNS', 'IAM', 'KMS', 'VPC Endpoint', 'CloudFormation', 'Bash', 'Python'],
    responsibilities: [
      'S3 ファイル保管設計、Transfer Family / Lambda 連携設計、通知設計',
      'S3 バケット作成、ポリシー設定、Transfer Family 設定、Lambda 実装',
      'CloudWatch 監視設定と SNS 通知設定',
      'Windows Server を使った送受信確認と外部連携を含む結合試験',
    ],
    evidence: ['職務経歴書 112-121 行', '面接Q&A ファイル連携基盤', '背景・状況設定 PJ4'],
    attested: true,
    attestationSource: '職務経歴書 112-121 行',
    compare: {
      entry: 'SFTP -> Transfer Family',
      process: 'Lambda 後続処理',
      storage: 'S3 / KMS',
      monitor: 'CloudWatch / SNS / 外部連携試験',
      responsibility: 'Transfer、S3、Lambda、Windows 送受信確認、結合試験',
      deepDive: 'Transfer の役割、S3 配置、Lambda 処理内容、通知確認',
    },
    tracks: [
      {
        label: '30秒',
        body:
          '外部連携先から SFTP でファイルを受け取り、Transfer Family から S3 に格納し、Lambda で後続処理して CloudWatch と SNS で監視・通知する案件です。自分は受信、保存、通知、試験まで担当しました。',
      },
      {
        label: '60秒',
        body:
          '詳細設計では受信ファイルの格納先、プレフィックス、KMS 利用、Transfer Family と Lambda の連携、通知条件を整理しました。実装では CloudFormation で主要リソースを構築し、S3 バケットとポリシー、Transfer Family 設定、Lambda 処理を作り込みました。',
      },
      {
        label: '90秒',
        body:
          '単体試験と結合試験では Windows Server から実際に送受信し、S3 格納、Lambda 実行、CloudWatch Logs、SNS 通知まで一連で確認しました。深掘りでは Transfer Family の役割、S3 配置先、KMS を使う理由、Lambda の環境変数やタイムアウト、障害時の切り分け順まで話せます。',
      },
    ],
    qas: [
      {
        category: '詳細設計',
        question: 'Transfer Family と Lambda の連携はどう設計しましたか。',
        answer:
          'Transfer Family で受信したファイルが S3 に格納された後、Lambda で受信後処理を行う流れを設計しました。',
      },
      {
        category: '実装',
        question: 'S3 バケット作成とポリシー設定では何をしましたか。',
        answer:
          'バケットを作成し、必要なサービスや利用者だけがアクセスできるようにポリシーを設定しました。',
      },
      {
        category: '単体試験',
        question: 'S3 格納確認では何を見ましたか。',
        answer:
          '想定した S3 の配置先にファイルが置かれることと、ファイル名や格納場所にずれがないことを確認しました。',
      },
      {
        category: '結合試験 / 運用',
        question: '障害が出たときはどこから切り分けましたか。',
        answer:
          'まず CloudWatch Logs と CloudWatch Alarm を確認し、その後に Transfer Family 設定、Lambda のエラー内容、Windows 側の送受信状況を切り分けました。',
      },
    ],
    followUps: ['Transfer Family の役割', 'S3 保存 / プレフィックス', 'どこまで結合試験したか'],
    diagram: {
      src: '/architecture/pj4.svg',
      caption:
        '外部パートナーが SFTP → AWS Transfer Family 経由で S3 Landing バケット (KMS 暗号化) へ格納 → S3 Event で Lambda 起動 → 後続処理して S3 Active バケットへ。失敗時は DLQ (SQS) に退避。Lambda は VPC Endpoint で S3 / KMS へプライベート到達。Transfer Family と Lambda で別々のログストリーム → Metric Filter → CloudWatch Alarm → SNS でメール通知。S3 Landing は Glacier にライフサイクル移行。Windows Server は送受信試験用。',
      fromResume: [
        'AWS Transfer Family、S3、Lambda',
        'CloudWatch Logs / Alarm、SNS、IAM、KMS、VPC Endpoint',
        'Windows Server による送受信確認',
        'CloudFormation 構築、Bash / Python',
      ],
      imagined: [
        'S3 Landing バケット / S3 Active バケットの分離',
        'S3 ライフサイクル → Glacier 保管',
        'パーティション化プレフィックス',
        'Lambda → IAM Role 最小権限 assume を明示',
        'Lambda 失敗時の DLQ (SQS) 退避',
        'KMS 専用 VPC Endpoint (S3 と別)',
        'Transfer Family Audit Log / Lambda Log の分離',
        'Metric Filter → Alarm → SNS の監視導線',
      ],
      nodes: [
        {
          id: 'transfer-family',
          label: 'AWS Transfer Family (SFTP)',
          role: 'entry',
          attested: true,
          description:
            '外部パートナーが SFTP で接続し S3 Landing に直接格納。ユーザ管理と監査ログは Transfer 側で対応。',
          cfnHint: 'AWS::Transfer::Server + User',
          relatedQaIds: ['pj4-qa-01', 'pj4-qa-04'],
        },
        {
          id: 's3-landing',
          label: 'S3 Landing (KMS)',
          role: 'storage',
          attested: true,
          description:
            '受信ファイルの一次置き場。KMS で暗号化、VPC Endpoint で Lambda/Transfer からプライベート到達。',
          cfnHint: 'AWS::S3::Bucket + BucketEncryption (aws:kms)',
        },
        {
          id: 's3-active',
          label: 'S3 Active Bucket',
          role: 'storage',
          attested: false,
          description:
            'Lambda 処理後の正規データを別バケットに配置。ライフサイクルで Glacier に移行。',
          cfnHint: 'AWS::S3::Bucket + LifecycleConfiguration',
        },
        {
          id: 'lambda',
          label: 'Lambda (S3 Event Trigger)',
          role: 'compute',
          attested: true,
          description:
            'Landing バケットの PUT イベントで起動。後続処理を実行し、失敗時は DLQ に退避。',
          cfnHint: 'AWS::Lambda::Function + Event Source Mapping (S3)',
          relatedQaIds: ['pj4-qa-06'],
        },
        {
          id: 'kms',
          label: 'KMS Key (Customer Managed)',
          role: 'governance',
          attested: true,
          description:
            'S3 + CloudWatch Logs を暗号化する CMK。IAM で復号権限を絞り、Key rotation を有効化。',
          cfnHint: 'AWS::KMS::Key + Alias',
        },
        {
          id: 'vpc-endpoint',
          label: 'VPC Endpoints (S3 + KMS)',
          role: 'integration',
          attested: true,
          description:
            'S3 は Gateway Endpoint、KMS は Interface Endpoint でプライベート通信。Internet 経由せず安全。',
          cfnHint: 'AWS::EC2::VPCEndpoint × 2',
        },
        {
          id: 'cloudwatch',
          label: 'CloudWatch (Logs + Alarm + SNS)',
          role: 'monitoring',
          attested: true,
          description:
            'Transfer と Lambda それぞれロググループ分離。Metric Filter → Alarm → SNS でメール通知。',
          relatedQaIds: ['pj4-qa-08'],
        },
        {
          id: 'dlq',
          label: 'Lambda DLQ (SQS)',
          role: 'integration',
          attested: false,
          description:
            'Lambda 失敗時のイベント退避先。DLQ 滞留を Alarm 監視し、手動リトライで救済。',
        },
      ],
    },
  },
  {
    id: 'pj5',
    slug: 'sales-management-system',
    code: 'PJ5',
    shortTitle: '販売管理システム',
    title: '販売管理システム 開発支援',
    subtitle: 'Spring Boot、Java、SQL、単体試験、結合試験、不具合修正を素直に説明する業務アプリ案件。',
    period: '2020年7月 - 2021年3月',
    role: 'PG',
    team: '6名',
    summary:
      '既存の社内業務システムに対する開発支援案件。画面から業務ロジック、SQL、DB、試験、不具合修正までを既存仕様に沿って担当した。AWS 基盤案件ではないため、Java / SQL / Spring Boot の改修案件として話す。',
    learningFocus:
      '既存仕様に沿った詳細設計、業務ロジック実装、SQL、試験、不具合修正の流れを、画面 -> Java -> SQL -> DB で整理する。',
    stageChips: ['詳細設計', '実装', '単体試験', '結合試験', '運用保守'],
    techChips: ['Linux', 'Java', 'SQL', 'Spring Boot', 'MySQL / Oracle', 'Git', 'Eclipse / IntelliJ IDEA'],
    responsibilities: [
      '詳細設計書の作成と処理フロー、入出力、例外時動作の整理',
      'Java による業務ロジック実装と SQL を用いたデータ取得・更新処理の開発',
      '単体試験、結合試験、試験データ作成',
      '不具合修正、問い合わせ対応、ログやデータ調査',
    ],
    evidence: ['職務経歴書 137-146 行', '面接Q&A 販売管理システム', '背景・状況設定 PJ5'],
    attested: true,
    attestationSource: '職務経歴書 137-146 行',
    compare: {
      entry: '社内ユーザーの画面操作',
      process: 'Spring Boot / Java / SQL',
      storage: 'MySQL / Oracle',
      monitor: '単体試験 / 結合試験 / 不具合修正',
      responsibility: '詳細設計、Java 実装、SQL、試験、保守',
      deepDive: '条件分岐、SQL 更新対象、試験データ、影響範囲確認',
    },
    tracks: [
      {
        label: '30秒',
        body:
          '販売管理システムの既存機能に対する開発支援案件で、詳細設計、Java 実装、SQL、単体試験、結合試験、不具合修正を担当しました。基盤よりも業務ロジックとデータ処理が中心です。',
      },
      {
        label: '60秒',
        body:
          '詳細設計では処理の流れ、入力値と出力値、DB 取得 / 更新内容、条件分岐、例外時の動きを整理しました。実装では Spring Boot 上で Java の業務ロジックを書き、SQL で一覧取得や更新処理を作成し、単体試験と結合試験まで行いました。',
      },
      {
        label: '90秒',
        body:
          '深掘りでは SQL の検索条件や更新対象、試験データの作り方、不具合調査の進め方を話せます。再現条件を確認してからログ、SQL 結果、該当ソースを見て原因を絞り、修正後は単体確認に加えて関連処理まで結合観点で再確認していました。',
      },
    ],
    qas: [
      {
        category: '詳細設計',
        question: '担当した詳細設計書には何を書いていましたか。',
        answer:
          '処理の流れ、入力値と出力値、DB の取得・更新内容、条件分岐、例外時の動きを整理していました。',
      },
      {
        category: '実装 / SQL',
        question: 'SQL ではどんな処理を作っていましたか。',
        answer:
          '一覧や詳細の取得用 SELECT、登録や更新用の INSERT・UPDATE を中心に作成していました。',
      },
      {
        category: '試験',
        question: '試験データはどう作っていましたか。',
        answer:
          '正常系と異常系を確認できるように、必要なパターンのデータを SQL で用意していました。',
      },
      {
        category: '不具合修正',
        question: '不具合調査はどう進めていましたか。',
        answer:
          '再現条件を確認した上で、ログ、SQL 結果、該当ソースを見て原因を切り分けていました。',
      },
    ],
    followUps: ['どの層を担当したか', 'どんな SQL を書いたか', '不具合修正の進め方'],
    diagram: {
      src: '/architecture/pj5.svg',
      caption:
        '社内業務システムを Client (Users / Admin / Browser) → LB → Auth → Spring Boot (Controller / Service / DAO / Batch) → MySQL/Oracle の階層で整理。データ層は Primary / Read Replica (reporting) / Read-only / Backup / Test / Archive の 6 ロール。Dev & Build は IDE → Git → CI → Artifact → Release、Test / QA は JUnit / Integration / TestData / Coverage。不具合は Bug Tracker → Fix → Hotfix のループで元の Git に戻る。',
      fromResume: [
        'Java、SQL、Spring Boot、Linux',
        'MySQL / Oracle',
        'Eclipse / IntelliJ IDEA、Git',
        '詳細設計、単体試験、結合試験、不具合修正',
      ],
      imagined: [
        '3 層 (Controller / Service / DAO) の明示',
        'Load Balancer / Auth 層を追加',
        'Batch ジョブ / 内部 API を明示',
        'Read Replica (reporting) / Read-only / Backup / Test / Archive の 6 DB ロール',
        'CI server + Artifact Repo + Release 段階',
        'JUnit / Integration / TestData / Coverage (JaCoCo)',
        'Bug Tracker → Bug fix → Hotfix patch の運用保守ループ',
        'Admin / Ops team の追加アクター',
      ],
      nodes: [
        {
          id: 'client',
          label: 'Client (Browser)',
          role: 'entry',
          attested: true,
          description:
            '社内ユーザー・管理者の PC ブラウザ。画面操作で Spring Boot へリクエスト。',
          relatedQaIds: ['pj5-qa-01'],
        },
        {
          id: 'lb-auth',
          label: 'Load Balancer + Auth 層',
          role: 'entry',
          attested: false,
          description:
            'LB でリクエストを分散し、Auth 層で社内認証を通してから Spring Boot に渡す標準 3 層構成。',
        },
        {
          id: 'controller',
          label: 'Spring Boot Controller',
          role: 'compute',
          attested: true,
          description:
            'HTTP リクエストを受け、バリデーション後に Service 層を呼ぶ。Java による実装を担当。',
          relatedQaIds: ['pj5-qa-03'],
        },
        {
          id: 'service-layer',
          label: 'Service Layer (業務ロジック)',
          role: 'compute',
          attested: true,
          description:
            '業務ロジックを実装。条件分岐・例外時動作・データ整形を担当し、詳細設計書に準拠。',
          relatedQaIds: ['pj5-qa-04'],
        },
        {
          id: 'dao-layer',
          label: 'DAO Layer (SQL)',
          role: 'compute',
          attested: true,
          description:
            'SELECT/INSERT/UPDATE の SQL を実装。取得条件・更新対象の設計と試験データ準備を担当。',
          relatedQaIds: ['pj5-qa-05', 'pj5-qa-06'],
        },
        {
          id: 'mysql-primary',
          label: 'MySQL / Oracle (Primary)',
          role: 'storage',
          attested: true,
          description:
            '業務データの Primary DB。Service/DAO からの読み書き対象。',
          relatedQaIds: ['pj5-qa-08'],
        },
        {
          id: 'read-replica',
          label: 'Read Replica (Reporting)',
          role: 'storage',
          attested: false,
          description:
            'レポート用途の読み取り専用レプリカ。業務影響を減らしつつ集計クエリを捌く。',
        },
        {
          id: 'test-qa',
          label: 'Test / QA (JUnit + Integration)',
          role: 'governance',
          attested: true,
          description:
            '単体試験 (JUnit) + 結合試験 + 試験データ準備 + 不具合調査を担当。',
          relatedQaIds: ['pj5-qa-10', 'pj5-qa-13'],
        },
      ],
    },
  },
];

export function getProjectBySlug(slug: string) {
  return resumeProjects.find((project) => project.slug === slug);
}

export function getProjectById(id: ProjectId) {
  return resumeProjects.find((project) => project.id === id);
}
