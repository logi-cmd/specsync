---
title: 用户登录API
version: 1.0.0
---

## API: POST /api/login

### Request
- username: string (6-20字符)
- password: string (8-32字符)

### Response
- token: string
- expires: number

### 业务规则
1. 用户名不能为空
2. 密码必须包含字母和数字
3. token有效期为7天

## API: POST /api/register

### Request
- username: string (6-20字符)
- password: string (8-32字符)
- email: string (邮箱格式)

### Response
- userId: string
- message: string

### 业务规则
1. 用户名唯一
2. 邮箱唯一
3. 发送验证邮件
