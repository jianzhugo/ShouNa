# ShouNa - 家庭收纳备忘

一个基于 Cloudflare Pages + Functions 的家庭收纳管理应用，帮助您轻松管理家庭物品的存放位置和数量。

## 功能特性

- **物品管理** - 添加、编辑、删除物品，记录存放位置和数量
- **分类管理** - 自定义物品分类，便于查找
- **空间管理** - 创建房屋、房间、收纳位置的层级结构
- **家庭共享** - 通过邀请码邀请家庭成员共同管理
- **图片上传** - 为物品添加照片，便于识别
- **搜索功能** - 快速搜索物品
- **回收站** - 误删物品可恢复
- **活动日志** - 记录所有操作历史

## 技术栈

- **前端**: Vue 3 + Vue Router + Pinia
- **构建工具**: Vite
- **后端**: Cloudflare Pages Functions
- **数据库**: Cloudflare D1 (SQLite)
- **存储**: Cloudflare R2
- **部署**: Cloudflare Pages

## 项目结构

```
shouna/
├── src/                    # 前端源代码
│   ├── components/         # 组件
│   ├── views/              # 页面视图
│   ├── layouts/            # 布局组件
│   ├── stores/             # Pinia 状态管理
│   ├── router/             # 路由配置
│   ├── api/                # API 调用
│   └── styles/             # 样式文件
├── functions/              # Cloudflare Functions (后端)
│   └── api/v1/             # API 路由
├── public/                 # 静态资源 (favicon等)
├── dist/                   # 构建产物
├── wrangler.toml           # Cloudflare 配置
├── vite.config.js          # Vite 配置
└── package.json            # 项目依赖
```

## 本地开发

### 前置要求

- Node.js >= 18
- npm 或 yarn
- Cloudflare Wrangler CLI (`npm install -g wrangler`)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

应用将在 `http://localhost:5173` 运行。

### 构建项目

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

## 部署到 Cloudflare Pages

### 方式一：GitHub 自动部署（推荐）

1. **创建 Cloudflare 资源**

   在 Cloudflare Dashboard 创建以下资源：
   - **D1 Database**: 命名为 `shouna-db`
   - **R2 Bucket**: 命名为 `shouna-photos`

2. **配置 wrangler.toml**

   更新 `wrangler.toml` 中的 `database_id` 为您创建的 D1 数据库 ID。

3. **推送到 GitHub**

   将代码推送到您的 GitHub 仓库。

4. **连接 Cloudflare Pages**

   - 进入 Cloudflare Dashboard → Workers & Pages → Create application → Pages
   - 点击 **Connect to Git**，选择您的 GitHub 仓库
   - 配置构建设置：
     - **Framework preset**: `None`
     - **Build command**: `npm run build`
     - **Build output directory**: `dist`
   - 点击 **Save and Deploy**

5. **配置环境变量**

   在 Pages 项目 → Settings → Environment variables 添加：
   - `JWT_SECRET`: 生成一个安全的随机字符串（用于 JWT 签名）
   - `JWT_REFRESH_SECRET`: 生成另一个安全的随机字符串（用于刷新令牌）

### 方式二：Wrangler CLI 部署

```bash
# 登录 Cloudflare
wrangler login

# 部署到 Cloudflare Pages
npm run deploy
```

## 环境变量

| 变量名 | 说明 | 是否必需 |
|--------|------|----------|
| `JWT_SECRET` | JWT 访问令牌签名密钥 | 是 |
| `JWT_REFRESH_SECRET` | JWT 刷新令牌签名密钥 | 是 |

## Cloudflare 资源配置

### D1 数据库

- **绑定名称**: `DB`
- **数据库名称**: `shouna-db`

### R2 Bucket

- **绑定名称**: `BUCKET`
- **Bucket 名称**: `shouna-photos`

## 注意事项

1. **首次部署**：应用会自动初始化数据库表结构，无需手动执行 SQL。
2. **安全**：不要将 `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 提交到代码仓库。
3. **CORS**：Cloudflare Pages Functions 默认支持所有来源，生产环境建议配置 CORS。

## 许可证

MIT License