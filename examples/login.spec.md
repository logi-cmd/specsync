---
title: Login API
version: 1.0.0
---

## API: POST /api/login

### Request
- username: string (6-20 characters)
- password: string (8-32 characters, must include letters and numbers)
- rememberMe: boolean

### Response
- token: string
- expiresIn: number
- userId: string

### 业务规则
1. 用户名不能为空
2. 密码必须包含字母和数字
3. 三次登录失败后需要验证码
