<template>
	<view class="page">
		<view class="title">守护这一份温柔</view><view class="subtitle">内容与举报管理</view>
		<view v-if="loading" class="loading">正在加载管理数据…</view>
		<view v-else-if="error" class="card empty section"><view>{{ error }}</view><button class="text-button" @click="loadPage">重新加载</button></view>
		<template v-else>
			<view class="notice section">本地管理演示，操作仅改变本机数据。真实内容审核与管理员认证尚未接入。</view>
			<view class="choice-row section"><button v-for="tab in tabs" :key="tab.key" class="choice" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.label }}</button></view>
			<view v-if="activeTab === 'reports'" class="stack section"><view v-for="item in reports" :key="item.id" class="card"><view class="row between"><text>{{ item.reason }}</text><text class="tag">{{ item.status === 'pending' ? '待处理' : '已处理' }}</text></view><view class="muted spaced">{{ item.targetType === 'memorial' ? '纪念馆' : '留言' }} · {{ item.targetId }}</view><view class="muted">{{ item.authorName }} · {{ formatDate(item.createdAt) }}</view><view class="paragraph spaced">{{ reportPreview(item) }}</view><view class="row spaced"><button v-if="item.status === 'pending'" class="text-button danger" :disabled="busy" @click="hideReported(item)">下架对应内容</button><button v-if="item.status === 'pending'" class="text-button" :disabled="busy" @click="resolve(item.id)">标记已处理</button></view></view><view v-if="!reports.length" class="card empty muted">暂无举报，愿这里一直温柔。</view></view>
			<view v-if="activeTab === 'memorials'" class="stack section"><view v-for="item in memorials" :key="item.id" class="card"><view class="row between"><text class="section-title">{{ item.name }}</text><text class="tag">{{ item.status === 'active' ? '正常' : '已下架' }}</text></view><view class="muted">{{ item.ownerName }} · {{ item.visibility === 'private' ? '私密' : '公开' }}</view><view class="paragraph spaced">{{ item.story || item.quote || '暂无故事' }}</view><image v-if="item.cover" class="photo spaced" :src="item.cover" mode="aspectFill" /><button class="text-button spaced" :disabled="busy" @click="changeStatus('memorial', item)">{{ item.status === 'active' ? '下架纪念馆' : '恢复纪念馆' }}</button></view><view v-if="!memorials.length" class="card empty muted">暂无纪念馆</view></view>
			<view v-if="activeTab === 'messages'" class="stack section"><view v-for="item in messages" :key="item.id" class="card"><view class="row between"><text>{{ item.authorName }}</text><text class="tag">{{ item.status === 'active' ? '正常' : '已下架' }}</text></view><view class="paragraph spaced">{{ item.content }}</view><view class="muted">纪念馆：{{ item.memorialId }}</view><button class="text-button spaced" :disabled="busy" @click="changeStatus('message', item)">{{ item.status === 'active' ? '下架留言' : '恢复留言' }}</button></view><view v-if="!messages.length" class="card empty muted">暂无留言</view></view>
			<view v-if="activeTab === 'users'" class="stack section"><view v-for="item in users" :key="item.id" class="card"><view class="row between"><text>{{ item.nickname }}</text><text class="tag">{{ item.status === 'active' ? '正常' : '已限制' }}</text></view><view class="muted">{{ item.role === 'admin' ? '管理员' : '普通用户' }} · {{ item.id }}</view><button v-if="item.role !== 'admin'" class="text-button spaced" :disabled="busy" @click="changeStatus('user', item)">{{ item.status === 'active' ? '限制账号' : '恢复账号' }}</button></view></view>
		</template>
	</view>
</template>

<script>
import { listReports, resolveReport, listAdminMemorials, moderateMemorial, listAdminMessages, moderateMessage, listUsers, moderateUser } from '../../api/index.js'
import { formatDate } from '../../utils/format.js'
import { showError, confirmAction } from '../../utils/ui.js'

export default {
	data() { return { loading: true, busy: false, error: '', reports: [], memorials: [], messages: [], users: [], activeTab: 'reports', tabs: [{ key: 'reports', label: '举报' }, { key: 'memorials', label: '纪念馆' }, { key: 'messages', label: '留言' }, { key: 'users', label: '用户' }] } },
	onShow() { this.loadPage() },
	methods: {
		formatDate,
		async loadPage() {
			this.loading = true
			this.error = ''
			try { const results = await Promise.all([listReports(), listAdminMemorials(), listAdminMessages(), listUsers()]); [this.reports, this.memorials, this.messages, this.users] = results.map(result => result.data) } catch (error) { this.error = error.message } finally { this.loading = false }
		},
		reportPreview(report) {
			const target = (report.targetType === 'memorial' ? this.memorials : this.messages).find(item => item.id === report.targetId)
			return target ? (target.content || `${target.name}：${target.story || target.quote}`) : '内容已删除'
		},
		async resolve(id) { await this.applyChange(() => resolveReport(id), '确认已检查并处理这条举报？') },
		async hideReported(report) {
			await this.applyChange(async () => {
				await (report.targetType === 'memorial' ? moderateMemorial : moderateMessage)(report.targetId, 'hidden')
				await resolveReport(report.id)
			}, '下架被举报的内容，并标记该举报为已处理？')
		},
		async changeStatus(type, item) {
			const actions = { memorial: moderateMemorial, message: moderateMessage, user: moderateUser }
			const status = item.status === 'active' ? 'hidden' : 'active'
			await this.applyChange(() => actions[type](item.id, status), status === 'hidden' ? '确认限制该账号或下架该内容？' : '确认恢复该账号或内容？')
		},
		async applyChange(action, message) {
			if (this.busy) return
			this.busy = true
			try { if (await confirmAction(message)) { await action(); await this.loadPage() } } catch (error) { showError(error) } finally { this.busy = false }
		}
	}
}
</script>
