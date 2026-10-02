/*
  PingMe 获取签到参数（Egern 版）
  与 mickeu/Egern 原版 pingme_capture.js 完全一致，仅更换存档地址
  原作者：fmz200 -> mickeu -> Egern
  拦截 PingMe 余额查询请求，自动捕获 URL 参数与请求头，
  以 {url, paramsRaw, headers} 格式存入 pingme_capture_v3，供签到脚本使用
*/

const ckKey = 'pingme_capture_v3';

export default async function(ctx) {
    const cap = ctx.env && ctx.env.PINGME_CAPTURE;
    if (cap === 'false') {
        console.log('⏸ PingMe 已关闭，跳过抓参');
        return;
    }

    const url = ctx.request.url;
    const headers = ctx.request.headers || {};
    console.log('PingMe 开始抓参: ' + url);

    if (url.includes('/app/queryBalanceAndBonus')) {
        console.log('PingMe 开始');
        const capture = {
            url: url,
            paramsRaw: parseRawQuery(url),
            headers: normalizeHeaderNameMap(headers)
        };
        ctx.storage.set(ckKey, JSON.stringify(capture));
        ctx.notify({ title: '✅ PingMe 获取成功', body: '现在可以关闭抓参了', sound: true });
        console.log('PingMe 获取到的内容为：' + url);
    }
}

function parseRawQuery(url) {
    const idx = url.indexOf('?');
    if (idx === -1) return {};
    const qs = url.substring(idx + 1);
    const params = {};
    qs.split('&').forEach(pair => {
        const [k, v] = pair.split('=').map(s => decodeURIComponent(s || ''));
        if (k) params[k] = v;
    });
    return params;
}

function normalizeHeaderNameMap(headers) {
    const normalized = {};
    Object.keys(headers || {}).forEach(k => {
        normalized[k.toLowerCase()] = headers[k];
    });
    return normalized;
}
