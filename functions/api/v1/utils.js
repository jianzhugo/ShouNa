// JWT utilities using Web Crypto API (available in Cloudflare Workers)
export async function signJWT(payload, secret, expiresInMinutes) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  payload.iat = now;
  payload.exp = now + expiresInMinutes * 60;

  const encoder = new TextEncoder();
  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return `${data}.${base64urlBytes(new Uint8Array(sig))}`;
}

export async function verifyJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const sigBuffer = base64urlToBuffer(sigB64);
  const valid = await crypto.subtle.verify('HMAC', key, sigBuffer, encoder.encode(`${headerB64}.${payloadB64}`));
  if (!valid) return null;

  // 解码 payload：先 base64 解码得到 UTF-8 字节，再用 TextDecoder 转为字符串
  const payloadBuffer = base64urlToBuffer(payloadB64);
  const payloadStr = new TextDecoder().decode(payloadBuffer);
  const payload = JSON.parse(payloadStr);
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function base64url(str) {
  // 先将字符串编码为 UTF-8 字节，再转换为 Latin1 字符串，最后 base64 编码
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlBytes(bytes) {
  // 直接将字节数组转换为 base64，不进行 UTF-8 编码
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(b64) {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToString(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return str;
}

// Password hashing using Web Crypto API
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password, hash) {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

// Generate random invite code (8 chars alphanumeric)
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const random = new Uint8Array(8);
  crypto.getRandomValues(random);
  for (let i = 0; i < 8; i++) {
    code += chars[random[i] % chars.length];
  }
  return code;
}

// Auto-initialize database schema on first request
let _schemaInitialized = false;
export async function ensureSchema(db) {
  if (_schemaInitialized) return;
  try {
    const check = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
    if (check) { _schemaInitialized = true; return; }
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT)`,
      `CREATE TABLE IF NOT EXISTS families (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_by INTEGER NOT NULL, invite_code TEXT UNIQUE, invite_code_expires_at TEXT, invite_code_max_uses INTEGER DEFAULT 10, invite_code_used_count INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT, FOREIGN KEY (created_by) REFERENCES users(id))`,
      `CREATE TABLE IF NOT EXISTS family_members (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, family_id INTEGER NOT NULL, role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')), joined_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (family_id) REFERENCES families(id), UNIQUE(user_id, family_id))`,
      `CREATE TABLE IF NOT EXISTS categories (id INTEGER PRIMARY KEY AUTOINCREMENT, family_id INTEGER NOT NULL, name TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (family_id) REFERENCES families(id))`,
      `CREATE TABLE IF NOT EXISTS houses (id INTEGER PRIMARY KEY AUTOINCREMENT, family_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT, FOREIGN KEY (family_id) REFERENCES families(id))`,
      `CREATE TABLE IF NOT EXISTS rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, house_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT, FOREIGN KEY (house_id) REFERENCES houses(id))`,
      `CREATE TABLE IF NOT EXISTS storage_spots (id INTEGER PRIMARY KEY AUTOINCREMENT, room_id INTEGER NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT, FOREIGN KEY (room_id) REFERENCES rooms(id))`,
      `CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, storage_spot_id INTEGER NOT NULL, category_id INTEGER, name TEXT NOT NULL, quantity INTEGER DEFAULT 1, note TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')), deleted_at TEXT, FOREIGN KEY (storage_spot_id) REFERENCES storage_spots(id), FOREIGN KEY (category_id) REFERENCES categories(id))`,
      `CREATE TABLE IF NOT EXISTS item_photos (id INTEGER PRIMARY KEY AUTOINCREMENT, item_id INTEGER NOT NULL, url TEXT NOT NULL, sort_order INTEGER DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (item_id) REFERENCES items(id))`,
      `CREATE TABLE IF NOT EXISTS activity_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, family_id INTEGER NOT NULL, user_id INTEGER NOT NULL, action TEXT NOT NULL CHECK(action IN ('create', 'update', 'move', 'delete', 'restore')), entity_type TEXT NOT NULL, entity_id INTEGER NOT NULL, entity_name TEXT, details TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY (family_id) REFERENCES families(id), FOREIGN KEY (user_id) REFERENCES users(id))`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
      `CREATE INDEX IF NOT EXISTS idx_families_invite_code ON families(invite_code)`,
      `CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON family_members(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON family_members(family_id)`,
      `CREATE INDEX IF NOT EXISTS idx_categories_family_id ON categories(family_id)`,
      `CREATE INDEX IF NOT EXISTS idx_houses_family_id ON houses(family_id)`,
      `CREATE INDEX IF NOT EXISTS idx_rooms_house_id ON rooms(house_id)`,
      `CREATE INDEX IF NOT EXISTS idx_storage_spots_room_id ON storage_spots(room_id)`,
      `CREATE INDEX IF NOT EXISTS idx_items_storage_spot_id ON items(storage_spot_id)`,
      `CREATE INDEX IF NOT EXISTS idx_items_category_id ON items(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)`,
      `CREATE INDEX IF NOT EXISTS idx_items_deleted_at ON items(deleted_at)`,
      `CREATE INDEX IF NOT EXISTS idx_item_photos_item_id ON item_photos(item_id)`,
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_family_id ON activity_logs(family_id)`,
      `CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id)`,
    ];
    const batch = statements.map(sql => db.prepare(sql));
    await db.batch(batch);
    _schemaInitialized = true;
  } catch (e) {
    console.error('Schema init error:', e);
  }
}

// JSON response helpers
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function errorResponse(code, message, status = 400) {
  return jsonResponse({ error: { code, message } }, status);
}

// Auth middleware - extract user from JWT cookie
export async function getAuthUser(request, env) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split('; ').map(c => { const [k, ...v] = c.split('='); return [k, v.join('=')]; })
  );

  const token = cookies['token'];
  if (!token) return null;

  const payload = await verifyJWT(token, env.JWT_SECRET);
  if (!payload) return null;

  return { id: payload.userId, email: payload.email, name: payload.name };
}

// Check if user is member of family
export async function isFamilyMember(db, userId, familyId) {
  const member = await db.prepare(
    'SELECT role FROM family_members WHERE user_id = ? AND family_id = ?'
  ).bind(userId, familyId).first();
  return member;
}

// Check if user is admin of family
export async function isFamilyAdmin(db, userId, familyId) {
  const member = await isFamilyMember(db, userId, familyId);
  return member && member.role === 'admin';
}

// Set JWT cookies
export function setAuthCookies(token, refreshToken, isLocal = false) {
  const secure = isLocal ? '' : 'Secure; ';
  const cookieOptions = `HttpOnly; ${secure}SameSite=Lax; Path=/`;
  return [
    `token=${token}; ${cookieOptions}; Max-Age=900`,
    `refresh_token=${refreshToken}; ${cookieOptions}; Max-Age=604800`
  ];
}

// Clear auth cookies
export function clearAuthCookies(isLocal = false) {
  const secure = isLocal ? '' : 'Secure; ';
  const cookieOptions = `HttpOnly; ${secure}SameSite=Strict; Path=/; Max-Age=0`;
  return [
    `token=; ${cookieOptions}`,
    `refresh_token=; ${cookieOptions}`
  ];
}

// Rate limiting (simple in-memory, per-worker)
const rateLimitMap = new Map();
export function checkRateLimit(ip, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const key = `${ip}:${Math.floor(now / windowMs)}`;
  const count = rateLimitMap.get(key) || 0;
  if (count >= limit) return false;
  rateLimitMap.set(key, count + 1);
  // Cleanup old entries
  for (const [k] of rateLimitMap) {
    const windowNum = parseInt(k.split(':')[1]);
    if (windowNum < Math.floor(now / windowMs) - 1) rateLimitMap.delete(k);
  }
  return true;
}

// Log activity
export async function logActivity(db, familyId, userId, action, entityType, entityId, entityName, details = null) {
  await db.prepare(
    'INSERT INTO activity_logs (family_id, user_id, action, entity_type, entity_id, entity_name, details) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(familyId, userId, action, entityType, entityId, entityName, details ? JSON.stringify(details) : null).run();
}
