import test from 'node:test'
import assert from 'node:assert/strict'
import { createMockHandler, storageKey } from '../mock/handler.js'
import { getRequestOptions, request } from '../api/request.js'
import { daysSince } from '../utils/format.js'

function createContext() {
	const cache = new Map()
	const handler = createMockHandler({ get: key => cache.get(key), set: (key, value) => cache.set(key, value) })
	return { call: async (action, data) => (await handler(action, data)).data, cache }
}

const validPet = { name: '团团', species: '狗狗', birthday: '', passedDate: '', visibility: 'private' }

test('访客可以读公开示例，不能写入或读取他人的纪念列表', async () => {
	const { call } = createContext()
	assert.equal(await call('getSession'), null)
	assert.equal((await call('getMemorial', { id: 'xiaoman' })).name, '小满')
	assert.deepEqual(await call('listMemorials'), [])
	await assert.rejects(call('createMemorial', validPet), { code: 'UNAUTHORIZED' })
	await assert.rejects(call('createTribute', { memorialId: 'xiaoman', type: 'flower', requestId: 'visitor' }), { code: 'UNAUTHORIZED' })
	await assert.rejects(call('createMessage', { memorialId: 'xiaoman', content: '想念' }), { code: 'UNAUTHORIZED' })
})

test('创建默认私密，未知日期可保存，跨身份不能读取私密馆及所有子资源', async () => {
	const { call } = createContext()
	await call('login', { mode: 'owner' })
	const pet = await call('createMemorial', { name: '团团', species: '狗狗' })
	assert.equal(pet.visibility, 'private')
	assert.equal(pet.passedDate, '')
	assert.equal((await call('listMemorials')).length, 2)
	await call('login', { mode: 'friend' })
	for (const action of ['getMemorial', 'listMemories', 'listMessages', 'listTributes']) {
		await assert.rejects(call(action, { id: pet.id, memorialId: pet.id }), { code: 'FORBIDDEN' })
	}
	await assert.rejects(call('updateMemorial', { id: pet.id, name: '篡改' }), { code: 'FORBIDDEN' })
	await assert.rejects(call('deleteMemorial', { id: pet.id }), { code: 'FORBIDDEN' })
})

test('公开转私密后旧分享入口失效，首页示例不泄露私密状态', async () => {
	const { call } = createContext()
	await call('login', { mode: 'owner' })
	assert.ok(await call('getExampleMemorial'))
	await call('updateMemorial', { id: 'xiaoman', visibility: 'private' })
	assert.equal(await call('getExampleMemorial'), null)
	await call('logout')
	await assert.rejects(call('getMemorial', { id: 'xiaoman' }), { code: 'FORBIDDEN' })
})

test('校验日期、必填字段和字数，失败不落库', async () => {
	const { call } = createContext()
	await call('login', { mode: 'owner' })
	for (const patch of [{ name: ' ' }, { name: '字'.repeat(21) }, { birthday: '2025-02-30' }, { birthday: '2099-01-01' }, { birthday: '2025-03-02', passedDate: '2025-03-01' }, { species: '未知' }]) {
		await assert.rejects(call('createMemorial', { ...validPet, ...patch }), { code: 'VALIDATION_ERROR' })
	}
	assert.equal((await call('listMemorials')).length, 1)
	assert.equal(daysSince('2025-03-01', new Date(2025, 2, 2, 0, 1)), 1)
	assert.equal(daysSince(''), null)
})

test('祭奠按用户和请求编号幂等，不接受相同编号的不同动作', async () => {
	const { call } = createContext()
	await call('login', { mode: 'friend' })
	const payload = { memorialId: 'xiaoman', type: 'flower', requestId: 'same-request' }
	const results = await Promise.all([call('createTribute', payload), call('createTribute', payload)])
	assert.equal(results[0].id, results[1].id)
	assert.equal((await call('listTributes', { memorialId: 'xiaoman' })).length, 2)
	await assert.rejects(call('createTribute', { ...payload, type: 'light' }), { code: 'VALIDATION_ERROR' })
})

test('只有馆主可新增删除回忆，上传通过模拟接口返回本地路径', async () => {
	const { call } = createContext()
	await call('login', { mode: 'owner' })
	const media = await call('uploadMedia', { filePath: '/tmp/pet-photo.jpg' })
	const memory = await call('createMemory', { memorialId: 'xiaoman', title: '海边', content: '一起看海', date: '', photo: media.url })
	await call('login', { mode: 'friend' })
	await assert.rejects(call('createMemory', { memorialId: 'xiaoman', title: '测试', content: '测试' }), { code: 'FORBIDDEN' })
	await assert.rejects(call('deleteMemory', { id: memory.id }), { code: 'FORBIDDEN' })
	await call('login', { mode: 'owner' })
	await call('deleteMemory', { id: memory.id })
	assert.equal((await call('listMemories', { memorialId: 'xiaoman' })).length, 1)
})

