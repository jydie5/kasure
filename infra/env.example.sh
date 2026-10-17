# 共通設定の雛形。`cp env.example.sh env.sh` して値を埋める（env.sh は git 管理外）
export AWS_PROFILE=your-profile
export AWS_REGION=ap-northeast-1
export ACCOUNT_ID=123456789012
export BUCKET=kasure-media-$ACCOUNT_ID-apne1
export ROLE_NAME=kasure-webfn-role
export CLUSTER_ID=your-dsql-cluster-id
export DSQL_HOST=$CLUSTER_ID.dsql.$AWS_REGION.on.aws
export POOL_ID=ap-northeast-1_XXXXXXXXX
export CLIENT_ID=your-cognito-app-client-id
export COGNITO_DOMAIN=https://your-prefix.auth.$AWS_REGION.amazoncognito.com
export APP_URL=https://your-endpoint.lambda-web.$AWS_REGION.on.aws
export ADMIN_EMAILS=admin@example.com
