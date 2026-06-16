import { getAuthUser, verifyPassword, hashPassword, jsonResponse, errorResponse } from '../../utils';

export async function onRequestPut(context) {
  const { request, env } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  try {
    const body = await request.json();
    const { old_password, new_password } = body;

    if (!old_password || !new_password) {
      return errorResponse('MISSING_FIELDS', '旧密码和新密码为必填项');
    }

    // Get current password hash
    const userRecord = await env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(user.id).first();

    if (!userRecord) return errorResponse('NOT_FOUND', '用户不存在', 404);

    // Verify old password
    const valid = await verifyPassword(old_password, userRecord.password_hash);
    if (!valid) return errorResponse('INVALID_PASSWORD', '旧密码错误');

    // Validate new password: 8+ chars, letters + numbers
    if (new_password.length < 8) {
      return errorResponse('INVALID_PASSWORD', '新密码长度至少8位');
    }
    if (!/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
      return errorResponse('INVALID_PASSWORD', '新密码必须包含字母和数字');
    }

    // Hash and update
    const newHash = await hashPassword(new_password);
    await env.DB.prepare(
      'UPDATE users SET password_hash = ? WHERE id = ?'
    ).bind(newHash, user.id).run();

    return jsonResponse({ data: { message: '密码修改成功' } });
  } catch (err) {
    console.error('Change password error:', err);
    return errorResponse('SERVER_ERROR', '修改密码失败', 500);
  }
}
