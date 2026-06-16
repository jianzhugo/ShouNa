import { getAuthUser, isFamilyAdmin, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestPut(context) {
  const { request, env, params } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  try {
    const { id } = params;
    const body = await request.json();
    const { name } = body;

    if (!name) return errorResponse('MISSING_FIELDS', '分类名称为必填项');

    const category = await env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first();

    if (!category) return errorResponse('NOT_FOUND', '分类不存在', 404);

    const admin = await isFamilyAdmin(env.DB, user.id, category.family_id);
    if (!admin) return errorResponse('FORBIDDEN', '仅管理员可编辑分类', 403);

    await env.DB.prepare(
      'UPDATE categories SET name = ? WHERE id = ?'
    ).bind(name, id).run();

    await logActivity(env.DB, category.family_id, user.id, 'update', 'category', id, name);

    return jsonResponse({ data: { id, name } });
  } catch (err) {
    console.error('Update category error:', err);
    return errorResponse('SERVER_ERROR', '更新分类失败', 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  try {
    const { id } = params;

    const category = await env.DB.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).bind(id).first();

    if (!category) return errorResponse('NOT_FOUND', '分类不存在', 404);

    const admin = await isFamilyAdmin(env.DB, user.id, category.family_id);
    if (!admin) return errorResponse('FORBIDDEN', '仅管理员可删除分类', 403);

    // Find the "其他" category for this family
    const otherCategory = await env.DB.prepare(
      'SELECT id FROM categories WHERE family_id = ? AND name = ?'
    ).bind(category.family_id, '其他').first();

    if (otherCategory) {
      // Move all items from this category to "其他"
      await env.DB.prepare(
        'UPDATE items SET category_id = ? WHERE category_id = ?'
      ).bind(otherCategory.id, id).run();
    }

    // Delete the category
    await env.DB.prepare(
      'DELETE FROM categories WHERE id = ?'
    ).bind(id).run();

    await logActivity(env.DB, category.family_id, user.id, 'delete', 'category', id, category.name);

    return jsonResponse({ data: { id } });
  } catch (err) {
    console.error('Delete category error:', err);
    return errorResponse('SERVER_ERROR', '删除分类失败', 500);
  }
}
