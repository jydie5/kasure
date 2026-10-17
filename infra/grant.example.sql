-- アプリ用 DB ロールを IAM ロールに紐付ける（ACCOUNT_ID / ROLE_NAME を置き換えて admin で実行）
AWS IAM GRANT yohaku_app TO 'arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME';
