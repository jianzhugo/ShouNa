import { getAuthUser, isFamilyMember, jsonResponse, errorResponse } from '../utils';

export async function onRequestGet(context) {
  const { request, env } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  const url = new URL(request.url);
  const familyId = url.searchParams.get('family');
  if (!familyId) return errorResponse('MISSING_FAMILY', '缺少家庭参数');

  const member = await isFamilyMember(env.DB, user.id, familyId);
  if (!member) return errorResponse('FORBIDDEN', '无权访问该家庭', 403);

  const type = url.searchParams.get('type') || '';

  try {
    const result = {};

    if (!type || type === 'item') {
      const items = await env.DB.prepare(
        `SELECT i.*, c.name as category_name,
                h.name as house_name, r.name as room_name, s.name as storage_name
         FROM items i
         LEFT JOIN categories c ON i.category_id = c.id
         LEFT JOIN storage_spots s ON i.storage_spot_id = s.id
         LEFT JOIN rooms r ON s.room_id = r.id
         LEFT JOIN houses h ON r.house_id = h.id
         WHERE h.family_id = ? AND i.deleted_at IS NOT NULL
         ORDER BY i.deleted_at DESC`
      ).bind(familyId).all();
      result.items = items.results;
    }

    if (!type || type === 'house') {
      const houses = await env.DB.prepare(
        `SELECT * FROM houses WHERE family_id = ? AND deleted_at IS NOT NULL ORDER BY deleted_at DESC`
      ).bind(familyId).all();
      result.houses = houses.results;
    }

    if (!type || type === 'room') {
      const rooms = await env.DB.prepare(
        `SELECT r.*, h.name as house_name
         FROM rooms r
         LEFT JOIN houses h ON r.house_id = h.id
         WHERE h.family_id = ? AND r.deleted_at IS NOT NULL
         ORDER BY r.deleted_at DESC`
      ).bind(familyId).all();
      result.rooms = rooms.results;
    }

    if (!type || type === 'storage') {
      const storage = await env.DB.prepare(
        `SELECT s.*, r.name as room_name, h.name as house_name
         FROM storage_spots s
         LEFT JOIN rooms r ON s.room_id = r.id
         LEFT JOIN houses h ON r.house_id = h.id
         WHERE h.family_id = ? AND s.deleted_at IS NOT NULL
         ORDER BY s.deleted_at DESC`
      ).bind(familyId).all();
      result.storage = storage.results;
    }

    return jsonResponse({ data: result });
  } catch (err) {
    console.error('Get trash error:', err);
    return errorResponse('SERVER_ERROR', '获取回收站失败', 500);
  }
}
