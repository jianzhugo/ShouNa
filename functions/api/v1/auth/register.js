import { hashPassword, generateInviteCode, signJWT, setAuthCookies, jsonResponse, errorResponse, checkRateLimit, ensureSchema } from '../utils';

export async function onRequestPost(context) {
  const { request, env } = context;

  // Ensure database schema exists
  await ensureSchema(env.DB);

  // Rate limiting
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(ip)) {
    return errorResponse('RATE_LIMITED', '请求过于频繁，请稍后再试', 429);
  }

  try {
    const body = await request.json();
    const { email, password, name, invite_code, action, family_name } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return errorResponse('MISSING_FIELDS', '邮箱、密码和昵称为必填项');
    }

    // Validate password strength
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return errorResponse('WEAK_PASSWORD', '密码至少8位，必须包含字母和数字');
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('INVALID_EMAIL', '邮箱格式不正确');
    }

    // Check if email already exists
    const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL').bind(email).first();
    if (existingUser) {
      return errorResponse('EMAIL_EXISTS', '该邮箱已注册');
    }

    // Check if this is the first user on the site
    const userCount = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL').first();
    const isFirstUser = userCount.count === 0;

    let familyId = null;
    let role = 'member';
    let inviteCodeFamilyId = null;

    if (isFirstUser) {
      // First user - no invite code needed, must create family
      if (!family_name) {
        return errorResponse('MISSING_FAMILY_NAME', '首次注册需要创建家庭组，请填写家庭名称');
      }
      role = 'admin';
    } else {
      // Not first user - invite code is required
      if (!invite_code) {
        return errorResponse('INVITE_CODE_REQUIRED', '需要邀请码才能注册');
      }

      // Validate invite code
      const family = await env.DB.prepare(
        'SELECT id, invite_code_expires_at, invite_code_max_uses, invite_code_used_count FROM families WHERE invite_code = ? AND deleted_at IS NULL'
      ).bind(invite_code).first();

      if (!family) {
        return errorResponse('INVALID_INVITE_CODE', '邀请码无效');
      }

      // Check expiry
      if (family.invite_code_expires_at && new Date(family.invite_code_expires_at) < new Date()) {
        return errorResponse('INVITE_CODE_EXPIRED', '邀请码已过期');
      }

      // Check usage limit
      if (family.invite_code_used_count >= family.invite_code_max_uses) {
        return errorResponse('INVITE_CODE_EXHAUSTED', '邀请码已达到最大使用次数');
      }

      inviteCodeFamilyId = family.id;

      // Determine action: join or create
      if (action === 'create') {
        // Create new family
        if (!family_name) {
          return errorResponse('MISSING_FAMILY_NAME', '请填写新家庭名称');
        }
        role = 'admin';
      } else {
        // Join existing family (default)
        familyId = family.id;
        role = 'member';
      }
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userResult = await env.DB.prepare(
      'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
    ).bind(email, passwordHash, name).run();

    const userId = userResult.meta.last_row_id;

    // If creating a new family
    if (!familyId && family_name) {
      const newInviteCode = generateInviteCode();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const familyResult = await env.DB.prepare(
        'INSERT INTO families (name, created_by, invite_code, invite_code_expires_at) VALUES (?, ?, ?, ?)'
      ).bind(family_name, userId, newInviteCode, expiresAt).run();
      familyId = familyResult.meta.last_row_id;
      role = 'admin';
    }

    // Add user to the invite code's family as member (if they chose create, they also join the inviter's family)
    if (inviteCodeFamilyId && action === 'create') {
      await env.DB.prepare(
        'INSERT INTO family_members (user_id, family_id, role) VALUES (?, ?, ?)'
      ).bind(userId, inviteCodeFamilyId, 'member').run();

      // Increment invite code usage
      await env.DB.prepare(
        'UPDATE families SET invite_code_used_count = invite_code_used_count + 1 WHERE id = ?'
      ).bind(inviteCodeFamilyId).run();
    }

    // Add user to family
    if (familyId) {
      await env.DB.prepare(
        'INSERT INTO family_members (user_id, family_id, role) VALUES (?, ?, ?)'
      ).bind(userId, familyId, role).run();

      // Increment invite code usage for join action
      if (action !== 'create' && inviteCodeFamilyId) {
        await env.DB.prepare(
          'UPDATE families SET invite_code_used_count = invite_code_used_count + 1 WHERE id = ?'
        ).bind(inviteCodeFamilyId).run();
      }

      // Insert default categories for new family
      const defaultCategories = ['证件', '数码', '工具', '药品', '衣物', '书籍', '日用', '食品', '其他'];
      for (let i = 0; i < defaultCategories.length; i++) {
        await env.DB.prepare(
          'INSERT INTO categories (family_id, name, sort_order) VALUES (?, ?, ?)'
        ).bind(familyId, defaultCategories[i], i).run();
      }
    }

    // Sign JWT tokens
    const token = await signJWT({ userId, email, name }, env.JWT_SECRET, 15);
    const refreshToken = await signJWT({ userId, email, name, type: 'refresh' }, env.JWT_REFRESH_SECRET, 7 * 24 * 60);

    const isLocal = request.url.includes('localhost') || request.url.includes('127.0.0.1');
    const cookies = setAuthCookies(token, refreshToken, isLocal);

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', 'application/json');
    cookies.forEach(c => responseHeaders.append('Set-Cookie', c));
    return new Response(JSON.stringify({
      data: { id: userId, email, name, familyId, role },
      message: '注册成功'
    }), {
      status: 201,
      headers: responseHeaders
    });

  } catch (err) {
    console.error('Register error:', err);
    return errorResponse('SERVER_ERROR', '注册失败，请稍后再试', 500);
  }
}
