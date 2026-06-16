import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  try {
    const { id } = params;

    // Get photo and verify ownership through item -> family chain
    const photo = await env.DB.prepare(
      `SELECT ip.*, i.family_id, i.id as item_id
       FROM item_photos ip
       JOIN items i ON ip.item_id = i.id
       WHERE ip.id = ?`
    ).bind(id).first();

    if (!photo) return errorResponse('NOT_FOUND', '照片不存在', 404);

    const member = await isFamilyMember(env.DB, user.id, photo.family_id);
    if (!member) return errorResponse('FORBIDDEN', '无权操作', 403);

    // Delete from R2 if key exists
    if (photo.url && env.BUCKET) {
      try {
        await env.BUCKET.delete(photo.url);
      } catch (e) {
        console.error('R2 delete error:', e);
      }
    }

    // Delete from database
    await env.DB.prepare(
      'DELETE FROM item_photos WHERE id = ?'
    ).bind(id).run();

    await logActivity(env.DB, photo.family_id, user.id, 'delete', 'photo', id, photo.url);

    return jsonResponse({ data: { id } });
  } catch (err) {
    console.error('Delete photo error:', err);
    return errorResponse('SERVER_ERROR', '删除照片失败', 500);
  }
}
