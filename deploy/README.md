# AlphaMe 自动部署

## 日常发布

```bash
git add .
git commit -m "更新 AlphaMe"
git push origin main
```

推送到 `main` 后，GitHub Actions 会自动：

1. 安装依赖并运行全仓库 typecheck/build
2. 通过 SSH + rsync 同步到 `/www/www1/alphame`
3. 保留服务器上的 `apps/api/.env`
4. 在服务器执行 Prisma generate、数据库迁移和构建
5. 将管理后台发布到 `/www/www1/alphame/apps/admin/dist`
6. 重启 PM2 进程 `alphame-api`
7. 检查 `/v1/health`

## GitHub 仓库配置

在仓库 `Settings → Secrets and variables → Actions` 添加：

- `SERVER_SSH_KEY`：可以登录服务器 `45.207.219.45:9706` 的 SSH 私钥全文

## 服务器前置条件

服务器需要准备：

- Node.js 22+
- npm
- PM2
- rsync
- curl
- `/www/www1/alphame/apps/api/.env`
- MySQL 和 Redis 已运行

首次部署时如果 PM2 进程不存在，脚本会自动创建 `alphame-api`。
