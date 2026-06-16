import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const url = new URL(request.url);
    const familyId = url.searchParams.get('family');
    if (!familyId) {
      return errorResponse('MISSING_PARAMS', '缺少 family 参数');
    }

    const membership = await isFamilyMember(env.DB, user.id, familyId);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该家庭', 403);
    }

    const houses = await env.DB.prepare(
      `SELECT h.id, h.name, h.created_at,
        (SELECT COUNT(*) FROM rooms r WHERE r.house_id = h.id AND r.deleted_at IS NULL) as room_count,
        (SELECT COUNT(*) FROM items i JOIN storage_spots ss ON i.storage_spot_id = ss.id JOIN rooms r ON ss.room_id = r.id WHERE r.house_id = h.id AND i.deleted_at IS NULL) as item_count
       FROM houses h
       WHERE h.family_id = ? AND h.deleted_at IS NULL
       ORDER BY h.created_at DESC`
    ).bind(familyId).all();

    return jsonResponse({ data: houses.results });

  } catch (err) {
    console.error('Get houses error:', err);
    return errorResponse('SERVER_ERROR', '获取房屋列表失败', 500);
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
    const { family_id, name } = body;

    if (!family_id || !name) {
      return errorResponse('MISSING_FIELDS', 'family_id 和 name 为必填项');
    }

    const membership = await isFamilyMember(env.DB, user.id, family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该家庭', 403);
    }

    const result = await env.DB.prepare(
      'INSERT INTO houses (family_id, name) VALUES (?, ?) RETURNING id, name, created_at'
    ).bind(family_id, name.trim()).first();

    await logActivity(env.DB, family_id, user.id, 'create', 'house', result.id, result.name);

    return jsonResponse({ data: result }, 201);

  } catch (err) {
    console.error('Create house error:', err);
    return errorResponse('SERVER_ERROR', '创建房屋失败', 500);
  }
}
