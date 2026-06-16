import { getAuthUser, jsonResponse, errorResponse } from '../utils';

export async function onRequestGet(context) {
  const { request, env } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  try {
    const userInfo = await env.DB.prepare(
      'SELECT id, email, name FROM users WHERE id = ?'
    ).bind(user.id).first();

    if (!userInfo) return errorResponse('NOT_FOUND', '用户不存在', 404);

    return jsonResponse({ data: userInfo });
  } catch (err) {
    console.error('Get user error:', err);
    return errorResponse('SERVER_ERROR', '获取用户信息失败', 500);
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  try {
    const body = await request.json();
    const { name } = body;

    if (!name) return errorResponse('MISSING_FIELDS', '用户名为必填项');

    await env.DB.prepare(
      'UPDATE users SET name = ? WHERE id = ?'
    ).bind(name, user.id).run();

    return jsonResponse({ data: { id: user.id, name } });
  } catch (err) {
    console.error('Update user error:', err);
    return errorResponse('SERVER_ERROR', '更新用户信息失败', 500);
  }
}
