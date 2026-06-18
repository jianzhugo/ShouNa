import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../../../utils';

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '请先登录', 401);

  try {
    const itemId = params.id;
    const photoId = params.photoId;

    // Get photo and verify ownership through item -> family chain
    const photo = await env.DB.prepare(
      `SELECT ip.*, i.family_id
       FROM item_photos ip
       JOIN items i ON ip.item_id = i.id
       WHERE ip.id = ? AND ip.item_id = ?`
    ).bind(photoId, itemId).first();

    if (!photo) return errorResponse('NOT_FOUND', '照片不存在', 404);

    const membership = await isFamilyMember(env.DB, user.id, photo.family_id);
    if (!membership) return errorResponse('FORBIDDEN', '无权操作', 403);

    // Delete from R2 - extract R2 key from serving URL
    if (photo.url && env.BUCKET) {
      try {
        const r2Key = photo.url.replace('/api/v1/photos/file/', '');
        await env.BUCKET.delete(r2Key);
      } catch (e) {
        console.error('R2 delete error:', e);
      }
    }

    // Delete from database
    await env.DB.prepare(
      'DELETE FROM item_photos WHERE id = ?'
    ).bind(photoId).run();

    await logActivity(env.DB, photo.family_id, user.id, 'delete', 'photo', photoId, photo.url);

    return jsonResponse({ data: { id: Number(photoId) } });
  } catch (err) {
    console.error('Delete photo error:', err);
    return errorResponse('SERVER_ERROR', '删除照片失败', 500);
  }
}
