import { getAuthUser, isFamilyMember, jsonResponse, errorResponse } from '../utils';

export async function onRequestGet(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const storageId = params.id;

    const storage = await env.DB.prepare(
      `SELECT s.id, s.name, s.room_id, r.house_id, h.family_id,
              r.name as room_name, h.name as house_name
       FROM storage_spots s
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       WHERE s.id = ? AND s.deleted_at IS NULL`
    ).bind(storageId).first();

    if (!storage) {
      return errorResponse('NOT_FOUND', '收纳位不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, storage.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该收纳位', 403);
    }

    return jsonResponse({ data: storage });

  } catch (err) {
    console.error('Get storage error:', err);
    return errorResponse('SERVER_ERROR', '获取收纳位信息失败', 500);
  }
}
