import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const houseId = params.id;

    const house = await env.DB.prepare(
      'SELECT id, name, family_id FROM houses WHERE id = ? AND deleted_at IS NULL'
    ).bind(houseId).first();

    if (!house) {
      return errorResponse('NOT_FOUND', '房屋不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, house.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权操作该房屋', 403);
    }

    // Cascade soft delete: items under storage spots under rooms under this house
    await env.DB.prepare(
      `UPDATE items SET deleted_at = datetime('now') WHERE deleted_at IS NULL
       AND storage_spot_id IN (
         SELECT ss.id FROM storage_spots ss JOIN rooms r ON ss.room_id = r.id WHERE r.house_id = ? AND ss.deleted_at IS NULL
       )`
    ).bind(houseId).run();

    // Cascade soft delete: storage spots under rooms under this house
    await env.DB.prepare(
      `UPDATE storage_spots SET deleted_at = datetime('now') WHERE deleted_at IS NULL
       AND room_id IN (
         SELECT id FROM rooms WHERE house_id = ? AND deleted_at IS NULL
       )`
    ).bind(houseId).run();

    // Cascade soft delete: rooms under this house
    await env.DB.prepare(
      'UPDATE rooms SET deleted_at = datetime(\'now\') WHERE house_id = ? AND deleted_at IS NULL'
    ).bind(houseId).run();

    // Soft delete the house itself
    await env.DB.prepare(
      'UPDATE houses SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL'
    ).bind(houseId).run();

    await logActivity(env.DB, house.family_id, user.id, 'delete', 'house', house.id, house.name);

    return jsonResponse({ data: { id: houseId, deleted: true } });

  } catch (err) {
    console.error('Delete house error:', err);
    return errorResponse('SERVER_ERROR', '删除房屋失败', 500);
  }
}
