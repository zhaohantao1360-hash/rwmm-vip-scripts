# Loon 插件订阅链接生成方法

## 完整流程
准备脚本 → 创建.plugin文件 → 上传GitHub → 生成raw链接 → Loon订阅

## 第一步：准备脚本文件
核心 JavaScript 脚本，用于修改响应数据

## 第二步：创建 Loon 插件配置文件

### 文件名
`xxx.plugin`

### 文件结构
```ini
#!name=插件名称
#!desc=插件描述
#!openUrl=javascript:void(0)
#!author=作者
#!date=日期

[MITM]
hostname = 需要抓包的域名

[Script]
脚本名称 = type=http-response, pattern=正则匹配URL, requires-body=true, max-size=0, script-path=脚本链接, timeout=30
```

### 参数说明

#### [MITM] 部分
- `hostname`：需要抓包的域名
- 获取方式：用 Loon 抓包工具查看 App 请求

#### [Script] 部分
| 参数 | 说明 |
|------|------|
| `type` | 脚本类型（http-response 响应拦截）|
| `pattern` | URL 匹配正则 |
| `requires-body` | 是否需要请求体 |
| `max-size` | 最大响应大小（0=无限制）|
| `script-path` | 脚本 GitHub raw 链接 |
| `timeout` | 超时时间（秒）|

## 第三步：上传到 GitHub

```bash
# 创建仓库
mkdir rwmm-vip-scripts && cd rwmm-vip-scripts && git init

# 添加文件
git add .
git commit -m "Add scripts"

# 推送到 GitHub
gh repo create rwmm-vip-scripts --public --source=. --push
```

## 第四步：生成订阅链接

### 格式
```
https://raw.githubusercontent.com/用户名/仓库名/分支名/插件文件名.plugin
```

### 示例
```
https://raw.githubusercontent.com/zhaohantao1360-hash/rwmm-vip-scripts/main/rwmm.plugin
```

## 关键技巧

### 1. 找到要拦截的 URL
- Loon → 工具 → 抓包
- 打开 App 操作
- 找到会员接口

### 2. 正则写法
```
原始 URL：https://www.pdreamer.com/api/getUserInfo
正则：^https?://www\.pdreamer\.com.*?getUserInfo
```

### 3. GitHub raw 链接
必须用 raw 链接，格式：
```
https://raw.githubusercontent.com/用户名/仓库名/分支名/文件名
```

## Loon 使用方法
1. Loon → 配置 → 插件
2. 点右上角 "➕"
3. 粘贴订阅链接
4. 安装 → 启用 → 重启 App

## 时间
2026-06-24 22:15 GMT+8
