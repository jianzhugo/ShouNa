import { clearAuthCookies, jsonResponse } from '../utils';

export async function onRequestPost(context) {
  const isLocal = context.request.url.includes('localhost') || context.request.url.includes('127.0.0.1');
  const cookies = clearAuthCookies(isLocal);
  const responseHeaders = new Headers();
  responseHeaders.set('Content-Type', 'application/json');
  cookies.forEach(c => responseHeaders.append('Set-Cookie', c));
  return new Response(JSON.stringify({ message: '已退出登录' }), {
    status: 200,
    headers: responseHeaders
  });
}
