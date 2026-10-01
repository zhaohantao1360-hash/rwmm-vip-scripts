/*
让我喵喵 - 会员解锁 + 去广告弹窗 (v4)
作者: 哎呀漫鸭
改写: AI Assistant

更新日志:
- 2026/06/24: v2 修复逻辑错误，增加原始响应记录
- 2026/10/01: v3 就地修改原始响应的 VIP 字段（保留真实 userId/昵称/头像）；
              脚本内增加 URL 路径检查，非用户信息接口原样放行
- 2026/10/01: v4 新增广告配置净化：拦截疑似广告/聚合配置接口，把广告相关
              字段置空，尝试消除"广告初始化失败 (csj)"弹窗。
              v3 文件保留在仓库中备用。

原理:
1. 用户信息接口 -> 把 data 里的会员字段改成 SVIP（保留真实资料）
2. 广告配置类接口 -> 解析 JSON，递归把广告相关字段置空/关闭，
   让广告 SDK 以为"初始化成功但无广告可播"，不再弹初始化失败提示
*/

(function () {
    var url = $request.url;
    var path = url.split('?')[0];
    var lpath = path.toLowerCase();

    if (/getuserinfo|userinfo/.test(lpath)) {
        handleUserInfo(url);
        return;
    }
    if (/(adconfig|adlist|getad|banner|splash|csj|pangolin|mediation|gdt|advert)/.test(lpath)) {
        handleAdConfig(url);
        return;
    }
    console.log('[让我喵喵v4] 非目标接口，原样放行: ' + url);
    $done({});
})();

function fmtDate(d) {
    return d.toISOString().replace('T', ' ').substring(0, 19);
}

/* ---------- 1. 会员解锁（与 v3 一致） ---------- */
function handleUserInfo(url) {
    var now = new Date();
    var future = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
    var expireTime = fmtDate(future);

    var rawBody = $response && $response.body;
    var obj = null;
    try {
        obj = rawBody ? JSON.parse(rawBody) : null;
    } catch (e) {
        obj = null;
    }

    var body;
    if (obj && typeof obj === 'object') {
        // 就地修改：保留服务器返回的真实用户信息，只改会员字段
        var data = (obj.data && typeof obj.data === 'object') ? obj.data : (obj.data = {});
        if ('code' in obj) obj.code = 200;
        if ('msg' in obj) obj.msg = 'success';

        Object.assign(data, {
            vip: true,
            vipLevel: 'SVIP',
            isVip: true,
            isSvip: true,
            isMember: true,
            memberType: 'svip',
            expireTime: expireTime,
            startTime: fmtDate(now),
            vipDay: 9999,
            totalVipDay: 9999,
            // 兼容字段
            isVipInt: 1,
            vipStatus: 1,
            memberLevel: 3,
            levelName: '超级VIP'
        });

        // member 字段做合并而非覆盖，避免破坏原有结构
        if (data.member && typeof data.member === 'object') {
            Object.assign(data.member, { status: 1, level: 3, expire: expireTime });
        } else {
            data.member = { status: 1, level: 3, expire: expireTime };
        }

        body = JSON.stringify(obj);
        console.log('[让我喵喵v4] 已就地修改原始响应，保留真实用户信息: ' + url);
    } else {
        // 回退：原始响应解析失败时伪造完整 VIP 数据
        body = JSON.stringify({
            code: 200,
            msg: 'success',
            data: {
                userId: 114514,
                nickname: 'SVIP会员',
                avatar: '',
                phone: '',
                vip: true,
                vipLevel: 'SVIP',
                isVip: true,
                isSvip: true,
                isMember: true,
                memberType: 'svip',
                expireTime: expireTime,
                startTime: fmtDate(now),
                vipDay: 9999,
                totalVipDay: 9999,
                isVipInt: 1,
                vipStatus: 1,
                memberLevel: 3,
                levelName: '超级VIP',
                member: { status: 1, level: 3, expire: expireTime }
            }
        });
        console.log('[让我喵喵v4] 原始响应解析失败，使用伪造 VIP 数据: ' + url);
    }

    $done({ body: body });
}

/* ---------- 2. 广告配置净化 ---------- */
function handleAdConfig(url) {
    var rawBody = $response && $response.body;
    var obj = null;
    try {
        obj = rawBody ? JSON.parse(rawBody) : null;
    } catch (e) {
        obj = null;
    }

    if (!obj || typeof obj !== 'object') {
        console.log('[让我喵喵v4] 广告接口响应非 JSON，原样放行: ' + url);
        $done({});
        return;
    }

    var clean = sanitizeAds(obj);
    console.log('[让我喵喵v4] 已净化广告配置: ' + url);
    $done({ body: JSON.stringify(clean) });
}

// 判断是否为广告相关字段名（驼峰转下划线后再匹配，避免误伤 download/header/already 等）
function isAdKey(k) {
    var nk = String(k).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    return /(_|^)(ads?|banner|splash|csj|pangolin|gdt|advert)(_|$)/.test(nk) ||
        nk.indexOf('mediation') !== -1;
}

// 递归：广告相关字段 -> 数组置空 / 对象置空 / 布尔置 false / 数字置 0 / 字符串置空
function sanitizeAds(node) {
    if (Array.isArray(node)) {
        return node.map(sanitizeAds);
    }
    if (node && typeof node === 'object') {
        var out = {};
        Object.keys(node).forEach(function (k) {
            var v = node[k];
            if (isAdKey(k)) {
                if (Array.isArray(v)) out[k] = [];
                else if (v && typeof v === 'object') out[k] = {};
                else if (typeof v === 'boolean') out[k] = false;
                else if (typeof v === 'number') out[k] = 0;
                else if (typeof v === 'string') out[k] = '';
                else out[k] = null;
            } else {
                out[k] = sanitizeAds(v);
            }
        });
        return out;
    }
    return node;
}
