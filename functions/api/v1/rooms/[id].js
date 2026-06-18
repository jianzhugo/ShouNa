import { getAuthUser, isFamilyMember, jsonResponse, errorResponse } from '../utils';

export async function onRequestGet(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const roomId = params.id;

    const room = await env.DB.prepare(
      'SELECT r.id, r.name, r.house_id, h.family_id FROM rooms r JOIN houses h ON r.house_id = h.id WHERE r.id = ? AND r.deleted_at IS NULL'
    ).bind(roomId).first();

    if (!room) {
      return errorResponse('NOT_FOUND', '房间不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, room.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该房间', 403);
    }

    return jsonResponse({ data: room });

  } catch (err) {
    console.error('Get room error:', err);
    return errorResponse('SERVER_ERROR', '获取房间信息失败', 500);
  }
}
