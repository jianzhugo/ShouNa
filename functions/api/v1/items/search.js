import { getAuthUser, isFamilyMember, jsonResponse, errorResponse } from '../utils';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const url = new URL(request.url);
    const familyId = url.searchParams.get('family');
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

    if (!familyId) {
      return errorResponse('MISSING_PARAM', '缺少 family 参数');
    }

    const membership = await isFamilyMember(env.DB, user.id, familyId);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该家庭');
    }

    // Build query
    let whereClause = `WHERE i.deleted_at IS NULL AND h.family_id = ?`;
    const params = [familyId];

    if (q) {
      whereClause += ' AND i.name LIKE ?';
      params.push(`%${q}%`);
    }

    if (category) {
      whereClause += ' AND i.category_id = ?';
      params.push(category);
    }

    // Count total
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total
       FROM items i
       JOIN storage_spots s ON i.storage_spot_id = s.id
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       ${whereClause}`
    ).bind(...params).first();
    const total = countResult.total;

    // Fetch items with full location path and first photo url
    const offset = (page - 1) * limit;
    const items = await env.DB.prepare(
      `SELECT i.*, c.name as category_name,
              h.name as house_name, r.name as room_name, s.name as storage_name,
              (SELECT ip.url FROM item_photos ip WHERE ip.item_id = i.id ORDER BY ip.sort_order ASC LIMIT 1) as first_photo_url
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       JOIN storage_spots s ON i.storage_spot_id = s.id
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    const data = items.results.map(item => ({
      ...item,
      location_path: `${item.house_name} > ${item.room_name} > ${item.storage_name}`
    }));

    return jsonResponse({
      data,
      pagination: {
        page,
        limit,
        total,
        has_more: offset + limit < total
      }
    });

  } catch (err) {
    console.error('Search items error:', err);
    return errorResponse('SERVER_ERROR', '搜索物品失败', 500);
  }
}
