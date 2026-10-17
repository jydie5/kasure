#!/bin/sh
# Lambda Web Functions へデプロイ（初回は CREATE=1 で実行）
set -e
cd "$(dirname "$0")"
. ../infra/env.sh
APP_URL=${APP_URL:-https://placeholder.invalid}
aws lambda-web deploy --name kasure --code .next/standalone --include-hidden-files \
  ${CREATE:+--create --max-environments 2 --rate-limit 100} \
  --execution-role-arn arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME} \
  --bucket-name awscli-lambdaweb-${ACCOUNT_ID}-${AWS_REGION}-an \
  --timeout-seconds 30 \
  --env DSQL_HOST=${DSQL_HOST} \
  --env MEDIA_BUCKET=${BUCKET} \
  --env COGNITO_DOMAIN=${COGNITO_DOMAIN} \
  --env COGNITO_CLIENT_ID=${CLIENT_ID} \
  --env COGNITO_POOL_ID=${POOL_ID} \
  --env APP_URL=${APP_URL} \
  --env ADMIN_EMAILS=${ADMIN_EMAILS:?ADMIN_EMAILS を infra/env.sh に設定してください} \
  --env NODE_ENV=production \
  --tags app=kasure
