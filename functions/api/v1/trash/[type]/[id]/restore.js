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

    const member = await isFamilyMember(env.DB, user.id, entity.family_id);
    if (!member) return errorResponse('FORBIDDEN', '无权操作', 403);

    // Restore the entity
    await env.DB.prepare(
      `UPDATE ${getTableName(type)} SET deleted_at = NULL WHERE id = ?`
    ).bind(id).run();

    // Restore children based on type
    if (type === 'house') {
      // Restore rooms, storage spots, and items belonging to this house
      await env.DB.prepare(
        `UPDATE rooms SET deleted_at = NULL WHERE house_id = ? AND family_id = ?`
      ).bind(id, entity.family_id).run();

      await env.DB.prepare(
        `UPDATE storage_spots SET deleted_at = NULL WHERE room_id IN (SELECT id FROM rooms WHERE house_id = ?) AND family_id = ?`
      ).bind(id, entity.family_id).run();

      await env.DB.prepare(
        `UPDATE items SET deleted_at = NULL WHERE storage_spot_id IN (SELECT id FROM storage_spots WHERE room_id IN (SELECT id FROM rooms WHERE house_id = ?)) AND family_id = ?`
      ).bind(id, entity.family_id).run();
    } else if (type === 'room') {
      // Restore storage spots and items
      await env.DB.prepare(
        `UPDATE storage_spots SET deleted_at = NULL WHERE room_id = ? AND family_id = ?`
      ).bind(id, entity.family_id).run();

      await env.DB.prepare(
        `UPDATE items SET deleted_at = NULL WHERE storage_spot_id IN (SELECT id FROM storage_spots WHERE room_id = ?) AND family_id = ?`
      ).bind(id, entity.family_id).run();
    } else if (type === 'storage') {
      // Restore items
      await env.DB.prepare(
        `UPDATE items SET deleted_at = NULL WHERE storage_spot_id = ? AND family_id = ?`
      ).bind(id, entity.family_id).run();
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
