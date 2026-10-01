/*
  PingMe 获取签到参数（Loon 移植版）
  原版逻辑：fmz200 -> mickeu -> Egern
  Loon 移植：由 Egern v2 版（export default + ctx API）改写为 Loon 经典脚本 API
            $request / $persistentStore / $notification / $done
  配套插件：PingMeSignin.lpx（http-request 触发，开关由插件参数「抓参开关」控制）
  触发：拦截 PingMe 的余额查询请求，自动捕获 URL 参数与请求头，存入持久化存储
  存储 key：pingme_capture_v3（与 PingMeSignin_loon.js 共用）
*/

const ckKey = 'pingme_capture_v3';

const url = $request.url;
const headers = $request.headers || {};
console.log('PingMe 开始抓参: ' + url);

if (url.indexOf('/app/queryBalanceAndBonus') !== -1) {
  const capture = {
    url: url,
    paramsRaw: parseRawQuery(url),
    headers: normalizeHeaderNameMap(headers),
  };
  $persistentStore.write(JSON.stringify(capture), ckKey);
  $notification.post('✅ PingMe 参数获取成功', '', '签到参数已保存，可在插件参数里关闭「抓参开关」了');
  console.log('PingMe 抓参成功，内容为：' + url);
}

$done({});

function parseRawQuery(url) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const qs = url.substring(idx + 1);
  const params = {};
  qs.split('&').forEach((pair) => {
    const kv = pair.split('=').map((s) => decodeURIComponent(s || ''));
    const k = kv[0], v = kv[1];
    if (k) params[k] = v;
  });
  return params;
}

function normalizeHeaderNameMap(headers) {
  const normalized = {};
  Object.keys(headers || {}).forEach((k) => {
    normalized[k.toLowerCase()] = headers[k];
  });
  return normalized;
}
