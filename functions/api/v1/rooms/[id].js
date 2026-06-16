import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '请先登录', 401);
    }

    const roomId = params.id;

    const room = await env.DB.prepare(
      'SELECT r.id, r.name, h.family_id FROM rooms r JOIN houses h ON r.house_id = h.id WHERE r.id = ? AND r.deleted_at IS NULL'
    ).bind(roomId).first();

    if (!room) {
      return errorResponse('NOT_FOUND', '房间不存在', 404);
    }

    const membership = await isFamilyMember(env.DB, user.id, room.family_id);
    if (!membership) {
      return errorResponse('FORBIDDEN', '无权操作该房间', 403);
    }

    // Cascade soft delete: items under storage spots under this room
    await env.DB.prepare(
      `UPDATE items SET deleted_at = datetime('now') WHERE deleted_at IS NULL
       AND storage_spot_id IN (
         SELECT id FROM storage_spots WHERE room_id = ? AND deleted_at IS NULL
       )`
    ).bind(roomId).run();

    // Cascade soft delete: storage spots under this room
    await env.DB.prepare(
      'UPDATE storage_spots SET deleted_at = datetime(\'now\') WHERE room_id = ? AND deleted_at IS NULL'
    ).bind(roomId).run();

    // Soft delete the room itself
    await env.DB.prepare(
      'UPDATE rooms SET deleted_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL'
    ).bind(roomId).run();

    await logActivity(env.DB, room.family_id, user.id, 'delete', 'room', room.id, room.name);

    return jsonResponse({ data: { id: roomId, deleted: true } });

  } catch (err) {
    console.error('Delete room error:', err);
    return errorResponse('SERVER_ERROR', '删除房间失败', 500);
  }
}
