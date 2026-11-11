<template>
	<view class="page detail-page">
		<view v-if="loading" class="loading">轻轻打开这份回忆…</view>
		<view v-else-if="error" class="card empty"><view class="empty-symbol">🌿</view><view>{{ error }}</view><button class="secondary" @click="goHome">回到纪念首页</button><button class="text-button" @click="loadPage">重新加载</button></view>
		<template v-else-if="pet">
			<view class="memorial-hero">
				<view class="row between"><text class="eyebrow">ALWAYS LOVED</text><text class="tag">{{ pet.visibility === 'private' ? '仅自己可见' : '公开纪念馆' }}</text></view>
				<view class="pet-portrait"><image v-if="pet.cover" :src="pet.cover" mode="aspectFill" @click="preview(pet.cover)" /><text v-else>{{ petSymbol(pet.species) }}</text></view>
				<view class="pet-name">{{ pet.name }}</view><view class="life-dates">{{ formatDate(pet.birthday) }} — {{ formatDate(pet.passedDate) }}</view>
				<view class="pet-quote">{{ pet.quote || '爱过的每一天，都值得被记得。' }}</view>
				<view v-if="pet.passedDate" class="day-counter">想念的第 <text>{{ daysSince(pet.passedDate) }}</text> 天</view>
				<view class="hero-actions"><button v-if="pet.isOwner" class="text-button" @click="editPet">整理纪念馆</button>
					<!-- #ifdef MP-WEIXIN -->
					<button v-if="canShare" class="text-button" open-type="share">分享给亲友 ↗</button>
					<!-- #endif -->
					<!-- #ifndef MP-WEIXIN -->
					<button v-if="canShare" class="text-button" @click="shareHint">分享给亲友 ↗</button>
					<!-- #endif -->
				</view>
			</view>
			<view v-if="pet.status !== 'active'" class="notice spaced">纪念馆已下架，当前仅馆主可查看，暂不能添加内容。</view>
			<view v-if="canShare && isMock" class="notice spaced">本地演示中的新增内容仅保存在当前设备，分享暂不能跨设备查看。</view>
			<view class="tribute-box card section"><view class="section-title">把思念，轻轻放下</view><view class="muted">已经收到 {{ pet.tributeCount }} 份温柔的惦念</view><view class="tribute-actions"><button v-for="action in tributeActions" :key="action.type" :disabled="busy || pet.status !== 'active'" @click="sendTribute(action.type)"><text class="tribute-symbol">{{ action.symbol }}</text><text>{{ action.label }}</text></button></view><view v-if="tributeNotice" class="tribute-feedback">{{ tributeNotice }}</view></view>
			<view class="section"><view class="section-heading"><text class="section-title">关于 {{ pet.name }}</text><text class="muted">{{ pet.ownerName }} 写下</text></view><view class="card paragraph">{{ pet.story || '有些故事，还在慢慢整理。' }}</view></view>
			<view class="section">
				<view class="section-heading"><text class="section-title">时光里的我们</text><button v-if="pet.isOwner && pet.status === 'active'" class="text-button" @click="addMemory">＋ 写回忆</button></view>
				<view v-if="!memories.length" class="card empty"><view class="muted">一张照片，一个片段，都可以从这里开始。</view></view>
				<view v-else class="stack"><view v-for="memory in memories" :key="memory.id" class="card"><view class="muted">{{ formatDate(memory.date) }}</view><view class="memory-title">{{ memory.title }}</view><image v-if="memory.photo" class="photo" :src="memory.photo" mode="aspectFill" @click="preview(memory.photo)" /><view class="paragraph spaced">{{ memory.content }}</view><button v-if="pet.isOwner" class="text-button danger spaced" :disabled="busy" @click="removeMemory(memory.id)">删除这段回忆</button></view></view>
			</view>
			<view class="section">
				<view class="section-heading"><text class="section-title">留一句想念</text><text class="muted">{{ messages.length }} 条留言</text></view>
				<view v-if="pet.allowMessages && pet.status === 'active'" class="card"><textarea v-model="message" class="textarea message-input" maxlength="300" placeholder="愿你在另一个世界，也被温柔以待。" /><view class="row between spaced"><text class="muted">{{ message.length }}/300</text><button class="secondary" :disabled="busy" @click="sendMessage">留下思念</button></view></view>
				<view v-else class="notice">馆主暂时关闭了留言，已有的思念仍在这里。</view>
				<view class="stack spaced"><view v-for="item in messages" :key="item.id" class="card"><view class="row between"><text>{{ item.authorName }}</text><text class="muted">{{ formatDate(item.createdAt) }}</text></view><view class="paragraph spaced">{{ item.content }}</view><view class="row spaced"><button v-if="pet.isOwner || (user && user.id === item.authorId)" class="text-button danger" :disabled="busy" @click="removeMessage(item.id)">删除</button><button class="text-button" :disabled="busy" @click="reportContent('message', item.id)">举报</button></view></view><view v-if="!messages.length" class="muted">还没有留言，思念不必着急说出口。</view></view>
			</view>
			<view v-if="tributes.length" class="section"><view class="section-title">来过的温柔</view><view v-for="item in tributes.slice(0, 5)" :key="item.id" class="tribute-record"><text>{{ item.authorName }} {{ tributeLabel(item.type) }}</text><text class="muted">{{ formatDate(item.createdAt) }}</text></view></view>
			<view class="bottom-actions"><button class="text-button" :disabled="busy" @click="reportContent('memorial', pet.id)">举报纪念馆</button><button v-if="pet.isOwner" class="text-button danger" :disabled="busy" @click="removePet">删除纪念馆</button></view>
			<view class="footer-note">被爱过，就永远不会消失。</view>
		</template>
	</view>
