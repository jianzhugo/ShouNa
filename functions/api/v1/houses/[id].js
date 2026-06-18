import { getAuthUser, isFamilyMember, jsonResponse, errorResponse } from '../utils';

export async function onRequestGet(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const houseId = params.id;

    const house = await env.DB.prepare(
      'SELECT id, name, family_id FROM houses WHERE id = ? AND deleted_at IS NULL'
    ).bind(houseId).first();

    if (!house) {
      return errorResponse('NOT_FOUND', '房屋不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, house.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该房屋', 403);
    }

    return jsonResponse({ data: house });

  } catch (err) {
    console.error('Get house error:', err);
    return errorResponse('SERVER_ERROR', '获取房屋信息失败', 500);
  }
}
