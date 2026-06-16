import { getAuthUser, isFamilyMember, generateInviteCode, jsonResponse, errorResponse, logActivity } from '../utils';

export async function onRequestGet(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '未登录或登录已过期', 401);
    }

    const families = await env.DB.prepare(
      `SELECT f.id, f.name, f.invite_code, f.invite_code_expires_at, fm.role, f.created_at
       FROM families f
       JOIN family_members fm ON fm.family_id = f.id
       WHERE fm.user_id = ? AND f.deleted_at IS NULL
       ORDER BY f.created_at DESC`
    ).bind(user.id).all();

    const familiesWithCounts = await Promise.all(
      families.results.map(async (family) => {
        const [memberCount, houseCount, itemCount] = await Promise.all([
          env.DB.prepare('SELECT COUNT(*) as count FROM family_members WHERE family_id = ?').bind(family.id).first(),
          env.DB.prepare('SELECT COUNT(*) as count FROM houses WHERE family_id = ? AND deleted_at IS NULL').bind(family.id).first(),
          env.DB.prepare('SELECT COUNT(*) as count FROM items WHERE family_id = ? AND deleted_at IS NULL').bind(family.id).first(),
        ]);

        return {
          id: family.id,
          name: family.name,
          invite_code: family.invite_code,
          invite_code_expires_at: family.invite_code_expires_at,
          role: family.role,
          created_at: family.created_at,
          member_count: memberCount.count,
          house_count: houseCount.count,
          item_count: itemCount.count,
        };
      })
    );

    return jsonResponse({ data: familiesWithCounts });
  } catch (err) {
    console.error('List families error:', err);
    return errorResponse('SERVER_ERROR', '获取家庭组列表失败', 500);
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const user = await getAuthUser(request, env);
    if (!user) {
      return errorResponse('UNAUTHORIZED', '未登录或登录已过期', 401);
    }

    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return errorResponse('MISSING_FIELDS', '家庭组名称为必填项');
    }

    const inviteCode = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const familyResult = await env.DB.prepare(
      'INSERT INTO families (name, created_by, invite_code, invite_code_expires_at) VALUES (?, ?, ?, ?)'
    ).bind(name.trim(), user.id, inviteCode, expiresAt).run();

    const familyId = familyResult.meta.last_row_id;

    await env.DB.prepare(
      'INSERT INTO family_members (user_id, family_id, role) VALUES (?, ?, ?)'
    ).bind(user.id, familyId, 'admin').run();

    const defaultCategories = ['证件', '数码', '工具', '药品', '衣物', '书籍', '日用', '食品', '其他'];
    for (let i = 0; i < defaultCategories.length; i++) {
      await env.DB.prepare(
        'INSERT INTO categories (family_id, name, sort_order) VALUES (?, ?, ?)'
      ).bind(familyId, defaultCategories[i], i).run();
    }

    await logActivity(env.DB, familyId, user.id, 'create', 'family', familyId, name.trim());

    return jsonResponse({
      data: {
        id: familyId,
        name: name.trim(),
        invite_code: inviteCode,
        invite_code_expires_at: expiresAt,
        role: 'admin',
      },
      message: '家庭组创建成功',
    }, 201);
  } catch (err) {
    console.error('Create family error:', err);
    return errorResponse('SERVER_ERROR', '创建家庭组失败', 500);
  }
}
