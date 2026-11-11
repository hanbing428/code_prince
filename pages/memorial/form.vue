<template>
	<view class="page">
		<view class="title">{{ id ? '整理这份纪念' : '让爱，有迹可循' }}</view>
		<view class="subtitle">慢慢写，不必一次说完所有的想念。</view>
		<view v-if="loading" class="loading">正在加载…</view>
		<view v-else-if="error" class="card empty section"><text>{{ error }}</text><button class="text-button" @click="loadForm">重试</button></view>
		<view v-else class="card section">
			<view class="field"><view class="row"><view class="avatar" @click="selectCover"><image v-if="form.cover" :src="form.cover" mode="aspectFill" /><text v-else>{{ petSymbol(form.species) }}</text></view><view><button class="text-button" :disabled="uploading || saving" @click="selectCover">{{ uploading ? '正在保存照片…' : '选择一张它的照片' }}</button><view class="hint">不选照片，也可以用小小的动物图标</view><button v-if="form.cover" class="text-button danger" @click="form.cover = ''">移除照片</button></view></view></view>
			<view class="field"><text class="label">它的名字 *</text><input v-model="form.name" class="input" maxlength="20" placeholder="那个你叫过无数次的名字" /></view>
			<view class="field"><text class="label">它是 *</text><view class="choice-row"><button v-for="species in speciesList" :key="species" class="choice" :class="{ active: form.species === species }" @click="form.species = species">{{ species }}</button></view></view>
			<view class="field"><text class="label">来到世界的日子（选填）</text><picker mode="date" :end="today" :value="form.birthday || today" @change="form.birthday = $event.detail.value"><view class="picker">{{ form.birthday || '记不清日期，可以留空' }}</view></picker><button v-if="form.birthday" class="text-button" @click="form.birthday = ''">日期不详</button></view>
			<view class="field"><text class="label">轻轻告别的日子（选填）</text><picker mode="date" :end="today" :value="form.passedDate || today" @change="form.passedDate = $event.detail.value"><view class="picker">{{ form.passedDate || '记不清日期，可以留空' }}</view></picker><button v-if="form.passedDate" class="text-button" @click="form.passedDate = ''">日期不详</button></view>
			<view class="field"><text class="label">一句想对它说的话</text><input v-model="form.quote" class="input" maxlength="80" placeholder="谢谢你，曾经来过我的生命。" /></view>
			<view class="field"><text class="label">你们的故事</text><textarea v-model="form.story" class="textarea" maxlength="2000" placeholder="从第一次相遇，或者一个难忘的小习惯开始……" /></view>
			<view class="field"><text class="label">谁可以看见这份纪念</text><view class="choice-row"><button class="choice" :class="{ active: form.visibility === 'private' }" @click="form.visibility = 'private'">仅自己可见</button><button class="choice" :class="{ active: form.visibility === 'public' }" @click="form.visibility = 'public'">公开 · 可以分享</button></view><view class="hint">公开后，获得分享链接的人可以查看照片与故事。</view></view>
			<view class="row between"><view><text class="label">允许亲友留言</text><view class="hint">关闭后，已有留言仍保留</view></view><switch :checked="form.allowMessages" color="#426a57" @change="form.allowMessages = $event.detail.value" /></view>
			<button class="primary form-actions" :loading="saving" :disabled="saving || uploading" @click="save">{{ id ? '保存这份纪念' : '创建纪念馆' }}</button>
		</view>
	</view>
</template>

<script>
import { getMemorial, createMemorial, updateMemorial } from '../../api/index.js'
import { petSymbol, todayString } from '../../utils/format.js'
import { choosePhoto, showError, confirmAction } from '../../utils/ui.js'

export default {
	data() { return { id: '', loading: false, saving: false, uploading: false, error: '', today: todayString(), originalVisibility: 'private', speciesList: ['猫咪', '狗狗', '兔子', '鸟儿', '其他'], form: { name: '', species: '猫咪', birthday: '', passedDate: '', quote: '', story: '', cover: '', visibility: 'private', allowMessages: true } } },
	onLoad(query) { this.id = query.id || ''; if (this.id) this.loadForm() },
	methods: {
		petSymbol,
		async loadForm() {
			this.loading = true
			this.error = ''
			try {
				const { data } = await getMemorial(this.id)
				if (!data.isOwner) throw new Error('只有馆主可以编辑纪念馆')
				for (const key of Object.keys(this.form)) this.form[key] = data[key]
				this.originalVisibility = data.visibility
			} catch (error) { this.error = error.message } finally { this.loading = false }
		},
		async selectCover() {
			if (this.uploading || this.saving) return
			this.uploading = true
			try { this.form.cover = await choosePhoto() } catch (error) { if (!error.errMsg?.includes('cancel')) showError(error) } finally { this.uploading = false }
		},
		async save() {
			if (this.saving || this.uploading) return
			this.saving = true
			try {
				if (this.form.visibility === 'public' && this.originalVisibility !== 'public' && !await confirmAction('公开后，他人可以通过分享查看照片、故事和留言。确定公开吗？', '公开这份纪念')) return
				const { data } = this.id ? await updateMemorial(this.id, this.form) : await createMemorial(this.form)
				if (this.id) uni.navigateBack()
				else uni.redirectTo({ url: `/pages/memorial/detail?id=${encodeURIComponent(data.id)}` })
			} catch (error) { showError(error) } finally { this.saving = false }
		}
	}
}
</script>