test('留言开关、空内容校验与删除权限生效', async () => {
	const { call } = createContext()
	await call('login', { mode: 'owner' })
	const ownerMessage = await call('createMessage', { memorialId: 'xiaoman', content: '想你' })
	await call('login', { mode: 'friend' })
	await assert.rejects(call('deleteMessage', { id: ownerMessage.id }), { code: 'FORBIDDEN' })
	await assert.rejects(call('createMessage', { memorialId: 'xiaoman', content: '  ' }), { code: 'VALIDATION_ERROR' })
	const friendMessage = await call('createMessage', { memorialId: 'xiaoman', content: '晚安' })
	await call('deleteMessage', { id: friendMessage.id })
	await call('login', { mode: 'owner' })
	await call('updateMemorial', { id: 'xiaoman', allowMessages: false })
	await call('deleteMessage', { id: 'message-demo' })
	await call('login', { mode: 'friend' })
	await assert.rejects(call('createMessage', { memorialId: 'xiaoman', content: '晚安' }), { code: 'VALIDATION_ERROR' })
	assert.equal((await call('listMessages', { memorialId: 'xiaoman' })).length, 1)
})

test('举报处理和内容下架只对管理员开放，下架后读写受限且可恢复', async () => {
	const { call } = createContext()
	await call('login', { mode: 'friend' })
	const report = await call('createReport', { targetType: 'message', targetId: 'message-demo', reason: '检查内容' })
	await assert.rejects(call('listReports'), { code: 'FORBIDDEN' })
	await assert.rejects(call('moderateMemorial', { id: 'xiaoman', status: 'hidden' }), { code: 'FORBIDDEN' })
	await call('login', { mode: 'admin' })
	assert.equal((await call('listReports')).length, 1)
	await call('moderateMessage', { id: 'message-demo', status: 'hidden' })
	await call('resolveReport', { id: report.id })
	assert.equal((await call('listReports'))[0].status, 'resolved')
	assert.equal((await call('listMessages', { memorialId: 'xiaoman' })).length, 0)
	await call('moderateMemorial', { id: 'xiaoman', status: 'hidden' })
	await call('login', { mode: 'friend' })
	await assert.rejects(call('getMemorial', { id: 'xiaoman' }), { code: 'NOT_FOUND' })
	await call('login', { mode: 'owner' })
	assert.equal((await call('getMemorial', { id: 'xiaoman' })).status, 'hidden')
	await assert.rejects(call('createMessage', { memorialId: 'xiaoman', content: '尝试写入' }), { code: 'FORBIDDEN' })
	await call('login', { mode: 'admin' })
	await call('moderateMemorial', { id: 'xiaoman', status: 'active' })
	await call('logout')
	assert.equal((await call('getMemorial', { id: 'xiaoman' })).status, 'active')
})

test('被限制账号不能登录，恢复后可登录，普通资料更新不能提权', async () => {
	const { call } = createContext()
	await call('login', { mode: 'friend' })
	assert.equal((await call('updateProfile', { nickname: '朋友', role: 'admin' })).role, 'user')
	await call('login', { mode: 'admin' })
	await call('moderateUser', { id: 'friend-demo', status: 'hidden' })
	await assert.rejects(call('login', { mode: 'friend' }), { code: 'FORBIDDEN' })
	await call('moderateUser', { id: 'friend-demo', status: 'active' })
	assert.equal((await call('login', { mode: 'friend' })).nickname, '朋友')
})

test('删除纪念馆级联清理回忆、留言、祭奠和举报', async () => {
	const { call, cache } = createContext()
	await call('login', { mode: 'owner' })
	await call('createReport', { targetType: 'message', targetId: 'message-demo', reason: '测试' })
	await call('deleteMemorial', { id: 'xiaoman' })
	const state = cache.get(storageKey)
	for (const key of ['memorials', 'memories', 'messages', 'tributes', 'reports']) assert.equal(state[key].length, 0)
	assert.equal(await call('getExampleMemorial'), null)
	await assert.rejects(call('getMemorial', { id: 'xiaoman' }), { code: 'NOT_FOUND' })
})

test('注销清理账号和归属内容，后续模拟登录不恢复已删除内容', async () => {
	const { call } = createContext()
	await call('login', { mode: 'owner' })
	await call('deleteAccount')
	assert.equal(await call('getSession'), null)
	await call('login', { mode: 'owner' })
	assert.deepEqual(await call('listMemorials'), [])
	assert.equal(await call('getExampleMemorial'), null)
})

test('接口路由编码资源编号且保持原请求数据', () => {
	const payload = { id: 'a/b', name: '新名字' }
	assert.deepEqual(getRequestOptions('updateMemorial', payload), { method: 'PUT', url: '/memorials/a%2Fb', data: { name: '新名字' } })
	assert.equal(payload.id, 'a/b')
})

test('亲友注销清理其留言相关举报，不影响馆主和其他回忆', async () => {
	const { call, cache } = createContext()
	await call('login', { mode: 'owner' })
	await call('createReport', { targetType: 'message', targetId: 'message-demo', reason: '测试举报' })
	await call('login', { mode: 'friend' })
	await call('deleteAccount')
	const state = cache.get(storageKey)
	assert.equal(state.reports.length, 0)
	assert.equal(state.messages.length, 0)
	assert.equal(state.memorials.length, 1)
	assert.equal(state.memories.length, 1)
})

test('默认请求经过 mock，不调用真实网络', async () => {
	const cache = new Map()
	globalThis.uni = {
		getStorageSync: key => cache.get(key),
		setStorageSync: (key, value) => cache.set(key, value),
		request: () => assert.fail('不应调用真实请求'),
		uploadFile: () => assert.fail('不应调用真实上传')
	}
	try {
		assert.equal((await request('getSession')).data, null)
		await request('login', { mode: 'owner' })
		assert.equal((await request('uploadMedia', { filePath: '/tmp/photo.jpg' })).data.url, '/tmp/photo.jpg')
	} finally { delete globalThis.uni }
})
