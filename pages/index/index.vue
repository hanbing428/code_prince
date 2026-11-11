<template>
	<view class="page">
		<view class="eyebrow">FOREVER IN OUR HEARTS</view>
		<view class="intro">
			<view class="title"><view>有些陪伴，</view><view>从未走远。</view></view>
			<view class="subtitle">把来不及说的想念，安放在这里。</view>
			<view class="sun-scene"><view class="sun"></view><view class="hill hill-back"></view><view class="hill"></view><text class="scene-pet">🐈</text><text class="spark">✦</text></view>
		</view>
		<view class="welcome card">
			<view class="row between"><view><view class="section-title">为它留一盏灯</view><view class="muted">一个名字，一段故事，一份长久的爱。</view></view><text class="welcome-flower">❀</text></view>
			<button class="primary spaced" @click="startMemorial">创建纪念馆 <text class="button-arrow">＋</text></button>
		</view>
		<view class="section">
			<view class="section-heading"><text class="section-title">我的纪念</text><text class="muted">{{ memorials.length }} 份珍藏</text></view>
			<view v-if="loading" class="loading">正在找回这份想念…</view>
			<view v-else-if="error" class="card empty"><text>{{ error }}</text><button class="text-button" @click="loadPage">重新加载</button></view>
			<view v-else-if="!memorials.length" class="card empty"><view class="empty-symbol">🌱</view><view>让回忆，有一个可以回来的地方</view><view class="muted">{{ user ? '从它的名字开始，慢慢写下你们的故事。' : '登录后，收藏属于你们的温柔时光。' }}</view></view>
			<view v-else class="stack">
				<view v-for="pet in memorials" :key="pet.id" class="card" @click="openMemorial(pet.id)">
					<view class="row"><view class="avatar"><image v-if="pet.cover" :src="pet.cover" mode="aspectFill" /><text v-else>{{ petSymbol(pet.species) }}</text></view><view class="pet-summary"><view class="row between"><text class="section-title">{{ pet.name }}</text><text class="tag">{{ pet.visibility === 'private' ? '私密' : '公开' }}</text></view><view class="muted">{{ pet.passedDate ? '想念的第 ' + daysSince(pet.passedDate) + ' 天' : '爱不需要用日期衡量' }}</view><view class="muted">{{ pet.tributeCount }} 次思念 · {{ pet.memoryCount }} 段回忆</view></view><text class="muted">›</text></view>
				</view>
			</view>
		</view>
		<view v-if="example" class="sample" @click="openMemorial(example.id)"><view><text class="tag">纪念馆示例</text><view class="sample-title">{{ example.name }}的纪念馆</view><view class="muted">看一看，思念可以是什么模样。</view></view><text class="sample-pet">🐾</text></view>
		<view class="footer-note">念念不忘 · 温柔回响</view>
	</view>
</template>

<script>
import { getSession, listMemorials, getExampleMemorial } from '../../api/index.js'
import { daysSince, petSymbol } from '../../utils/format.js'
import { requireLogin } from '../../utils/ui.js'

export default {
	data() { return { user: null, memorials: [], example: null, loading: true, error: '' } },
	onShow() { this.loadPage() },
	methods: {
		daysSince, petSymbol,
		async loadPage() {
			this.loading = true
			this.error = ''
			try {
				const [session, memorials, example] = await Promise.all([getSession(), listMemorials(), getExampleMemorial()])
				this.user = session.data
				this.memorials = memorials.data
				this.example = example.data
			} catch (error) { this.error = error.message } finally { this.loading = false }
		},
		openMemorial(id) { uni.navigateTo({ url: `/pages/memorial/detail?id=${encodeURIComponent(id)}` }) },
		startMemorial() {
			if (!this.user) return requireLogin()
			uni.navigateTo({ url: '/pages/memorial/form' })
		}
	}
}
</script>

<style scoped>
.intro { position: relative; padding: 28rpx 0 56rpx; overflow: hidden; }
.intro .title { position: relative; z-index: 1; }
.intro .subtitle { max-width: 390rpx; position: relative; z-index: 1; }
.sun-scene { position: absolute; right: -18rpx; bottom: 20rpx; width: 270rpx; height: 245rpx; overflow: hidden; border-radius: 160rpx 160rpx 35rpx 35rpx; background: #eeefe0; }
.sun { position: absolute; width: 80rpx; height: 80rpx; border-radius: 50%; background: #e9d6a4; top: 30rpx; left: 50rpx; }
.hill { position: absolute; width: 370rpx; height: 160rpx; border-radius: 50%; background: #bbc7a8; bottom: -85rpx; left: -35rpx; transform: rotate(-12deg); }
.hill-back { background: #d1d8bd; bottom: -33rpx; left: 40rpx; transform: rotate(20deg); }
.scene-pet { position: absolute; font-size: 78rpx; bottom: 28rpx; right: 60rpx; }
.spark { position: absolute; color: #9aab87; right: 28rpx; top: 50rpx; }
.welcome { position: relative; background: #fffef8; }
.welcome-flower { font-size: 60rpx; color: #b9c7a2; }
.welcome .muted { font-size: 23rpx; margin-top: 10rpx; }
.button-arrow { float: right; color: #bccfbd; }
.pet-summary { flex: 1; min-width: 0; }
.sample { display: flex; justify-content: space-between; align-items: center; padding: 30rpx; background: #ecede2; border-radius: 24rpx; margin-top: 32rpx; }
.sample .tag { background: #e0e6d5; }
.sample-title { font-size: 29rpx; margin: 14rpx 0 6rpx; }
.sample-pet { font-size: 52rpx; opacity: .5; }
</style>
