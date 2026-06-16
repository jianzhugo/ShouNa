const API_BASE = '/api/v1'

const api = {
  async request(method, path, data = null, isFormData = false) {
    const url = `${API_BASE}${path}`
    const options = {
      method,
      credentials: 'same-origin',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    }

    if (data && !isFormData) {
      options.headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(data)
    }

    if (data && isFormData) {
      options.body = data
    }

    let response = await fetch(url, options)

    if (response.status === 401) {
      const refreshed = await this.refreshToken()
      if (refreshed) {
        response = await fetch(url, options)
      } else {
        window.location.href = '/login'
        throw { code: 'UNAUTHORIZED', message: '请重新登录' }
      }
    }

    const json = await response.json()

    if (!response.ok) {
      throw json.error || { code: 'UNKNOWN', message: '请求失败' }
    }

    return json
  },

  async refreshToken() {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      })
      return res.ok
    } catch {
      return false
    }
  },

  get(path) { return this.request('GET', path) },
  post(path, data) { return this.request('POST', path, data) },
  put(path, data) { return this.request('PUT', path, data) },
  del(path) { return this.request('DELETE', path) },
  upload(path, formData) { return this.request('POST', path, formData, true) }
}

export default api
