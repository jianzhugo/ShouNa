import { getAuthUser, isFamilyAdmin, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const familyId = params.id;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '未登录或登录已过期', 401);
    }

    const isAdmin = await isFamilyAdmin(env.DB, user.id, familyId);
    if (!isAdmin) {
      return errorResponse('FORBIDDEN', '仅管理员可以删除家庭组', 403);
    }

    const now = new Date().toISOString();
    await env.DB.prepare(
      'UPDATE families SET deleted_at = ? WHERE id = ?'
    ).bind(now, familyId).run();

    await logActivity(env.DB, familyId, user.id, 'delete', 'family', familyId, null);

    return jsonResponse({ message: '家庭组已删除' });
  } catch (err) {
    console.error('Delete family error:', err);
    return errorResponse('SERVER_ERROR', '删除家庭组失败', 500);
  }
}
