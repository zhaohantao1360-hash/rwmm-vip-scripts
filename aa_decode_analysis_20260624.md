# AA 混淆脚本解混淆分析

## 原始文件
`https://raw.githubusercontent.com/Yu9191/Rewrite/main/rwmm.js`

## 问题
1. Surge 格式配置混在 JS 文件中
2. JavaScript 代码被 AA Encode（颜文字加密）

## AA Encode 解混淆结果

解混淆后的代码：
```javascript
let obj = JSON.parse($response.body);
// ... 处理逻辑 ...
$done({
    body: JSON.stringify({
        data: {
            purchasedVIPExpiresAt: "2099-09-09",
            vipexpiresAt: "2099-09-09",
            temporarySustainDay: "",
            appAccountToken: "",
            inviteNum: 99,
            token: "",
            purchasedVIP: "2099-09-09",
            inviteCode: "",
            vipStatus: 1
        }
    })
});
```

## 文件对比

| 文件 | 格式问题 | 推荐度 |
|------|---------|--------|
| `rwmm_subscription.js` + `rwmm.plugin` | ✅ 格式正确 | ⭐⭐⭐⭐⭐ 推荐 |
| `rwmm_fixed.plugin` | ❌ 配置和代码混合 | ❌ 不推荐 |
| `rwmm.js`（AA混淆版） | ❌ 混淆 + Surge格式 | ❌ 不推荐 |

## AA Encode 是什么

AA Encode（颜文字加密）是一种 JavaScript 混淆技术，将代码转换为日文颜文字形式：
- 混淆前：`console.log("hello")`
- 混淆后：`ﾟωﾟﾉ= /｀ｍ´）ﾉ ~┻━┻ ...`

**目的：**
1. 隐藏代码逻辑
2. 防止他人修改
3. 增加逆向难度

**缺点：**
1. 代码不可读
2. 维护困难
3. 有安全隐患（无法验证代码做什么）

## 推荐方案

**使用订阅版脚本：**
```
https://raw.githubusercontent.com/zhaohantao1360-hash/rwmm-vip-scripts/main/rwmm.plugin
```

**优点：**
- 代码清晰可读
- 格式规范
- 订阅模式更真实

## 时间
2026-06-24 22:20 GMT+8

## 状态
✅ 已解混淆并分析完成
