const BASE = '/api'

async function request(path, method, body) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // necessário para enviar/receber o cookie httpOnly de auth
  }
  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(BASE + path, options)

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null
  }

  const data = await response.json()

  if (!response.ok) {
    const message = data?.message || ('Erro ' + response.status + ': ' + response.statusText)
    throw new Error(message)
  }

  return Object.prototype.hasOwnProperty.call(data, 'data') ? data.data : data
}

export const api = {
  get:    (path)       => request(path, 'GET'),
  post:   (path, body) => request(path, 'POST',   body),
  put:    (path, body) => request(path, 'PUT',    body),
  patch:  (path, body) => request(path, 'PATCH',  body),
  delete: (path)       => request(path, 'DELETE'),
}

