import { uploadMedia } from '../api/index.js'

export function showError(error) {
	uni.showToast({ title: error.message || '操作失败，请稍后再试', icon: 'none' })
}

export function confirmAction(content, title = '温馨提示') {
	return new Promise(resolve => uni.showModal({ title, content, confirmColor: '#426a57', success: result => resolve(result.confirm), fail: () => resolve(false) }))
}

export async function choosePhoto() {
	const result = await new Promise((resolve, reject) => uni.chooseImage({ count: 1, sizeType: ['compressed'], success: resolve, fail: reject }))
	const response = await uploadMedia(result.tempFilePaths[0])
	return response.data.url
}

export async function requireLogin() {
	if (await confirmAction('登录后，就可以创建纪念馆、留下思念。当前为本地模拟登录。', '留下一份思念')) {
		uni.switchTab({ url: '/pages/mine/index' })
	}
}
