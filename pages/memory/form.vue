<template>
	<view class="page">
		<view class="eyebrow">A MOMENT TO REMEMBER</view><view class="title spaced">把那一天，留下来。</view><view class="subtitle">再平凡的小事，也值得被记得。</view>
		<view class="card section">
			<view class="field"><text class="label">给这段回忆起个名字 *</text><input v-model="form.title" class="input" maxlength="40" placeholder="比如：第一次一起看海" /></view>
			<view class="field"><text class="label">发生在哪一天（选填）</text><picker mode="date" :value="form.date || today" :end="today" @change="form.date = $event.detail.value"><view class="picker">{{ form.date || '日期不详，也没关系' }}</view></picker><button v-if="form.date" class="text-button" @click="form.date = ''">清除日期</button></view>
			<view class="field"><text class="label">当时的故事 *</text><textarea v-model="form.content" class="textarea" maxlength="2000" placeholder="它那时是什么模样？你们做了什么？" /></view>
			<view class="field"><image v-if="form.photo" class="photo" :src="form.photo" mode="aspectFill" /><button class="secondary spaced" :disabled="uploading || saving" @click="selectPhoto">{{ uploading ? '正在保存…' : form.photo ? '换一张照片' : '＋ 添加一张照片' }}</button><button v-if="form.photo" class="text-button danger" @click="form.photo = ''">移除照片</button></view>
			<button class="primary" :loading="saving" :disabled="saving || uploading" @click="save">珍藏这段回忆</button>
		</view>
	</view>
</template>

<script>
import { createMemory } from '../../api/index.js'
import { todayString } from '../../utils/format.js'
import { choosePhoto, showError } from '../../utils/ui.js'

export default {
	data() { return { memorialId: '', saving: false, uploading: false, today: todayString(), form: { title: '', content: '', photo: '', date: '' } } },
	onLoad(query) { this.memorialId = query.memorialId || '' },
	methods: {
		async selectPhoto() {
			if (this.uploading || this.saving) return
			this.uploading = true
			try { this.form.photo = await choosePhoto() } catch (error) { if (!error.errMsg?.includes('cancel')) showError(error) } finally { this.uploading = false }
		},
		async save() {
			if (this.saving || this.uploading) return
			this.saving = true
			try { await createMemory(this.memorialId, this.form); uni.navigateBack() } catch (error) { showError(error) } finally { this.saving = false }
		}
	}
}
</script>
