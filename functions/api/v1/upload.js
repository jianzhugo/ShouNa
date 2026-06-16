import { getAuthUser, isFamilyMember, jsonResponse, errorResponse } from './utils';

export async function onRequestPost(context) {
  const { request, env } = context;

  const user = await getAuthUser(request, env);
  if (!user) return errorResponse('UNAUTHORIZED', '未登录', 401);

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const familyId = formData.get('family_id');

    if (!file) return errorResponse('MISSING_FILE', '请选择要上传的文件');
    if (!familyId) return errorResponse('MISSING_FAMILY', '缺少家庭参数');

    const member = await isFamilyMember(env.DB, user.id, familyId);
    if (!member) return errorResponse('FORBIDDEN', '无权访问该家庭', 403);

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'jpg';
    const key = `${familyId}/${timestamp}_${random}.${ext}`;

    // Upload to R2
    await env.BUCKET.put(key, file.stream());

    return jsonResponse({ data: { url: key } }, 201);
  } catch (err) {
    console.error('Upload error:', err);
    return errorResponse('SERVER_ERROR', '上传失败', 500);
  }
}
