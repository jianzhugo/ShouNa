import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const url = new URL(request.url);
    const storageSpotId = url.searchParams.get('storage');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const q = url.searchParams.get('q') || '';
    const category = url.searchParams.get('category') || '';

    if (!storageSpotId) {
      return errorResponse('MISSING_PARAM', '缺少 storage 参数');
    }

    // Verify storage spot belongs to user's family
    const spot = await env.DB.prepare(
      `SELECT s.id, s.name, h.family_id
       FROM storage_spots s
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       WHERE s.id = ? AND s.deleted_at IS NULL`
    ).bind(storageSpotId).first();

    if (!spot) {
      return errorResponse('NOT_FOUND', '收纳位置不存在');
    }

    const membership = await isFamilyMember(env.DB, user.id, spot.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该收纳位置');
    }

    // Build query with optional filters
    let whereClause = 'WHERE i.storage_spot_id = ? AND i.deleted_at IS NULL';
    const params = [storageSpotId];

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
      `SELECT COUNT(*) as total FROM items i ${whereClause}`
    ).bind(...params).first();
    const total = countResult.total;

    // Fetch items with category name and photo count
    const offset = (page - 1) * limit;
    const items = await env.DB.prepare(
      `SELECT i.*, c.name as category_name,
              (SELECT COUNT(*) FROM item_photos ip WHERE ip.item_id = i.id) as photo_count
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       ${whereClause}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return jsonResponse({
      data: items.results,
      pagination: {
        page,
        limit,
        total,
        has_more: offset + limit < total
      }
    });

  } catch (err) {
    console.error('Get items error:', err);
    return errorResponse('SERVER_ERROR', '获取物品列表失败', 500);
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
    const { storage_spot_id, name, category_id, quantity, note } = body;

    if (!storage_spot_id || !name) {
      return errorResponse('MISSING_FIELDS', '收纳位置和物品名称为必填项');
    }

    // Verify storage spot belongs to user's family
    const spot = await env.DB.prepare(
      `SELECT s.id, s.name, h.family_id
       FROM storage_spots s
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       WHERE s.id = ? AND s.deleted_at IS NULL`
    ).bind(storage_spot_id).first();

    if (!spot) {
      return errorResponse('NOT_FOUND', '收纳位置不存在');
    }

    const membership = await isFamilyMember(env.DB, user.id, spot.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权在该收纳位置添加物品');
    }

    const result = await env.DB.prepare(
      `INSERT INTO items (storage_spot_id, name, category_id, quantity, note)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      storage_spot_id,
      name,
      category_id || null,
      quantity || 1,
      note || null
    ).run();

    const itemId = result.meta.last_row_id;

    const item = await env.DB.prepare(
      `SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?`
    ).bind(itemId).first();

    await logActivity(env.DB, spot.family_id, user.id, 'create', 'item', itemId, name);

    return jsonResponse({ data: item }, 201);

  } catch (err) {
    console.error('Create item error:', err);
    return errorResponse('SERVER_ERROR', '创建物品失败', 500);
  }
}
