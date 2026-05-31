# 弦卷心生日星旅

移动端优先的生日庆祝站原型。首屏之后立刻进入应援地图，后续章节再承接祝福星河、倒计时流程和活动归档。

## 技术栈

- Vue 3
- TypeScript
- Vite
- GSAP
- lucide-vue-next

## 推荐后端接入

活动期只有一个半月左右时，建议使用腾讯云 CloudBase：

- `locations`：应援点位，支持管理员增删改查
- `blessings`：祝福留言，默认待审核
- `media_assets`：首页图、相册、视频封面
- `site_config`：生日日期、首页文案、模块开关
- `admin_users`：管理员与角色

`src/services/adminApi.ts` 已经留出数据源接口，后续可以把当前示例数据替换为 CloudBase 云函数或数据库查询。

## 本地开发

```bash
npm install
npm run dev
```

Windows PowerShell 如果拦截 `npm.ps1`，可以使用：

```bash
npm.cmd install
npm.cmd run dev
```