</template>

<script>
import { getSession, getMemorial, listMemories, listMessages, listTributes, createTribute, createMessage, deleteMemory, deleteMessage, deleteMemorial, createReport } from '../../api/index.js'
import { formatDate, daysSince, petSymbol } from '../../utils/format.js'
import { showError, confirmAction, requireLogin } from '../../utils/ui.js'
import { apiConfig } from '../../config/index.js'

export default {
	data() { return { id: '', user: null, pet: null, memories: [], messages: [], tributes: [], loading: true, error: '', busy: false, message: '', tributeNotice: '', isMock: apiConfig.useMock, tributeActions: [{ type: 'flower', symbol: '🌼', label: '献一束花' }, { type: 'light', symbol: '🕯️', label: '点一盏灯' }, { type: 'miss', symbol: '🤍', label: '我想你了' }] } },
	computed: { canShare() { return this.pet?.visibility === 'public' && this.pet?.status === 'active' } },
	onLoad(query) { this.id = query.id || '' },
	onShow() { this.loadPage() },
	onShareAppMessage() {
		return this.canShare ? { title: `和我一起，记得${this.pet.name}`, path: `/pages/memorial/detail?id=${encodeURIComponent(this.id)}` } : { title: '念念 · 为爱留一份纪念', path: '/pages/index/index' }
	},
	methods: {
		formatDate, daysSince, petSymbol,
		async loadPage() {
			this.loading = true
			this.error = ''
			try {
				const [session, pet, memories, messages, tributes] = await Promise.all([getSession(), getMemorial(this.id), listMemories(this.id), listMessages(this.id), listTributes(this.id)])
				this.user = session.data
				this.pet = pet.data
				this.memories = memories.data
				this.messages = messages.data
				this.tributes = tributes.data
			} catch (error) { this.pet = null; this.error = error.message } finally {
				this.loading = false
				// 私密状态不暴露纪念馆分享菜单；访问权限仍由接口再次检查。
				// #ifdef MP-WEIXIN
				if (this.canShare) uni.showShareMenu({ menus: ['shareAppMessage'] })
				else uni.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
				// #endif
			}
		},
		goHome() { uni.switchTab({ url: '/pages/index/index' }) },
		editPet() { uni.navigateTo({ url: `/pages/memorial/form?id=${encodeURIComponent(this.id)}` }) },
		addMemory() { uni.navigateTo({ url: `/pages/memory/form?memorialId=${encodeURIComponent(this.id)}` }) },
		preview(url) { uni.previewImage({ urls: [url] }) },
		shareHint() { uni.showModal({ title: '分享这份纪念', content: '微信小程序中可分享给亲友。当前为本地演示，新增内容只保存在这台设备，暂不能跨设备访问。', showCancel: false }) },
		tributeLabel(type) { return { flower: '送来了一束花', light: '点亮了一盏灯', miss: '留下了一份思念' }[type] },
		async sendTribute(type) {
			if (this.busy) return
			if (!this.user) return requireLogin()
			this.busy = true
			try {
				await createTribute(this.id, { type, requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}` })
				this.tributeNotice = '这份思念，已经轻轻送达。'
				await this.loadPage()
			} catch (error) { showError(error) } finally { this.busy = false }
		},
		async sendMessage() {
			if (this.busy) return
			if (!this.user) return requireLogin()
			this.busy = true
			try { await createMessage(this.id, this.message); this.message = ''; await this.loadPage() } catch (error) { showError(error) } finally { this.busy = false }
		},
		async removeMemory(id) { await this.removeContent(() => deleteMemory(id), '删除后，这段回忆和照片将从纪念馆移除。') },
		async removeMessage(id) { await this.removeContent(() => deleteMessage(id), '确定删除这条留言吗？') },
		async removeContent(action, content) {
			if (this.busy) return
			this.busy = true
			try { if (await confirmAction(content)) { await action(); await this.loadPage() } } catch (error) { showError(error) } finally { this.busy = false }
		},
		async removePet() {
			if (this.busy) return
			this.busy = true
			try { if (await confirmAction('纪念馆、照片回忆、祭奠和留言记录都会删除，无法恢复。确定继续吗？', '删除纪念馆')) { await deleteMemorial(this.id); this.goHome() } } catch (error) { showError(error) } finally { this.busy = false }
		},
		async reportContent(targetType, targetId) {
			if (this.busy) return
			if (!this.user) return requireLogin()
			this.busy = true
			try {
				const reasons = ['不适当的内容', '侵犯隐私或冒用', '广告或骚扰']
				const selection = await new Promise((resolve, reject) => uni.showActionSheet({ itemList: reasons, success: resolve, fail: reject }))
				await createReport({ targetType, targetId, reason: reasons[selection.tapIndex] })
				uni.showToast({ title: '已记录举报', icon: 'none' })
			} catch (error) { if (!error.errMsg?.includes('cancel')) showError(error) } finally { this.busy = false }
		}
	}
}
</script>

<style scoped>
.memorial-hero { text-align: center; background: linear-gradient(160deg, #eef0df, #f9f6ec); border-radius: 30rpx; padding: 26rpx 30rpx 18rpx; }
.pet-portrait { display: flex; align-items: center; justify-content: center; width: 200rpx; height: 200rpx; background: #e6e8d5; border: 10rpx solid #fffdf3; border-radius: 50%; font-size: 116rpx; overflow: hidden; margin: 36rpx auto 20rpx; }
.pet-portrait image { width: 100%; height: 100%; }
.pet-name { font-size: 48rpx; letter-spacing: 6rpx; font-weight: 600; }
.life-dates { color: #929a88; font-size: 23rpx; margin-top: 8rpx; }
.pet-quote { margin: 24rpx 0; font-size: 28rpx; white-space: pre-wrap; overflow-wrap: break-word; }
.day-counter { color: #859078; font-size: 24rpx; }
.day-counter text { font-size: 44rpx; color: #66815d; padding: 0 8rpx; }
.hero-actions { display: flex; justify-content: center; gap: 36rpx; margin-top: 20rpx; }
.tribute-box { text-align: center; }
.tribute-actions { display: flex; justify-content: space-around; margin-top: 28rpx; }
.tribute-actions button { display: flex; flex-direction: column; background: transparent; font-size: 24rpx; line-height: 1.8; color: #76836e; padding: 8rpx 10rpx; }
.tribute-symbol { font-size: 50rpx; margin-bottom: 10rpx; }
.tribute-feedback { color: #648460; font-size: 23rpx; margin-top: 24rpx; }
.memory-title { font-size: 31rpx; margin: 10rpx 0 20rpx; font-weight: 500; }
.message-input { height: 160rpx; }
.tribute-record { display: flex; justify-content: space-between; gap: 14rpx; padding: 20rpx 0; border-bottom: 1rpx solid #e5e8dc; font-size: 24rpx; }
.bottom-actions { display: flex; justify-content: center; gap: 40rpx; margin-top: 50rpx; }
</style>
