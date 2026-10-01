/*
让我喵喵 - 会员解锁 + 去广告弹窗 (v5)
作者: 哎呀漫鸭
改写: AI Assistant

更新日志:
- 2026/06/24: v2 修复逻辑错误，增加原始响应记录
- 2026/10/01: v3 就地修改原始响应的 VIP 字段（保留真实 userId/昵称/头像）
- 2026/10/01: v4 新增广告配置净化
- 2026/10/01: v5 规则放宽到整个 www.pdreamer.com（脚本内部分流），
- 2026/10/01: v6 诊断版：每次处理后用系统通知上报 URL 路径与处理动作（便于定位广告接口），逻辑与 v5 一致。
- 2026/10/01: v7 静默版：逻辑与 v6 完全一致，仅去掉系统通知。
              记录所有经过的 URL 以便定位真实广告接口；
              广告接口返回失败状态时改写成空成功响应；
              广告关键词扩充（union/agg 等"聚合"相关）。
              v3/v4 文件保留在仓库中备用。

原理:
1. 用户信息接口 -> 把 data 里的会员字段改成 SVIP（保留真实资料）
2. 疑似广告/聚合配置接口 -> 失败状态改写成空成功 + 广告字段置空，
   让广告 SDK 以为"初始化成功但无广告可播"
*/

(function () {
    var url = $request.url;
    var path = url.split('?')[0];
    var lpath = path.toLowerCase();

    console.log('[让我喵喵v7] 经过: ' + path);

    // 注意：通知必须在 $done() 之前发送，否则不会执行
    var isUser = /getuserinfo|userinfo/.test(lpath);
    var isAd = /(adconfig|ad_config|adunion|ad_union|getad|adlist|banner|splash|csj|pangolin|mediation|union|agg|gdt|advert)/.test(lpath);
    var action = isUser ? '会员解锁' : (isAd ? adSummary() : '原样放行');
    console.log('[让我喵喵v7] ' + action + ': ' + path);

    if (isUser) { handleUserInfo(url); return; }
    if (isAd) { handleAdConfig(url); return; }
    $done({});
})();

function fmtDate(d) {
    return d.toISOString().replace('T', ' ').substring(0, 19);
}

/* ---------- 1. 会员解锁（与 v3/v4 一致） ---------- */
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
            isVipInt: 1,
            vipStatus: 1,
            memberLevel: 3,
            levelName: '超级VIP'
        });

        if (data.member && typeof data.member === 'object') {
            Object.assign(data.member, { status: 1, level: 3, expire: expireTime });
        } else {
            data.member = { status: 1, level: 3, expire: expireTime };
        }

        body = JSON.stringify(obj);
        console.log('[让我喵喵v7] 已修改会员信息: ' + url);
    } else {
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
        console.log('[让我喵喵v7] 原始响应解析失败，使用伪造 VIP 数据: ' + url);
    }

    $done({ body: body });
}

/* ---------- 2. 广告/聚合配置处理 ---------- */
function handleAdConfig(url) {
    var rawBody = $response && $response.body;
    var obj = null;
    try {
        obj = rawBody ? JSON.parse(rawBody) : null;
    } catch (e) {
        obj = null;
    }

    if (!obj || typeof obj !== 'object') {
        console.log('[让我喵喵v7] 疑似广告接口但响应非 JSON，原样放行: ' + url);
        $done({});
        return;
    }

    // 状态字段若表示失败 -> 改写成空成功响应
    var failed = false;
    if (typeof obj.code === 'number' && obj.code !== 200) { obj.code = 200; failed = true; }
    if (typeof obj.retcode === 'number' && obj.retcode !== 0) { obj.retcode = 0; failed = true; }
    if (typeof obj.errcode === 'number' && obj.errcode !== 0) { obj.errcode = 0; failed = true; }
    if (typeof obj.status === 'string' && !/success|ok/i.test(obj.status)) { obj.status = 'success'; failed = true; }
    if (typeof obj.msg === 'string' && /fail|error|失败|错误/i.test(obj.msg)) { obj.msg = 'success'; failed = true; }
    if (failed) {
        if ('data' in obj) obj.data = {};
        if ('result' in obj) obj.result = {};
        console.log('[让我喵喵v7] 广告接口返回失败状态，已改写成空成功: ' + url);
    }

    var clean = sanitizeAds(obj);
    console.log('[让我喵喵v7] 已净化广告配置: ' + url);
    $done({ body: JSON.stringify(clean) });
}

// 预读广告接口响应生成摘要（只读，不调用 $done）
function adSummary() {
    try {
        var raw = $response && $response.body;
        var obj = raw ? JSON.parse(raw) : null;
        if (!obj || typeof obj !== 'object') return '疑似广告接口/非JSON';
        var code = ('code' in obj) ? ('code=' + obj.code) : '';
        return '广告配置处理 ' + code + ' keys:' + Object.keys(obj).slice(0, 8).join(',');
    } catch (e) {
        return '疑似广告接口/解析失败';
    }
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
