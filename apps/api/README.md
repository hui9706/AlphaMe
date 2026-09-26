# AlphaMe API

第一阶段后端垂直切片，负责用户、模板、Coin 账本和生成任务入口。

## 本地启动

```bash
cp apps/api/.env.example apps/api/.env
# 在项目根目录启动 MySQL 5.7.44 和 Redis
docker compose up -d mysql redis
npm --workspace apps/api run prisma:generate
npm --workspace apps/api run prisma:migrate
npm --workspace apps/api run prisma:seed
npm run dev:api
```

如需创建首个管理员，执行 seed 前临时设置 `ADMIN_BOOTSTRAP_USERNAME`、`ADMIN_BOOTSTRAP_PASSWORD`；密码只写入 scrypt 哈希，不会写入代码或日志。

接口前缀为 `/v1`：

- `GET /v1/health`
- `POST /v1/auth/zalo`：请求体为 `{ accessToken }`；后端向 Zalo Graph API 校验 Mini App 用户身份。若 Zalo 因服务器出口 IP 限制个人信息接口，可改用账号密码登录
- `POST /v1/auth/register`：请求体为 `{ username, password }`；用户名 3–24 位，仅限字母、数字、下划线和连字符，密码 8–128 位；注册即登录并发放新用户初始 Coin
- `POST /v1/auth/login`：请求体为 `{ username, password }`；成功后返回与 Zalo 登录相同的 AlphaMe JWT 会话
- `GET /v1/templates`
- `POST /v1/uploads/image`：Bearer JWT + `{ dataUrl }`，目前限制 15MB 的 jpeg/png/webp
- `POST /v1/generations`：要求 Bearer JWT、`Idempotency-Key`、`templateId` 和 `sourceAssetUrl`
- `POST /v1/admin/auth/login`
- `GET /v1/admin/stats`
- `GET/POST/PATCH /v1/admin/templates`
- `GET /v1/admin/users`
- `GET /v1/admin/generations`
- `GET/POST/PATCH /v1/admin/api-keys`

生成接口会原子冻结 Coin 并加入 BullMQ；Worker 调用 Seedream、下载结果到本地存储，成功后扣除 Coin，失败后退回 Coin。AI 密钥只在服务端使用。

后台维护任务每小时清理过期图片，并将超时的 QUEUED/PROCESSING 任务标记失败、退回冻结 Coin。
