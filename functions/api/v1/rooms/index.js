import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const url = new URL(request.url);
    const houseId = url.searchParams.get('house');
    const familyId = url.searchParams.get('family');

    if (!houseId && !familyId) {
      return errorResponse('MISSING_PARAMS', '缺少 house 或 family 参数');
    }

    // 按 family 查询：返回家庭所有房间（含住所名称）
    if (familyId) {
      const membership = await isFamilyMember(env.DB, user.id, familyId);
      if (!membership) {
        return errorResponse('FORBIDDEN', '无权访问该家庭', 403);
      }

      const rooms = await env.DB.prepare(
        `SELECT r.id, r.name, r.house_id, r.created_at, h.name as house_name,
          (SELECT COUNT(*) FROM storage_spots ss WHERE ss.room_id = r.id AND ss.deleted_at IS NULL) as storage_count,
          (SELECT COUNT(*) FROM items i JOIN storage_spots ss ON i.storage_spot_id = ss.id WHERE ss.room_id = r.id AND i.deleted_at IS NULL) as item_count
         FROM rooms r
         JOIN houses h ON r.house_id = h.id
         WHERE h.family_id = ? AND r.deleted_at IS NULL AND h.deleted_at IS NULL
         ORDER BY h.name, r.created_at DESC`
      ).bind(familyId).all();

      return jsonResponse({ data: rooms.results });
    }

    // 按 house 查询：原有逻辑
    const house = await env.DB.prepare(
      'SELECT id, family_id FROM houses WHERE id = ? AND deleted_at IS NULL'
    ).bind(houseId).first();

    if (!house) {
      return errorResponse('NOT_FOUND', '房屋不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, house.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该房屋', 403);
    }

    const rooms = await env.DB.prepare(
      `SELECT r.id, r.name, r.created_at,
        (SELECT COUNT(*) FROM storage_spots ss WHERE ss.room_id = r.id AND ss.deleted_at IS NULL) as storage_count,
        (SELECT COUNT(*) FROM items i JOIN storage_spots ss ON i.storage_spot_id = ss.id WHERE ss.room_id = r.id AND i.deleted_at IS NULL) as item_count
       FROM rooms r
       WHERE r.house_id = ? AND r.deleted_at IS NULL
       ORDER BY r.created_at DESC`
    ).bind(houseId).all();

    return jsonResponse({ data: rooms.results });

  } catch (err) {
    console.error('Get rooms error:', err);
    return errorResponse('SERVER_ERROR', '获取房间列表失败', 500);
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
    const { house_id, name } = body;

    if (!house_id || !name) {
      return errorResponse('MISSING_FIELDS', 'house_id 和 name 为必填项');
    }

    const house = await env.DB.prepare(
      'SELECT id, family_id FROM houses WHERE id = ? AND deleted_at IS NULL'
    ).bind(house_id).first();

    if (!house) {
      return errorResponse('NOT_FOUND', '房屋不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, house.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该房屋', 403);
    }

    const result = await env.DB.prepare(
      'INSERT INTO rooms (house_id, name) VALUES (?, ?) RETURNING id, name, created_at'
    ).bind(house_id, name.trim()).first();

    await logActivity(env.DB, house.family_id, user.id, 'create', 'room', result.id, result.name);

    return jsonResponse({ data: result }, 201);

  } catch (err) {
    console.error('Create room error:', err);
    return errorResponse('SERVER_ERROR', '创建房间失败', 500);
  }
}
