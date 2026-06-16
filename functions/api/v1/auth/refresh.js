import { verifyJWT, signJWT, setAuthCookies, errorResponse } from '../utils';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => { const [k, ...v] = c.split('='); return [k, v.join('=')]; })
    );

    const refreshToken = cookies['refresh_token'];
    if (!refreshToken) {
      return errorResponse('NO_REFRESH_TOKEN', '未提供刷新令牌', 401);
    }

    const payload = await verifyJWT(refreshToken, env.JWT_REFRESH_SECRET);
    if (!payload || payload.type !== 'refresh') {
      return errorResponse('INVALID_REFRESH_TOKEN', '刷新令牌无效', 401);
    }

    // Issue new tokens
    const newToken = await signJWT({ userId: payload.userId, email: payload.email, name: payload.name }, env.JWT_SECRET, 15);
    const newRefreshToken = await signJWT({ userId: payload.userId, email: payload.email, name: payload.name, type: 'refresh' }, env.JWT_REFRESH_SECRET, 7 * 24 * 60);

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    const cookies2 = setAuthCookies(newToken, newRefreshToken, isLocal);

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    cookies2.forEach(c => responseHeaders.append('Set-Cookie', c));
    return new Response(JSON.stringify({ data: { id: payload.userId, email: payload.email, name: payload.name } }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (err) {
    console.error('Refresh error:', err);
    return errorResponse('SERVER_ERROR', '令牌刷新失败', 500);
  }
}
