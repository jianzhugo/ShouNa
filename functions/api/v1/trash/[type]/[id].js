import { getAuthUser, isFamilyAdmin, jsonResponse, errorResponse } from '../../utils';

const VALID_TYPES = ['item', 'house', 'room', 'storage'];

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  const { type, id } = params;

  if (!VALID_TYPES.includes(type)) {
    return errorResponse('INVALID_TYPE', '无效的类型参数');
  }

  try {
    const entity = await getEntity(env.DB, type, id);
    if (!entity) return errorResponse('NOT_FOUND', '记录不存在', 404);

    const admin = await isFamilyAdmin(env.DB, user.id, entity.family_id);
    if (!admin) return errorResponse('FORBIDDEN', '仅管理员可永久删除', 403);

    const table = getTableName(type);

    if (type === 'item') {
      // Delete related records first
      await env.DB.prepare('DELETE FROM item_photos WHERE item_id = ?').bind(id).run();
      await env.DB.prepare('DELETE FROM activity_logs WHERE entity_type = ? AND entity_id = ?').bind('item', id).run();
    }

    // Physical delete
    await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();

    return jsonResponse({ data: { id, type, deleted: true } });
  } catch (err) {
    console.error('Permanent delete error:', err);
    return errorResponse('SERVER_ERROR', '永久删除失败', 500);
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
