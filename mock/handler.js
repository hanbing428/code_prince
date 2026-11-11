import { createSeed } from './seed.js'
import { todayString } from '../utils/format.js'

export const storageKey = 'petMemorialMockV1'

function fail(message, code = 'VALIDATION_ERROR') {
	const error = new Error(message)
	error.code = code
	throw error
}

function cleanText(value, label, max, required = false) {
	const text = typeof value === 'string' ? value.trim() : ''
	if (required && !text) fail(`请填写${label}`)
	if (text.length > max) fail(`${label}不能超过${max}个字`)
	return text
}

function checkDate(value) {
	if (!value) return ''
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) fail('日期格式不正确')
	const date = new Date(`${value}T00:00:00Z`)
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value || value > todayString()) fail('请选择有效且不晚于今天的日期')
	return value
}

function memorialFields(data) {
	const birthday = checkDate(data.birthday)
	const passedDate = checkDate(data.passedDate)
	if (birthday && passedDate && birthday > passedDate) fail('离世日期不能早于生日')
	if (!['猫咪', '狗狗', '兔子', '鸟儿', '其他'].includes(data.species)) fail('请选择宠物种类')
	if (!['private', 'public'].includes(data.visibility)) fail('请选择可见范围')
	return {
		name: cleanText(data.name, '宠物名字', 20, true), species: data.species, birthday, passedDate,
		quote: cleanText(data.quote, '纪念寄语', 80), story: cleanText(data.story, '故事', 2000),
		cover: cleanText(data.cover, '照片路径', 4000000), visibility: data.visibility, allowMessages: data.allowMessages !== false
	}
}

