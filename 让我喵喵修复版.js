/*
让我喵喵 - 会员解锁脚本 (修复版 v2)
作者: 哎呀漫鸭
修复: AI Assistant

更新日志:
- 2026/06/24: v2 修复逻辑错误，增加原始响应记录
*/

const platform = typeof $request !== 'undefined' ? 'Surge/Loon' : 'Node.js';

// 获取当前时间，设置为永久会员
const now = new Date();
const futureDate = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
const expireTime = futureDate.toISOString().replace('T', ' ').substring(0, 19);

// VIP响应数据
const vipResponse = {
    code: 200,
    msg: "success",
    data: {
        userId: 114514,
        nickname: "SVIP会员",
        avatar: "",
        phone: "",
        vip: true,
        vipLevel: "SVIP",
        isVip: true,
        isSvip: true,
        isMember: true,
        memberType: "svip",
        expireTime: expireTime,
        startTime: now.toISOString().replace('T', ' ').substring(0, 19),
        vipDay: 9999,
        totalVipDay: 9999,
        createTime: now.toISOString().replace('T', ' ').substring(0, 19),
        // 兼容字段
        isVipInt: 1,
        vipStatus: 1,
        memberLevel: 3,
        levelName: "超级VIP"
    }
};

// 主逻辑
(function() {
    const url = $request.url;
    const path = url.split('?')[0];
    
    console.log("[让我喵喵v2] ========== 开始处理 ==========");
    console.log("[让我喵喵v2] URL: " + url);
    console.log("[让我喵喵v2] Path: " + path);
    
    // 记录原始响应（用于调试）
    if ($response) {
        try {
            const originalBody = $response.body;
            console.log("[让我喵喵v2] 原始响应长度: " + (originalBody ? originalBody.length : 0));
            console.log("[让我喵喵v2] 原始响应内容: " + originalBody);
            
            // 尝试解析原始JSON
            const original = JSON.parse(originalBody);
            console.log("[让我喵喵v2] 原始code: " + original.code);
            console.log("[让我喵喵v2] 原始data keys: " + (original.data ? Object.keys(original.data).join(', ') : '无'));
        } catch(e) {
            console.log("[让我喵喵v2] 解析原始响应失败: " + e.message);
        }
    } else {
        console.log("[让我喵喵v2] $response 不存在");
    }
    
    // 返回伪造的VIP数据
    const body = JSON.stringify(vipResponse);
    console.log("[让我喵喵v2] 返回VIP数据: " + body);
    console.log("[让我喵喵v2] ========== 处理完成 ==========");
    
    $done({ body: body });
})();
