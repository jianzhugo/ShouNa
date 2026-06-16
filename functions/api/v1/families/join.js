import { getAuthUser, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '未登录或登录已过期', 401);
    }

    const body = await request.json();
    const { invite_code } = body;

    if (!invite_code) {
      return errorResponse('MISSING_FIELDS', '邀请码为必填项');
    }

    const family = await env.DB.prepare(
      'SELECT id, name, invite_code, invite_code_expires_at, invite_code_max_uses, invite_code_used_count FROM families WHERE invite_code = ? AND deleted_at IS NULL'
    ).bind(invite_code.toUpperCase()).first();

    if (!family) {
      return errorResponse('INVALID_INVITE_CODE', '邀请码无效');
    }

    if (family.invite_code_expires_at && new Date(family.invite_code_expires_at) < new Date()) {
      return errorResponse('INVITE_CODE_EXPIRED', '邀请码已过期');
    }

    if (family.invite_code_used_count >= family.invite_code_max_uses) {
      return errorResponse('INVITE_CODE_EXHAUSTED', '邀请码已达到最大使用次数');
    }

    const existingMember = await env.DB.prepare(
      'SELECT id FROM family_members WHERE user_id = ? AND family_id = ?'
    ).bind(user.id, family.id).first();

    if (existingMember) {
      return errorResponse('ALREADY_MEMBER', '您已是该家庭组成员');
    }

    await env.DB.prepare(
      'INSERT INTO family_members (user_id, family_id, role) VALUES (?, ?, ?)'
    ).bind(user.id, family.id, 'member').run();

    await env.DB.prepare(
      'UPDATE families SET invite_code_used_count = invite_code_used_count + 1 WHERE id = ?'
    ).bind(family.id).run();

    await logActivity(env.DB, family.id, user.id, 'join', 'family', family.id, family.name);

    return jsonResponse({
      data: {
        id: family.id,
        name: family.name,
        role: 'member',
      },
      message: '成功加入家庭组',
    });
  } catch (err) {
    console.error('Join family error:', err);
    return errorResponse('SERVER_ERROR', '加入家庭组失败', 500);
  }
}
