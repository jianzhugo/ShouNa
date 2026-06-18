import { getAuthUser, isFamilyMember, jsonResponse, errorResponse, logActivity } from '../../utils';

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

export async function onRequestPost(context) {
  const { request, env, params } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '请先登录', 401);

  try {
    const itemId = params.id;

    const row = await getItemFamilyId(env.DB, itemId);
    if (!row) return errorResponse('NOT_FOUND', '物品不存在', 404);

    const membership = await isFamilyMember(env.DB, user.id, row.family_id);
    if (!membership) return errorResponse('FORBIDDEN', '无权操作', 403);

    const formData = await request.formData();
    const file = formData.get('photo');
    if (!file) return errorResponse('MISSING_FILE', '请选择要上传的照片');

    // Generate unique key (flat, no slashes - avoids routing issues)
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'jpg';
    const key = `${row.family_id}_${timestamp}_${random}.${ext}`;

    // Upload to R2
    await env.BUCKET.put(key, file.stream());

    // Get current max sort_order for this item
    const maxSort = await env.DB.prepare(
      'SELECT MAX(sort_order) as max_sort FROM item_photos WHERE item_id = ?'
    ).bind(itemId).first();

    const sortOrder = (maxSort?.max_sort || 0) + 1;

    // Insert into database - store the serving URL so <img src> works directly
    const serveUrl = `/api/v1/photos/file/${key}`;
    const result = await env.DB.prepare(
      'INSERT INTO item_photos (item_id, url, sort_order) VALUES (?, ?, ?)'
    ).bind(itemId, serveUrl, sortOrder).run();

    const photoId = result.meta?.last_row_id;

    await logActivity(env.DB, row.family_id, user.id, 'create', 'photo', photoId, key);

    return jsonResponse({
      data: {
        id: photoId,
        item_id: Number(itemId),
        url: serveUrl,
        sort_order: sortOrder
      }
    }, 201);
  } catch (err) {
    console.error('Upload photo error:', err);
    return errorResponse('SERVER_ERROR', '上传照片失败', 500);
  }
}
