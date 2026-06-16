import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../utils';

async function getItemFamilyId(db, itemId) {
  const row = await db.prepare(
    `SELECT h.family_id FROM items i
     JOIN storage_spots s ON i.storage_spot_id = s.id
     JOIN rooms r ON s.room_id = r.id
     JOIN houses h ON r.house_id = h.id
     WHERE i.id = ?`
  ).bind(itemId).first();
  return row;
}

export async function onRequestGet(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const itemId = params.id;

    const row = await getItemFamilyId(env.DB, itemId);
    if (!row) {
      return errorResponse('NOT_FOUND', '物品不存在');
    }

    const membership = await isFamilyMember(env.DB, user.id, row.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权访问该物品');
    }

    // Get item with category name and full location path
    const item = await env.DB.prepare(
      `SELECT i.*, c.name as category_name,
              h.name as house_name, r.name as room_name, s.name as storage_name
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       JOIN storage_spots s ON i.storage_spot_id = s.id
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       WHERE i.id = ? AND i.deleted_at IS NULL`
    ).bind(itemId).first();

    if (!item) {
      return errorResponse('NOT_FOUND', '物品不存在');
    }

    // Get photos
    const photos = await env.DB.prepare(
      'SELECT * FROM item_photos WHERE item_id = ? ORDER BY sort_order ASC'
    ).bind(itemId).all();

    // Get activity logs
    const logs = await env.DB.prepare(
      `SELECT al.*, u.name as user_name FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.entity_type = 'item' AND al.entity_id = ?
       ORDER BY al.created_at DESC`
    ).bind(itemId).all();

    return jsonResponse({
      data: {
        ...item,
        location_path: `${item.house_name} > ${item.room_name} > ${item.storage_name}`,
        photos: photos.results,
        activity_logs: logs.results
      }
    });

  } catch (err) {
    console.error('Get item error:', err);
    return errorResponse('SERVER_ERROR', '获取物品详情失败', 500);
  }
}

export async function onRequestPut(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const itemId = params.id;

    const row = await getItemFamilyId(env.DB, itemId);
    if (!row) {
      return errorResponse('NOT_FOUND', '物品不存在');
    }

    const membership = await isFamilyMember(env.DB, user.id, row.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权修改该物品');
    }

    // Check item exists and not deleted
    const existing = await env.DB.prepare(
      'SELECT * FROM items WHERE id = ? AND deleted_at IS NULL'
    ).bind(itemId).first();

    if (!existing) {
      return errorResponse('NOT_FOUND', '物品不存在');
    }

    const body = await request.json();
    const name = body.name !== undefined ? body.name : existing.name;
    const categoryId = body.category_id !== undefined ? body.category_id : existing.category_id;
    const quantity = body.quantity !== undefined ? body.quantity : existing.quantity;
    const note = body.note !== undefined ? body.note : existing.note;

    await env.DB.prepare(
      `UPDATE items SET name = ?, category_id = ?, quantity = ?, note = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(name, categoryId, quantity, note, itemId).run();

    const item = await env.DB.prepare(
      `SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?`
    ).bind(itemId).first();

    await logActivity(env.DB, row.family_id, user.id, 'update', 'item', itemId, name);

    return jsonResponse({ data: item });

  } catch (err) {
    console.error('Update item error:', err);
    return errorResponse('SERVER_ERROR', '更新物品失败', 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const itemId = params.id;

    const row = await getItemFamilyId(env.DB, itemId);
    if (!row) {
      return errorResponse('NOT_FOUND', '物品不存在');
    }

    const membership = await isFamilyMember(env.DB, user.id, row.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权删除该物品');
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM items WHERE id = ? AND deleted_at IS NULL'
    ).bind(itemId).first();

    if (!existing) {
      return errorResponse('NOT_FOUND', '物品不存在');
    }

    await env.DB.prepare(
      "UPDATE items SET deleted_at = datetime('now') WHERE id = ?"
    ).bind(itemId).run();

    await logActivity(env.DB, row.family_id, user.id, 'delete', 'item', itemId, existing.name);

    return jsonResponse({ data: { success: true } });

  } catch (err) {
    console.error('Delete item error:', err);
    return errorResponse('SERVER_ERROR', '删除物品失败', 500);
  }
}
