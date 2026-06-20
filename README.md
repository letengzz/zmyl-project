# zmyl-project

基于 **Nuxt 4** 的前端项目模板，集成 Tailwind CSS 4、shadcn-vue、VueUse 等现代工具链，开箱即用。

## 技术栈

| 类别 | 技术 | 版本 |
| --- | --- | --- |
| 框架 | [Nuxt](https://nuxt.com/) | ^4.3.1 |
| UI 库 | [Vue 3](https://vuejs.org/) | ^3.5.28 |
| 路由 | [Vue Router](https://router.vuejs.org/) | ^4.6.4 |
| 语言 | [TypeScript](https://www.typescriptlang.org/) | ^6.0.3 |
| CSS 框架 | [Tailwind CSS](https://tailwindcss.com/) | ^4.3.0 |
| UI 组件库 | [shadcn-vue](https://www.shadcn-vue.com/)（New York 风格） | via shadcn-nuxt 2.7.4 |
| 无头组件 | [Reka UI](https://www.reka-ui.com/) | ^2.9.10 |
| 图标库 | [Lucide](https://lucide.dev/) | ^1.17.0 |
| 组合式工具 | [VueUse](https://vueuse.org/) | ^14.2.1 |
| 样式工具 | [class-variance-authority](https://cva.style/) / [clsx](https://github.com/lukeed/clsx) / [tailwind-merge](https://github.com/dcastil/tailwind-merge) | — |
| 动画 | [tw-animate-css](https://github.com/Wombosvideo/tw-animate-css) | ^1.4.0 |
| 代码规范 | [ESLint](https://eslint.org/)（@nuxt/eslint） | 1.15.1 |
| 包管理器 | [pnpm](https://pnpm.io/) | 10.30.0 |

## 项目结构

```
.
├── app/
│   ├── assets/css/          # 全局样式（Tailwind CSS 入口 + 主题变量）
│   ├── components/ui/       # shadcn-vue UI 组件（Button 等）
│   ├── layouts/             # 页面布局（default.vue）
│   ├── lib/                 # 工具函数（cn 函数）
│   ├── pages/               # 页面路由（文件系统路由）
│   │   ├── index.vue        # 首页
│   │   ├── shadcn.vue       # shadcn 组件演示页
│   │   └── vueuse.vue       # VueUse 功能演示页
│   ├── plugins/             # Nuxt 插件（SSR 宽度配置）
│   └── app.vue              # 应用入口
├── public/                  # 静态资源
├── nuxt.config.ts           # Nuxt 配置文件
├── components.json          # shadcn-vue 配置
├── tsconfig.json            # TypeScript 配置
└── eslint.config.mjs        # ESLint 配置
```

## 功能特性

- **Nuxt 4** — 采用最新的 `app/` 目录结构与文件系统路由
- **Tailwind CSS 4** — 使用 CSS 变量（`oklch` 色彩空间）定义主题，支持亮色/暗色模式切换
- **shadcn-vue** — 基于 Reka UI 的高质量无头组件，样式可完全自定义
- **VueUse** — 丰富的组合式函数（鼠标追踪、本地存储、剪贴板、防抖、媒体查询等）
- **TypeScript** — 全量类型支持
- **ESLint** — 集成 Nuxt 官方 ESLint 规则
- **Inter 字体** — 通过 Google Fonts 引入

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

### 生成静态站点

```bash
pnpm generate
```

## Nuxt 模块

| 模块 | 说明 |
| --- | --- |
| `@nuxt/eslint` | ESLint 集成，自动代码规范检查 |
| `@vueuse/nuxt` | VueUse 的 Nuxt 集成，自动导入组合式函数 |
| `@nuxtjs/tailwindcss` | Tailwind CSS 的 Nuxt 模块 |
| `shadcn-nuxt` | shadcn-vue 的 Nuxt 集成，支持按需引入组件 |

## 主题配置

项目使用 CSS 变量定义主题色，基于 `oklch` 色彩空间，支持亮色与暗色两套主题。主题变量定义在 `app/assets/css/tailwind.css` 中，可通过修改 `:root`（亮色）和 `.dark`（暗色）下的变量值来自定义主题。

## 相关链接

- [Nuxt 文档](https://nuxt.com/docs/getting-started/introduction)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [shadcn-vue 文档](https://www.shadcn-vue.com/)
- [VueUse 文档](https://vueuse.org/)
- [Reka UI 文档](https://www.reka-ui.com/)
- [Lucide 图标](https://lucide.dev/icons/)
