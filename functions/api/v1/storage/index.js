import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const url = new URL(request.url);
    const roomId = url.searchParams.get('room');
    if (!roomId) {
      return errorResponse('MISSING_PARAMS', '缺少 room 参数');
    }

    const room = await env.DB.prepare(
      'SELECT r.id, h.family_id FROM rooms r JOIN houses h ON r.house_id = h.id WHERE r.id = ? AND r.deleted_at IS NULL'
    ).bind(roomId).first();

    if (!room) {
      return errorResponse('NOT_FOUND', '房间不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, room.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该房间', 403);
    }

    const storageSpots = await env.DB.prepare(
      `SELECT s.id, s.name, s.created_at,
        (SELECT COUNT(*) FROM items i WHERE i.storage_spot_id = s.id AND i.deleted_at IS NULL) as item_count
       FROM storage_spots s
       WHERE s.room_id = ? AND s.deleted_at IS NULL
       ORDER BY s.created_at DESC`
    ).bind(roomId).all();

    return jsonResponse({ data: storageSpots.results });

  } catch (err) {
    console.error('Get storage spots error:', err);
    return errorResponse('SERVER_ERROR', '获取收纳位列表失败', 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const body = await request.json();
    const { room_id, name } = body;

    if (!room_id || !name) {
      return errorResponse('MISSING_FIELDS', 'room_id 和 name 为必填项');
    }

    const room = await env.DB.prepare(
      'SELECT r.id, h.family_id FROM rooms r JOIN houses h ON r.house_id = h.id WHERE r.id = ? AND r.deleted_at IS NULL'
    ).bind(room_id).first();

    if (!room) {
      return errorResponse('NOT_FOUND', '房间不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, room.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该房间', 403);
    }

    const result = await env.DB.prepare(
      'INSERT INTO storage_spots (room_id, name) VALUES (?, ?) RETURNING id, name, created_at'
    ).bind(room_id, name.trim()).first();

    await logActivity(env.DB, room.family_id, user.id, 'create', 'storage_spot', result.id, result.name);

    return jsonResponse({ data: result }, 201);

  } catch (err) {
    console.error('Create storage spot error:', err);
    return errorResponse('SERVER_ERROR', '创建收纳位失败', 500);
  }
}
