import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const storageId = params.id;

    const storage = await env.DB.prepare(
      'SELECT s.id, s.name, h.family_id FROM storage_spots s JOIN rooms r ON s.room_id = r.id JOIN houses h ON r.house_id = h.id WHERE s.id = ? AND s.deleted_at IS NULL'
    ).bind(storageId).first();

    if (!storage) {
      return errorResponse('NOT_FOUND', '收纳位不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, storage.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权操作该收纳位', 403);
    }

    // Cascade soft delete: items under this storage spot
    await env.DB.prepare(
      'UPDATE items SET deleted_at = datetime(\'now\') WHERE storage_spot_id = ? AND deleted_at IS NULL'
    ).bind(storageId).run();

    // Soft delete the storage spot itself
    await env.DB.prepare(
      'UPDATE storage_spots SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL'
    ).bind(storageId).run();

    await logActivity(env.DB, storage.family_id, user.id, 'delete', 'storage_spot', storage.id, storage.name);

    return jsonResponse({ data: { id: storageId, deleted: true } });

  } catch (err) {
    console.error('Delete storage spot error:', err);
    return errorResponse('SERVER_ERROR', '删除收纳位失败', 500);
  }
}
