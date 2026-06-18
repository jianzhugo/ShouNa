import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../../../utils';

const VALID_TYPES = ['item', 'house', 'room', 'storage'];

export async function onRequestPost(context) {
  const { request, env, params } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  const { type, id } = params;

  if (!VALID_TYPES.includes(type)) {
    return errorResponse('INVALID_TYPE', '无效的类型参数');
  }

  try {
    // Get the entity and verify family membership
    const entity = await getEntity(env.DB, type, id);
    if (!entity) return errorResponse('NOT_FOUND', '记录不存在', 404);

    // Get family_id (items don't have family_id directly, need to resolve via hierarchy)
    let familyId = entity.family_id;
    if (type === 'item') {
      const spot = await env.DB.prepare(
        `SELECT h.family_id FROM storage_spots s
         JOIN rooms r ON s.room_id = r.id
         JOIN houses h ON r.house_id = h.id
         WHERE s.id = ?`
      ).bind(entity.storage_spot_id).first();
      familyId = spot?.family_id;
    }

    const member = await isFamilyMember(env.DB, user.id, familyId);
    if (!member) return errorResponse('FORBIDDEN', '无权操作', 403);

    // Restore the entity
    await env.DB.prepare(
      `UPDATE ${getTableName(type)} SET deleted_at = NULL WHERE id = ?`
    ).bind(id).run();

    // Restore children based on type
    if (type === 'house') {
      // Restore rooms, storage spots, and items belonging to this house
      await env.DB.prepare(
        `UPDATE rooms SET deleted_at = NULL WHERE house_id = ?`
      ).bind(id).run();

      await env.DB.prepare(
        `UPDATE storage_spots SET deleted_at = NULL WHERE room_id IN (SELECT id FROM rooms WHERE house_id = ?)`
      ).bind(id).run();

      await env.DB.prepare(
        `UPDATE items SET deleted_at = NULL WHERE storage_spot_id IN (SELECT id FROM storage_spots WHERE room_id IN (SELECT id FROM rooms WHERE house_id = ?))`
      ).bind(id).run();
    } else if (type === 'room') {
      // Restore storage spots and items
      await env.DB.prepare(
        `UPDATE storage_spots SET deleted_at = NULL WHERE room_id = ?`
      ).bind(id).run();

      await env.DB.prepare(
        `UPDATE items SET deleted_at = NULL WHERE storage_spot_id IN (SELECT id FROM storage_spots WHERE room_id = ?)`
      ).bind(id).run();
    } else if (type === 'storage') {
      // Restore items
      await env.DB.prepare(
        `UPDATE items SET deleted_at = NULL WHERE storage_spot_id = ?`
      ).bind(id).run();
    }

    await logActivity(env.DB, entity.family_id, user.id, 'restore', type, id, entity.name || id);

    return jsonResponse({ data: { id, type, restored: true } });
  } catch (err) {
    console.error('Restore error:', err);
    return errorResponse('SERVER_ERROR', '恢复失败', 500);
  }
}

function getTableName(type) {
  const tableMap = {
    item: 'items',
    house: 'houses',
    room: 'rooms',
    storage: 'storage_spots'
  };
  return tableMap[type];
}

async function getEntity(db, type, id) {
  const table = getTableName(type);
  const entity = await db.prepare(
    `SELECT * FROM ${table} WHERE id = ?`
  ).bind(id).first();
  return entity;
}
