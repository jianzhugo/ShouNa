import { getAuthUser, isFamilyMember, isFamilyAdmin, jsonResponse, errorResponse, logActivity } from '../utils';

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
    const categories = await env.DB.prepare(
      'SELECT * FROM categories WHERE family_id = ? ORDER BY sort_order ASC'
    ).bind(familyId).all();

    return jsonResponse({ data: categories.results });
  } catch (err) {
    console.error('Get categories error:', err);
    return errorResponse('SERVER_ERROR', '获取分类失败', 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  try {
    const body = await request.json();
    const { family_id, name } = body;

    if (!family_id || !name) {
      return errorResponse('MISSING_FIELDS', '家庭ID和分类名称为必填项');
    }

    const admin = await isFamilyAdmin(env.DB, user.id, family_id);
    if (!admin) return errorResponse('FORBIDDEN', '仅管理员可创建分类', 403);

    const maxSort = await env.DB.prepare(
      'SELECT MAX(sort_order) as max_sort FROM categories WHERE family_id = ?'
    ).bind(family_id).first();

    const sortOrder = (maxSort?.max_sort || 0) + 1;

    const result = await env.DB.prepare(
      'INSERT INTO categories (family_id, name, sort_order) VALUES (?, ?, ?) RETURNING *'
    ).bind(family_id, name, sortOrder).first();

    await logActivity(env.DB, family_id, user.id, 'create', 'category', result.id, name);

    return jsonResponse({ data: result }, 201);
  } catch (err) {
    console.error('Create category error:', err);
    return errorResponse('SERVER_ERROR', '创建分类失败', 500);
  }
}
