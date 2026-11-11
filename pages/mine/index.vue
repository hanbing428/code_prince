<template>
	<view class="page">
		<view class="eyebrow">A LITTLE SPACE FOR LOVE</view><view class="title spaced">我的一方小天地</view>
		<view v-if="loading" class="loading">正在加载…</view>
		<view v-else-if="error" class="card empty section"><text>{{ error }}</text><button class="text-button" @click="loadPage">重试</button></view>
		<template v-else>
			<view v-if="!user" class="card section"><view class="row"><view class="avatar">🌿</view><view><view class="section-title">欢迎，念念的朋友</view><view class="muted">让每一份爱，都有地方安放。</view></view></view><button class="primary spaced" :loading="busy" :disabled="busy" @click="signIn('owner')">模拟登录 · 宠物主人</button><button class="secondary spaced" :disabled="busy" @click="signIn('friend')">模拟登录 · 来访亲友</button></view>
			<template v-else>
				<view class="card section"><view class="row"><view class="avatar">🌿</view><view><view class="section-title">{{ user.nickname }}</view><text class="tag">{{ user.role === 'admin' ? '演示管理员' : '每一份爱，都值得被记得' }}</text></view></view><view class="divider"></view><view class="row between"><text>珍藏的纪念馆</text><text class="section-title">{{ memorials.length }}</text></view></view>
				<view class="card section"><view class="label">我的昵称</view><input v-model="nickname" class="input" maxlength="20" placeholder="亲友看到的名字" /><button class="secondary spaced" :disabled="busy" @click="saveProfile">保存昵称</button></view>
				<view class="section"><view class="section-heading"><text class="section-title">我的纪念馆</text><button class="text-button" @click="createPet">＋ 新建</button></view><view class="stack"><view v-for="pet in memorials" :key="pet.id" class="card row between" @click="openPet(pet.id)"><view><view>{{ pet.name }}</view><text class="muted">{{ pet.status === 'active' ? (pet.visibility === 'private' ? '仅自己可见' : '公开纪念馆') : '已下架' }}</text></view><text class="muted">进入 ›</text></view><view v-if="!memorials.length" class="card empty muted">这里等待着属于你们的故事。</view></view></view>
				<button v-if="user.role === 'admin'" class="secondary section" @click="openAdmin">进入内容管理演示</button>
				<view class="section account-actions"><button class="text-button" :disabled="busy" @click="signOut">退出登录</button><button v-if="user.role !== 'admin'" class="text-button danger" :disabled="busy" @click="removeAccount">注销演示账号</button></view>
			</template>
			<view v-if="isMock" class="notice section">当前为本地演示。文字与操作记录保存在这台设备；照片使用本地临时路径，暂不作为长期备份。清理应用缓存会丢失演示数据。</view>
			<button v-if="isMock && (!user || user.role !== 'admin')" class="text-button spaced" :disabled="busy" @click="signIn('admin')">切换到管理演示</button>
			<view class="footer-note">爱有回声，思念有归处。</view>
		</template>
	</view>
</template>

<script>
import { getSession, listMemorials, login, logout, updateProfile, deleteAccount } from '../../api/index.js'
import { apiConfig } from '../../config/index.js'
import { showError, confirmAction } from '../../utils/ui.js'

export default {
	data() { return { user: null, nickname: '', memorials: [], loading: true, busy: false, error: '', isMock: apiConfig.useMock } },
	onShow() { this.loadPage() },
	methods: {
		async loadPage() {
			this.loading = true
			this.error = ''
			try { const [session, memorials] = await Promise.all([getSession(), listMemorials()]); this.user = session.data; this.nickname = session.data?.nickname || ''; this.memorials = memorials.data } catch (error) { this.error = error.message } finally { this.loading = false }
		},
		async signIn(mode) {
			if (this.busy) return
			this.busy = true
			try {
				if (!this.isMock) throw new Error('真实微信登录尚未接入')
				await login({ mode })
				await this.loadPage()
				uni.showToast({ title: '已切换演示身份', icon: 'none' })
			} catch (error) { showError(error) } finally { this.busy = false }
		},
		async saveProfile() {
			if (this.busy) return
			this.busy = true
			try { const { data } = await updateProfile({ nickname: this.nickname }); this.user = data; this.nickname = data.nickname; uni.showToast({ title: '昵称已保存', icon: 'none' }) } catch (error) { showError(error) } finally { this.busy = false }
		},
		async signOut() {
			if (this.busy) return
			this.busy = true
			try { await logout(); await this.loadPage() } catch (error) { showError(error) } finally { this.busy = false }
		},
		async removeAccount() {
			if (this.busy) return
			this.busy = true
			try { if (await confirmAction('注销会删除本地账号及其纪念馆、回忆、留言和祭奠，无法恢复。确定继续吗？', '注销演示账号')) { await deleteAccount(); await this.loadPage() } } catch (error) { showError(error) } finally { this.busy = false }
		},
		openPet(id) { uni.navigateTo({ url: `/pages/memorial/detail?id=${encodeURIComponent(id)}` }) },
		createPet() { uni.navigateTo({ url: '/pages/memorial/form' }) },
		openAdmin() { uni.navigateTo({ url: '/pages/admin/index' }) }
	}
}
</script>

<style scoped>
.account-actions { display: flex; justify-content: center; gap: 48rpx; }
</style>
