import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../../utils';

export async function onRequestPut(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const itemId = params.id;

    // Verify item belongs to user's family
    const itemRow = await env.DB.prepare(
      `SELECT h.family_id FROM items i
       JOIN storage_spots s ON i.storage_spot_id = s.id
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       WHERE i.id = ? AND i.deleted_at IS NULL`
    ).bind(itemId).first();

    if (!itemRow) {
      return errorResponse('NOT_FOUND', '物品不存在');
    }

    const membership = await isFamilyMember(env.DB, user.id, itemRow.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权移动该物品');
    }

    const body = await request.json();
    const { storage_spot_id } = body;

    if (!storage_spot_id) {
      return errorResponse('MISSING_FIELDS', '目标收纳位置为必填项');
    }

    // Verify new storage spot belongs to user's family
    const newSpot = await env.DB.prepare(
      `SELECT s.id, s.name, h.family_id
       FROM storage_spots s
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       WHERE s.id = ? AND s.deleted_at IS NULL`
    ).bind(storage_spot_id).first();

    if (!newSpot) {
      return errorResponse('NOT_FOUND', '目标收纳位置不存在');
    }

    const newMembership = await isFamilyMember(env.DB, user.id, newSpot.family_id);
    if (!newMembership) {
      return errorResponse('FORBIDDEN', '无权移动到该收纳位置');
    }

    // Get old location names
    const oldLocation = await env.DB.prepare(
      `SELECT h.name as house_name, r.name as room_name, s.name as storage_name
       FROM storage_spots s
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       WHERE s.id = (SELECT storage_spot_id FROM items WHERE id = ?)`
    ).bind(itemId).first();

    // Get new location names
    const newLocation = await env.DB.prepare(
      `SELECT h.name as house_name, r.name as room_name, s.name as storage_name
       FROM storage_spots s
       JOIN rooms r ON s.room_id = r.id
       JOIN houses h ON r.house_id = h.id
       WHERE s.id = ?`
    ).bind(storage_spot_id).first();

    // Update item's storage spot
    await env.DB.prepare(
      "UPDATE items SET storage_spot_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(storage_spot_id, itemId).run();

    const item = await env.DB.prepare(
      `SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?`
    ).bind(itemId).first();

    const oldPath = `${oldLocation.house_name} > ${oldLocation.room_name} > ${oldLocation.storage_name}`;
    const newPath = `${newLocation.house_name} > ${newLocation.room_name} > ${newLocation.storage_name}`;

    await logActivity(env.DB, newSpot.family_id, user.id, 'move', 'item', itemId, item.name, {
      from: oldPath,
      to: newPath
    });

    return jsonResponse({ data: item });

  } catch (err) {
    console.error('Move item error:', err);
    return errorResponse('SERVER_ERROR', '移动物品失败', 500);
  }
}
