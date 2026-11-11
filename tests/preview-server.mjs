import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

// 此适配器仅用于浏览器检查实际 Vue 页面，不代替 uni-app 编译与微信真机验收。
const require = createRequire(import.meta.url)
const moduleRoot = process.argv[2]
if (!moduleRoot) throw new Error('请传入包含 vue 和 @vue/compiler-sfc 的 node_modules 路径')
const compiler = require(path.join(moduleRoot, '@vue/compiler-sfc'))
const root = fileURLToPath(new URL('../', import.meta.url))
const routes = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'), 'utf8')).pages
function forBrowser(source) {
	return source.replace(/<!-- #ifdef MP-WEIXIN -->[\s\S]*?<!-- #endif -->/g, '').replace(/\/\/ #ifdef MP-WEIXIN[\s\S]*?\/\/ #endif/g, '')
}
function compilePage(file) {
	const source = forBrowser(fs.readFileSync(file, 'utf8'))
	const { descriptor } = compiler.parse(source, { filename: file })
	const script = descriptor.script.content.replace('export default', 'const page =')
	const template = compiler.compileTemplate({ source: descriptor.template.content.replace(/<image\b/g, '<img').replace(/<\/image>/g, ''), id: file, filename: file, compilerOptions: { isCustomElement: tag => ['view', 'text'].includes(tag) } }).code.replace(/from "vue"/g, 'from "/vendor/vue"')
	const style = descriptor.styles.map(item => item.content).join('\n').replace(/\bimage\b/g, 'img').replace(/(\d*\.?\d+)rpx/g, (_, value) => `${Number(value) / 2}px`)
	return `${script}\n${template}\npage.render = render; page.previewStyle = ${JSON.stringify(style)}; export default page;`
}
const html = `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>念念 · 前端演示</title><link rel="stylesheet" href="/common.css"><style>
[hidden]{display:none!important}body{margin:0;padding:45px 0 58px}view{display:block}text{display:inline}button{display:block;border:0;font-family:inherit;cursor:pointer}input,textarea{font-family:inherit}button[disabled]{cursor:default}img{object-fit:cover}#nav{position:fixed;inset:0 0 auto;height:45px;background:#f7f6f0;z-index:10;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600}#back{position:absolute;left:14px;background:none;color:#426a57;font-size:24px}#tabs{position:fixed;inset:auto 0 0;background:#fffef9;display:flex;height:58px;border-top:1px solid #eceee2;z-index:10}#tabs button{flex:1;background:none;color:#426a57;font-size:15px}.dialog-mask{position:fixed;inset:0;background:#0005;z-index:30;display:flex;align-items:center;justify-content:center}.dialog{background:#fffef9;border-radius:18px;padding:24px;width:290px;max-height:80vh;overflow:auto}.dialog h3{margin:0 0 12px;font-size:18px}.dialog p{font-size:14px;white-space:pre-wrap}.dialog button{padding:12px 18px;color:#426a57;background:#e8ede3;margin:10px 10px 0 0}.toast{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:12px 22px;background:#35483dee;color:white;border-radius:12px;z-index:50;font-size:14px;max-width:85vw}.preview-image{width:100%}switch{display:inline-block}
</style><style id="page-style"></style></head><body><header id="nav"><button id="back">‹</button><span id="nav-title"></span></header><main id="app"></main><footer id="tabs"><button data-route="/pages/index/index">纪念</button><button data-route="/pages/mine/index">我的</button></footer><script type="module">
import { createApp, h } from '/vendor/vue'
const routes = ${JSON.stringify(routes)}
let app
let stack = []
function dialog(title, content, labels, callback) {
	const mask = document.createElement('div'); mask.className = 'dialog-mask'
	const box = document.createElement('div'); box.className = 'dialog'
	const heading = document.createElement('h3'); heading.textContent = title
	const text = document.createElement('p'); text.textContent = content
	box.append(heading, text)
	labels.forEach((label, index) => { const button = document.createElement('button'); button.textContent = label; button.onclick = () => { mask.remove(); callback(index) }; box.append(button) })
	mask.append(box); document.body.append(mask)
}
async function navigate(url, mode = 'push') {
	if(mode === 'tab') stack = [url]; else if(mode === 'replace') stack[stack.length-1] = url; else if(mode === 'back') { stack.pop(); url = stack.at(-1) || '/pages/index/index' } else stack.push(url)
	const parsed = new URL(url, location.origin)
	const route = routes.find(item => '/' + item.path === parsed.pathname)
	if (!route) throw new Error('未知页面：' + parsed.pathname)
	const page = (await import(parsed.pathname + '.vue')).default
	app?.unmount()
	document.querySelector('#page-style').textContent = page.previewStyle
	document.querySelector('#nav-title').textContent = route.style.navigationBarTitleText
	document.querySelector('#back').hidden = stack.length < 2
	document.querySelector('#tabs').style.display = ['/pages/index/index','/pages/mine/index'].includes(parsed.pathname) ? 'flex' : 'none'
	app = createApp(page)
	app.component('picker', { props: ['value', 'end'], emits: ['change'], render() { return h('label', { style:'display:block' }, [this.$slots.default?.(), h('input', { type:'date', value:this.value, max:this.end, style:'width:100%;padding:8px;margin-top:4px', onChange:event => this.$emit('change', { detail:{ value:event.target.value } }) })]) } })
	app.component('switch', { props: ['checked'], emits: ['change'], render() { return h('input', { type:'checkbox', checked:this.checked, style:'width:24px;height:24px;accent-color:#426a57', onChange:event => this.$emit('change', { detail:{ value:event.target.checked } }) }) } })
	const instance = app.mount('#app')
	page.onLoad?.call(instance, Object.fromEntries(parsed.searchParams))
	page.onShow?.call(instance)
	window.scrollTo(0,0)
	history.replaceState(null, '', '/#' + url)
}
window.uni = {
	getStorageSync:key => JSON.parse(localStorage.getItem(key) || 'null'),
	setStorageSync:(key,value) => localStorage.setItem(key,JSON.stringify(value)),
	removeStorageSync:key => localStorage.removeItem(key),
	navigateTo:({url}) => navigate(url), redirectTo:({url}) => navigate(url,'replace'), switchTab:({url}) => navigate(url,'tab'), navigateBack:() => navigate('', 'back'),
	showModal:options => dialog(options.title,options.content,options.showCancel === false ? ['知道了'] : ['取消','确定'],index => options.success?.({confirm:options.showCancel === false || index === 1,cancel:index === 0})),
	showActionSheet:options => dialog('选择原因','',[...options.itemList,'取消'],index => index === options.itemList.length ? options.fail?.({errMsg:'cancel'}) : options.success?.({tapIndex:index})),
	showToast:({title}) => { const toast=document.createElement('div');toast.className='toast';toast.textContent=title;document.body.append(toast);setTimeout(()=>toast.remove(),1800) },
	chooseImage:options => {const input=document.createElement('input');input.type='file';input.accept='image/*';input.onchange=()=>{const reader=new FileReader();reader.onload=()=>options.success({tempFilePaths:[reader.result]});reader.readAsDataURL(input.files[0])};input.oncancel=()=>options.fail({errMsg:'cancel'});input.click()},
	previewImage:({urls})=>{dialog('照片','',['关闭'],()=>{});const img=document.createElement('img');img.src=urls[0];img.className='preview-image';document.querySelector('.dialog').prepend(img)},
	showShareMenu:()=>{}, hideShareMenu:()=>{}
}
document.querySelector('#back').onclick=()=>navigate('','back')
document.querySelectorAll('[data-route]').forEach(button=>button.onclick=()=>navigate(button.dataset.route,'tab'))
navigate(location.hash.slice(1) || '/pages/index/index','tab')
</script></body></html>`

const server = http.createServer((req, res) => {
	try {
		const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
		let content, type = 'text/javascript; charset=utf-8'
		if (url === '/') { content = html; type = 'text/html; charset=utf-8' }
		else if (url === '/vendor/vue') content = fs.readFileSync(path.join(moduleRoot, 'vue/dist/vue.esm-browser.js'))
		else if (url === '/favicon.ico') { res.writeHead(204); res.end(); return }
		else if (url === '/common.css') { content = fs.readFileSync(path.join(root, 'styles/common.css'), 'utf8').replace(/^page\s*\{/g, 'body {').replace(/(\d*\.?\d+)rpx/g, (_, value) => `${Number(value) / 2}px`); type = 'text/css; charset=utf-8' }
		else if (/^\/(pages|api|mock|utils|config)\/[\w/-]+\.(vue|js)$/.test(url)) {
			const file = path.join(root, url)
			content = url.endsWith('.vue') ? compilePage(file) : fs.readFileSync(file)
		} else { res.writeHead(404); res.end(); return }
		res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' })
		res.end(content)
	} catch (error) { console.error(error); res.writeHead(500); res.end('预览编译失败') }
})
server.listen(4175, '127.0.0.1', () => console.log('前端预览：http://127.0.0.1:4175（非 uni-app 编译结果）'))
