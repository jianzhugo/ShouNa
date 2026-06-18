import { getAuthUser, isFamilyMember, jsonResponse, errorResponse } from '../../utils';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const familyId = params.id;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '未登录或登录已过期', 401);
    }

    const membership = await isFamilyMember(env.DB, user.id, familyId);
    if (!membership) {
      return errorResponse('FORBIDDEN', '您不是该家庭组成员', 403);
    }

    const members = await env.DB.prepare(
      `SELECT fm.user_id, fm.role, fm.joined_at, u.name, u.email, u.avatar
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id
       WHERE fm.family_id = ? AND u.deleted_at IS NULL
       ORDER BY fm.joined_at ASC`
    ).bind(familyId).all();

    return jsonResponse({ data: members.results });
  } catch (err) {
    console.error('List members error:', err);
    return errorResponse('SERVER_ERROR', '获取成员列表失败', 500);
  }
}
