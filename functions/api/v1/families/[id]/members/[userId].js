import { getAuthUser, isFamilyAdmin, jsonResponse, errorResponse, logActivity } from '../../../utils';

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const familyId = params.id;
  const targetUserId = params.userId;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '未登录或登录已过期', 401);
    }

    if (String(user.id) === String(targetUserId)) {
      return errorResponse('BAD_REQUEST', '不能移除自己，如需退出请联系管理员或删除家庭组');
    }

    const isAdmin = await isFamilyAdmin(env.DB, user.id, familyId);
    if (!isAdmin) {
      return errorResponse('FORBIDDEN', '仅管理员可以移除成员', 403);
    }

    const member = await env.DB.prepare(
      'SELECT user_id, role FROM family_members WHERE user_id = ? AND family_id = ?'
    ).bind(targetUserId, familyId).first();

    if (!member) {
      return errorResponse('NOT_FOUND', '该成员不存在', 404);
    }

    await env.DB.prepare(
      'DELETE FROM family_members WHERE user_id = ? AND family_id = ?'
    ).bind(targetUserId, familyId).run();

    await logActivity(env.DB, familyId, user.id, 'remove_member', 'family', familyId, null, { removed_user_id: targetUserId });

    return jsonResponse({ message: '成员已移除' });
  } catch (err) {
    console.error('Remove member error:', err);
    return errorResponse('SERVER_ERROR', '移除成员失败', 500);
  }
}
