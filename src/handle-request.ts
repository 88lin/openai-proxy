import { Request, Response } from 'express';

const blockedIps = process.env.BLOCKED_IPS?.split(',') || [];

function isIpBlocked(ip: string): boolean {
  return blockedIps.includes(ip);
}

const pickHeaders = (headers: Headers, keys: (string | RegExp)[]): Headers => {
  const picked = new Headers();
  for (const key of headers.keys()) {
    if (keys.some((k) => (typeof k === "string" ? k === key : k.test(key)))) {
      const value = headers.get(key);
      if (typeof value === "string") {
        picked.set(key, value);
      }
    }
  }
  return picked;
};

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization",
};

export default async function handleRequest(req: Request & { nextUrl?: URL }, res: Response) {
  const ip = req.headers['x-forwarded-for'] as string;

  if (isIpBlocked(ip)) {
    res.status(403).send('Access denied');
    return;
  }

  if (req.method === "OPTIONS") {
    res.set(CORS_HEADERS);
    res.send(null);
    return;
  }

  const { pathname, search } = req.nextUrl ? req.nextUrl : new URL(req.url);
  const url = new URL(pathname + search, "https://api.openai.com").href;
  const headers = pickHeaders(req.headers, ["content-type", "authorization"]);

  const response = await fetch(url, {
    body: req.body,
    method: req.method,
    headers,
  });

  const responseHeaders = {
    ...CORS_HEADERS,
    ...Object.fromEntries(
      pickHeaders(response.headers, ["content-type", /^x-ratelimit-/, /^openai-/])
    ),
  };

  res.set(responseHeaders);
  res.status(response.status).send(await response.text());
}
