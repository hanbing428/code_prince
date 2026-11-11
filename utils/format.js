export function formatDate(value) {
	return value ? value.slice(0, 10).replace(/-/g, '.') : '日期不详'
}

export function daysSince(value, today = new Date()) {
	if (!value) return null
	const parts = value.split('-').map(Number)
	const start = Date.UTC(parts[0], parts[1] - 1, parts[2])
	const end = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
	return Math.max(0, Math.floor((end - start) / 86400000))
}

export function todayString() {
	const date = new Date()
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function petSymbol(species) {
	return { 猫咪: '🐈', 狗狗: '🐕', 兔子: '🐇', 鸟儿: '🕊️', 其他: '🐾' }[species] || '🐾'
}
