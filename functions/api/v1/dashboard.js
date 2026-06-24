import { getAuthUser, isFamilyMember, jsonResponse, errorResponse } from './utils';

export async function onRequestGet(context) {
  const { request, env } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  const url = new URL(request.url);
  const familyId = url.searchParams.get('family');
  if (!familyId) return errorResponse('MISSING_FAMILY', '缺少家庭参数');

  const member = await isFamilyMember(env.DB, user.id, familyId);
  if (!member) return errorResponse('FORBIDDEN', '无权访问该家庭', 403);

  try {
    // Stats
    const [houseCount, roomCount, storageCount, itemCount] = await Promise.all([
      env.DB.prepare('SELECT COUNT(*) as count FROM houses WHERE family_id = ? AND deleted_at IS NULL').bind(familyId).first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM rooms r JOIN houses h ON r.house_id = h.id WHERE h.family_id = ? AND r.deleted_at IS NULL').bind(familyId).first(),
      env.DB.prepare('SELECT COUNT(*) as count FROM storage_spots sp JOIN rooms r ON sp.room_id = r.id JOIN houses h ON r.house_id = h.id WHERE h.family_id = ? AND sp.deleted_at IS NULL').bind(familyId).first(),
      env.DB.prepare(`
        SELECT COUNT(*) as count FROM items i
        JOIN storage_spots sp ON i.storage_spot_id = sp.id
        JOIN rooms r ON sp.room_id = r.id
        JOIN houses h ON r.house_id = h.id
        WHERE h.family_id = ? AND i.deleted_at IS NULL
      `).bind(familyId).first()
    ]);

    const stats = {
      house_count: houseCount.count,
      room_count: roomCount.count,
      storage_count: storageCount.count,
      item_count: itemCount.count
    };

    // Houses with item count for bar chart
    const houses = await env.DB.prepare(
      `SELECT h.id, h.name, COUNT(i.id) as item_count
       FROM houses h
       LEFT JOIN rooms r ON r.house_id = h.id AND r.deleted_at IS NULL
       LEFT JOIN storage_spots s ON s.room_id = r.id AND s.deleted_at IS NULL
       LEFT JOIN items i ON i.storage_spot_id = s.id AND i.deleted_at IS NULL
       WHERE h.family_id = ? AND h.deleted_at IS NULL
       GROUP BY h.id, h.name
       ORDER BY h.name`
    ).bind(familyId).all();

    // Recent items with location path and category
    const recentItems = await env.DB.prepare(
      `SELECT i.id, i.name, i.quantity, i.created_at, i.updated_at,
              c.name as category,
              h.name || ' > ' || r.name || ' > ' || s.name as location,
              (SELECT ip.url FROM item_photos ip WHERE ip.item_id = i.id ORDER BY ip.sort_order ASC LIMIT 1) as first_photo_url
       FROM items i
       LEFT JOIN categories c ON i.category_id = c.id
       LEFT JOIN storage_spots s ON i.storage_spot_id = s.id
       LEFT JOIN rooms r ON s.room_id = r.id
       LEFT JOIN houses h ON r.house_id = h.id
       WHERE h.family_id = ? AND i.deleted_at IS NULL
       ORDER BY i.created_at DESC
       LIMIT 10`
    ).bind(familyId).all();

    // Family members
    const members = await env.DB.prepare(
      `SELECT fm.role, u.id, u.name, u.email, u.avatar
       FROM family_members fm
       JOIN users u ON fm.user_id = u.id AND u.deleted_at IS NULL
       WHERE fm.family_id = ?`
    ).bind(familyId).all();

    return jsonResponse({
      data: {
        stats,
        houses: houses.results,
        recent_items: recentItems.results,
        members: members.results
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return errorResponse('SERVER_ERROR', '获取仪表盘数据失败', 500);
  }
}
