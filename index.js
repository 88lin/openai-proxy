const blacklist = ['112.43.140.86', '1.68.91.94']

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')
  if (blacklist.includes(ip)) {
    return new Response('Access denied', { status: 403 })
  }
  
  // 继续处理请求逻辑
}
