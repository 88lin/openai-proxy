const blacklist = ["112.43.140.86", "1.68.91.94"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With",
};

const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === "string" ? k === key : k.test(key)))) {
        // 获取客户端IP地址
        const ip = headers.get("cf-connecting-ip") || headers.get("x-forwarded-for") || headers.get("remote-addr");
        // 检查IP地址是否在黑名单中
        if (ip && blacklist.includes(ip)) {
            return new Response(null, { status: 403 });
        }
        const value = headers.get(key);
        if (typeof value === "string") {
          picked.set(key, value);
        }
      }
    }
    return picked;
};

export default async function handleRequest(req: Request & { nextUrl?: URL }) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: CORS_HEADERS,
    });
  }

  const { pathname, search } = req.nextUrl ? req.nextUrl : new URL(req.url);
  const url = new URL(pathname + search, "https://api.openai.com").href;

  const headers = pickHeaders(req.headers, ["content-type", "authorization"]);

  if (headers.status === 403) {
      return headers;
  }

  const res = await fetch(url, {
    body: req.body,
    method: req.method,
    headers,
  });

  const resHeaders = {
    ...CORS_HEADERS,
    ...Object.fromEntries(
      pickHeaders(res.headers, ["content-type", /^x-ratelimit-/, /^openai-/])
    ),
  };

  return new Response(res.body, {
    headers: resHeaders,
    status: res.status
  });
}
