import { getAuthUser, isFamilyAdmin, generateInviteCode, jsonResponse, errorResponse, logActivity } from '../../utils';

export async function onRequestPost(context) {
  const { request, env, params } = context;
  const familyId = params.id;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '未登录或登录已过期', 401);
    }

    const isAdmin = await isFamilyAdmin(env.DB, user.id, familyId);
    if (!isAdmin) {
      return errorResponse('FORBIDDEN', '仅管理员可以重置邀请码', 403);
    }

    const newInviteCode = generateInviteCode();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await env.DB.prepare(
      'UPDATE families SET invite_code = ?, invite_code_expires_at = ?, invite_code_used_count = 0 WHERE id = ?'
    ).bind(newInviteCode, newExpiresAt, familyId).run();

    await logActivity(env.DB, familyId, user.id, 'reset_invite', 'family', familyId, null);

    return jsonResponse({
      data: {
        invite_code: newInviteCode,
        invite_code_expires_at: newExpiresAt,
      },
      message: '邀请码已重置',
    });
  } catch (err) {
    console.error('Reset invite error:', err);
    return errorResponse('SERVER_ERROR', '重置邀请码失败', 500);
  }
}
