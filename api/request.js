import { apiConfig } from '../config/index.js'
import { endpoints } from './endpoints.js'
import { handleMockRequest } from '../mock/handler.js'

export function getRequestOptions(action, data = {}) {
	const endpoint = endpoints[action]
	if (!endpoint) throw new Error('未定义的接口')
	const payload = { ...data }
	const url = endpoint[1].replace(/:([a-zA-Z]+)/g, (_, key) => {
		if (!payload[key]) throw new Error('缺少接口资源编号')
		const value = encodeURIComponent(payload[key])
		delete payload[key]
		return value
	})
	return { method: endpoint[0], url, data: payload }
}

function readResponse(response) {
	let body = response.data
	if (typeof body === 'string') {
		try { body = JSON.parse(body) } catch { throw new Error('服务返回格式不正确') }
	}
	if (response.statusCode < 200 || response.statusCode >= 300 || body?.error) {
		const error = new Error(body?.error?.message || '请求失败，请稍后重试')
		error.code = body?.error?.code || 'REQUEST_FAILED'
		throw error
	}
	if (!body || !Object.prototype.hasOwnProperty.call(body, 'data')) throw new Error('服务返回格式不正确')
	return body
}

export async function request(action, data = {}) {
	const options = getRequestOptions(action, data)
	if (apiConfig.useMock) return handleMockRequest(action, data)
	if (!/^https:\/\//.test(apiConfig.baseUrl)) throw new Error('尚未配置后端 HTTPS 地址')
	// 真实登录后由后端返回会话令牌，页面不自行拼装鉴权信息。
	const token = uni.getStorageSync('petApiToken')
	const header = token ? { Authorization: `Bearer ${token}` } : {}
	const response = await new Promise((resolve, reject) => {
		const common = {
			url: apiConfig.baseUrl.replace(/\/$/, '') + options.url,
			header,
			timeout: apiConfig.timeout,
			success: resolve,
			fail: () => reject(new Error('网络连接失败，请稍后重试'))
		}
		if (action === 'uploadMedia') {
			uni.uploadFile({ ...common, filePath: data.filePath, name: 'file' })
		} else {
			uni.request({ ...common, method: options.method, data: options.data })
		}
	})
	const result = readResponse(response)
	if (action === 'login' && result.data?.token) uni.setStorageSync('petApiToken', result.data.token)
	if (action === 'logout' || action === 'deleteAccount') uni.removeStorageSync('petApiToken')
	return result
}
