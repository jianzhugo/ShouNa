export async function onRequestGet(context) {
  const { env, params } = context;

  try {
    const key = params.key;
    if (!key) {
      return new Response('Not found', { status: 404 });
    }

    const object = await env.BUCKET.get(key);
    if (!object) {
      return new Response('Not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Cache-Control', 'public, max-age=31536000');
    headers.set('ETag', object.httpEtag);

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('Serve photo error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