export function createMockHandler(storage) {
	return async function handleRequest(action, data = {}) {
		// 每次读取并复制状态，只有成功操作才提交，校验失败不改变缓存。
		const saved = storage.get(storageKey)
		if (saved && saved.version !== 1) fail('本地演示数据版本不兼容，请先备份后处理', 'STORAGE_VERSION')
		const state = saved ? JSON.parse(JSON.stringify(saved)) : createSeed()
		const actor = state.users.find(user => user.id === state.sessionId && user.status === 'active') || null
		const now = () => new Date().toISOString()
		const nextId = prefix => `${prefix}-${++state.sequence}`
		const find = (list, id) => list.find(item => item.id === id) || fail('内容不存在或已删除', 'NOT_FOUND')
		const requireUser = () => actor || fail('请先登录', 'UNAUTHORIZED')
		const requireAdmin = () => {
			if (requireUser().role !== 'admin') fail('需要管理员权限', 'FORBIDDEN')
		}
		const requireOwner = memorial => {
			if (requireUser().id !== memorial.ownerId) fail('只有馆主可以管理这份纪念', 'FORBIDDEN')
		}
		const readMemorial = id => {
			const memorial = find(state.memorials, id)
			if (memorial.status !== 'active' && actor?.id !== memorial.ownerId) fail('纪念馆暂不可访问', 'NOT_FOUND')
			if (memorial.visibility !== 'public' && actor?.id !== memorial.ownerId) fail('这是一个私密纪念馆', 'FORBIDDEN')
			return memorial
		}
		const writableMemorial = id => {
			requireUser()
			const memorial = readMemorial(id)
			if (memorial.status !== 'active') fail('纪念馆已下架，暂不能添加内容', 'FORBIDDEN')
			return memorial
		}
		const withAuthor = item => ({ ...item, authorName: state.users.find(user => user.id === item.authorId)?.nickname || '已注销用户' })
		const detail = memorial => ({ ...memorial, isOwner: actor?.id === memorial.ownerId, ownerName: state.users.find(user => user.id === memorial.ownerId)?.nickname || '家人', memoryCount: state.memories.filter(item => item.memorialId === memorial.id).length, tributeCount: state.tributes.filter(item => item.memorialId === memorial.id).length })
		const removeMemorial = id => {
			const messageIds = state.messages.filter(item => item.memorialId === id).map(item => item.id)
			state.memorials = state.memorials.filter(item => item.id !== id)
			for (const key of ['memories', 'tributes', 'messages']) state[key] = state[key].filter(item => item.memorialId !== id)
			state.reports = state.reports.filter(item => !(item.targetType === 'memorial' && item.targetId === id) && !(item.targetType === 'message' && messageIds.includes(item.targetId)))
		}
		let result
		switch (action) {
			case 'getSession': result = actor; break
			case 'login': {
				// 仅 mock 分支允许演示身份；生产登录接口必须使用微信登录凭证。
				const mode = data.mode || 'owner'
				if (!['owner', 'friend', 'admin'].includes(mode)) fail('无效的演示身份')
				const id = { owner: 'owner-demo', friend: 'friend-demo', admin: 'admin-demo' }[mode]
				let user = state.users.find(item => item.id === id)
				if (!user) {
					user = { id, nickname: '新的纪念者', role: mode === 'admin' ? 'admin' : 'user', status: 'active' }
					state.users.push(user)
				}
				if (user.status !== 'active') fail('当前账号已被限制', 'FORBIDDEN')
				state.sessionId = id
				result = user
				break
			}
			case 'logout': state.sessionId = null; result = null; break
			case 'updateProfile': requireUser(); actor.nickname = cleanText(data.nickname, '昵称', 20, true); result = actor; break
			case 'deleteAccount': {
				requireUser()
				if (actor.role === 'admin') fail('请使用普通演示账号体验注销')
				state.memorials.filter(item => item.ownerId === actor.id).forEach(item => removeMemorial(item.id))
				const deletedMessageIds = state.messages.filter(item => item.authorId === actor.id).map(item => item.id)
				for (const key of ['messages', 'memories', 'tributes']) state[key] = state[key].filter(item => item.authorId !== actor.id)
				state.reports = state.reports.filter(item => item.authorId !== actor.id && !(item.targetType === 'message' && deletedMessageIds.includes(item.targetId)))
				state.users = state.users.filter(item => item.id !== actor.id)
				state.sessionId = null
				result = null
				break
			}
			case 'listMemorials': result = state.memorials.filter(item => item.ownerId === actor?.id).map(detail).reverse(); break
			case 'getExampleMemorial': {
				const item = state.memorials.find(item => item.id === 'xiaoman' && item.visibility === 'public' && item.status === 'active')
				result = item ? { id: item.id, name: item.name, quote: item.quote } : null
				break
			}
			case 'getMemorial': result = detail(readMemorial(data.id)); break
			case 'createMemorial': {
				requireUser()
				const item = { ...memorialFields({ visibility: 'private', ...data }), id: nextId('memorial'), ownerId: actor.id, status: 'active', createdAt: now() }
				state.memorials.push(item)
				result = detail(item)
				break
			}
			case 'updateMemorial': {
				const item = find(state.memorials, data.id)
				requireOwner(item)
				Object.assign(item, memorialFields({ ...item, ...data }))
				result = detail(item)
				break
			}
			case 'deleteMemorial': requireOwner(find(state.memorials, data.id)); removeMemorial(data.id); result = null; break
			case 'listMemories': readMemorial(data.memorialId); result = state.memories.filter(item => item.memorialId === data.memorialId).sort((a, b) => b.date.localeCompare(a.date)); break
			case 'createMemory': {
				requireOwner(writableMemorial(data.memorialId))
				const item = { id: nextId('memory'), memorialId: data.memorialId, authorId: actor.id, title: cleanText(data.title, '回忆标题', 40, true), content: cleanText(data.content, '回忆', 2000, true), photo: cleanText(data.photo, '照片路径', 4000000), date: checkDate(data.date), createdAt: now() }
				state.memories.push(item)
				result = item
				break
			}
			case 'deleteMemory': {
				const item = find(state.memories, data.id)
				requireOwner(find(state.memorials, item.memorialId))
				state.memories = state.memories.filter(memory => memory.id !== data.id)
				result = null
				break
			}
			case 'listTributes': readMemorial(data.memorialId); result = state.tributes.filter(item => item.memorialId === data.memorialId).map(withAuthor).reverse(); break
			case 'createTribute': {
				writableMemorial(data.memorialId)
				if (!['flower', 'light', 'miss'].includes(data.type)) fail('请选择纪念方式')
				const requestId = cleanText(data.requestId, '请求编号', 100, true)
				const previous = state.tributes.find(item => item.requestId === requestId && item.authorId === actor.id)
				if (previous && (previous.memorialId !== data.memorialId || previous.type !== data.type)) fail('请求编号已用于其他操作')
				result = previous || { id: nextId('tribute'), memorialId: data.memorialId, authorId: actor.id, type: data.type, requestId, createdAt: now() }
				if (!previous) state.tributes.push(result)
				break
			}
			case 'listMessages': readMemorial(data.memorialId); result = state.messages.filter(item => item.memorialId === data.memorialId && item.status === 'active').map(withAuthor).reverse(); break
			case 'createMessage': {
				const memorial = writableMemorial(data.memorialId)
				if (!memorial.allowMessages) fail('馆主暂时关闭了留言')
				result = { id: nextId('message'), memorialId: data.memorialId, authorId: actor.id, content: cleanText(data.content, '留言', 300, true), status: 'active', createdAt: now() }
				state.messages.push(result)
				result = withAuthor(result)
				break
			}
			case 'deleteMessage': {
				requireUser()
				const item = find(state.messages, data.id)
				const memorial = readMemorial(item.memorialId)
				if (actor.id !== item.authorId && actor.id !== memorial.ownerId) fail('不能删除他人的留言', 'FORBIDDEN')
				state.messages = state.messages.filter(message => message.id !== data.id)
				state.reports = state.reports.filter(report => report.targetType !== 'message' || report.targetId !== data.id)
				result = null
				break
			}
			case 'createReport': {
				requireUser()
				if (!['memorial', 'message'].includes(data.targetType)) fail('不支持的举报类型')
				const target = data.targetType === 'memorial' ? readMemorial(data.targetId) : find(state.messages, data.targetId)
				if (data.targetType === 'message') readMemorial(target.memorialId)
				result = { id: nextId('report'), authorId: actor.id, targetType: data.targetType, targetId: target.id, reason: cleanText(data.reason, '举报原因', 200, true), status: 'pending', createdAt: now() }
				state.reports.push(result)
				break
			}
			case 'uploadMedia': requireUser(); result = { url: cleanText(data.filePath, '图片', 4000000, true) }; break
			case 'listReports': requireAdmin(); result = state.reports.map(withAuthor).reverse(); break
			case 'resolveReport': requireAdmin(); result = find(state.reports, data.id); result.status = 'resolved'; break
			case 'listAdminMemorials': requireAdmin(); result = state.memorials.map(detail); break
			case 'listAdminMessages': requireAdmin(); result = state.messages.map(withAuthor); break
			case 'listUsers': requireAdmin(); result = state.users; break
			case 'moderateMemorial':
			case 'moderateMessage':
			case 'moderateUser': {
				requireAdmin()
				if (!['active', 'hidden'].includes(data.status)) fail('无效状态')
				const list = { moderateMemorial: state.memorials, moderateMessage: state.messages, moderateUser: state.users }[action]
				result = find(list, data.id)
				if (action === 'moderateUser' && result.role === 'admin') fail('不能限制管理员账号')
				result.status = data.status
				break
			}
			default: fail('模拟接口尚未实现', 'NOT_IMPLEMENTED')
		}
		storage.set(storageKey, state)
		return { data: JSON.parse(JSON.stringify(result)) }
	}
}

export function handleMockRequest(action, data) {
	const handler = createMockHandler({
		get: key => uni.getStorageSync(key),
		set: (key, value) => uni.setStorageSync(key, value)
	})
	return handler(action, data)
}
