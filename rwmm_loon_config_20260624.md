# 让我喵喵 Loon 配置指南

## 任务
生成 Loon 订阅链接并配置到 Loon

## 输出
- Loon 插件文件：`rwmm.plugin`
- 订阅链接：`https://raw.githubusercontent.com/zhaohantao1360-hash/rwmm-vip-scripts/main/rwmm.plugin`

## Loon 配置步骤

### 方法一：插件订阅（推荐）
1. 打开 Loon → 配置 → 插件
2. 点击右上角 "➕"
3. 粘贴订阅链接
4. 点击"安装"
5. 启用插件，重启 App

### 方法二：手动配置
添加到 Loon 配置文件：
```ini
[MITM]
hostname = www.pdreamer.com

[Script]
rwmm-userInfo = type=http-response, pattern=^https?://www\.pdreamer\.com.*?(getUserInfo|userInfo), requires-body=true, max-size=0, script-path=https://raw.githubusercontent.com/zhaohantao1360-hash/rwmm-vip-scripts/main/rwmm_subscription.js, timeout=30
```

## 注意事项
1. 开启 MITM 开关
2. 安装并信任证书
3. 重启 App

## 时间
2026-06-24 22:12 GMT+8

## 状态
✅ 已完成
