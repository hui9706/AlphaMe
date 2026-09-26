# AlphaMe

AlphaMe 是面向越南 Zalo 用户的模板化 AI 图片生成 Mini App，支持中文/越南文、Coin、好友合拍和 AI Challenge。

## 当前阶段

本仓库当前已建立前台 Mini App、管理后台和第一阶段 API 基础。API 使用 NestJS + Prisma + MySQL，已包含模板、用户、Coin 账本和生成任务模型；火山 Ark、Zalo、服务器存储和数据库连接均通过环境变量接入，密钥不会写入前端代码。

## 启动

```bash
npm install
npm run dev:miniapp
npm run dev:admin
npm run dev:api
```

默认语言：越南文。两端都可在右上角切换中文。

后端初始化与接口说明见 [`apps/api/README.md`](apps/api/README.md)。
