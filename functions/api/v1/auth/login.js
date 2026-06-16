import { verifyPassword, signJWT, setAuthCookies, jsonResponse, errorResponse, checkRateLimit, ensureSchema } from '../utils';

export async function onRequestPost(context) {
  const { request, env } = context;

  // Ensure database schema exists
  await ensureSchema(env.DB);

  // Rate limiting
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(ip)) {
    return errorResponse('RATE_LIMITED', '请求过于频繁，请稍后再试', 429);
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('MISSING_FIELDS', '邮箱和密码为必填项');
    }

    // Find user
    const user = await env.DB.prepare(
      'SELECT id, email, password_hash, name FROM users WHERE email = ? AND deleted_at IS NULL'
    ).bind(email).first();

    if (!user) {
      return errorResponse('INVALID_CREDENTIALS', '邮箱或密码错误');
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return errorResponse('INVALID_CREDENTIALS', '邮箱或密码错误');
    }

    // Sign JWT tokens
    const token = await signJWT({ userId: user.id, email: user.email, name: user.name }, env.JWT_SECRET, 15);
    const refreshToken = await signJWT({ userId: user.id, email: user.email, name: user.name, type: 'refresh' }, env.JWT_REFRESH_SECRET, 7 * 24 * 60);

    // Get user's families
    const families = await env.DB.prepare(
      'SELECT fm.family_id, fm.role, f.name as family_name FROM family_members fm JOIN families f ON fm.family_id = f.id WHERE fm.user_id = ? AND f.deleted_at IS NULL'
    ).bind(user.id).all();

    const familyList = families && families.results ? families.results : [];

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    const cookies = setAuthCookies(token, refreshToken, isLocal);

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    cookies.forEach(c => responseHeaders.append('Set-Cookie', c));
    return new Response(JSON.stringify({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        families: familyList
      }
    }), {
      status: 200,
      headers: responseHeaders
    });

  } catch (err) {
    console.error('Login error:', err);
    return errorResponse('SERVER_ERROR', '登录失败，请稍后再试', 500);
  }
}
