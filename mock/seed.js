export function createSeed() {
	return {
		version: 1,
		sequence: 100,
		sessionId: null,
		users: [
			{ id: 'owner-demo', nickname: '小满的家人', role: 'user', status: 'active' },
			{ id: 'friend-demo', nickname: '一位老朋友', role: 'user', status: 'active' },
			{ id: 'admin-demo', nickname: '演示管理员', role: 'admin', status: 'active' }
		],
		memorials: [
			{ id: 'xiaoman', ownerId: 'owner-demo', name: '小满', species: '猫咪', birthday: '2015-04-12', passedDate: '2025-09-18', quote: '你只是换了一种方式，陪在我身边。', story: '还记得那个下雨的午后，你小小的一团，躲进了我的伞里。从那以后，家里多了一位爱晒太阳、爱把爪子搭在我手上的小朋友。\n\n谢谢你，把平凡的日子变得柔软。窗边的位置，永远为你留着。', cover: '', visibility: 'public', allowMessages: true, status: 'active', createdAt: '2026-10-28T08:00:00.000Z' }
		],
		memories: [
			{ id: 'memory-demo', memorialId: 'xiaoman', authorId: 'owner-demo', title: '窗边的阳光，还是暖暖的', content: '每天下午三点，你都会准时趴在窗边。阳光落在你的胡须上，整个房间都安静下来。那些一起发呆的时光，是我最珍贵的收藏。', photo: '', date: '2024-05-20', createdAt: '2026-10-28T08:00:00.000Z' }
		],
		tributes: [{ id: 'tribute-demo', memorialId: 'xiaoman', authorId: 'friend-demo', type: 'flower', requestId: 'seed-tribute', createdAt: '2026-11-01T08:00:00.000Z' }],
		messages: [{ id: 'message-demo', memorialId: 'xiaoman', authorId: 'friend-demo', content: '小满，愿那边也有暖暖的阳光，和你最爱的小鱼干。', status: 'active', createdAt: '2026-11-01T08:00:00.000Z' }],
		reports: []
	}
}
