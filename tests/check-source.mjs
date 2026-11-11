import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

// 使用已安装的 Vue 编译器做定向检查，不引入项目运行依赖。
const compilerPath = process.argv[2]
if (!compilerPath) throw new Error('请传入 @vue/compiler-sfc 的目录或模块路径')
const require = createRequire(import.meta.url)
const compiler = require(compilerPath)
const root = fileURLToPath(new URL('../', import.meta.url))
const pages = JSON.parse(fs.readFileSync(path.join(root, 'pages.json'), 'utf8')).pages
const files = ['App.vue', ...pages.map(page => `${page.path}.vue`)]
for (const file of files) {
	const source = fs.readFileSync(path.join(root, file), 'utf8')
	const { descriptor, errors } = compiler.parse(source, { filename: file })
	if (errors.length) throw new Error(`${file}: ${errors.join('\n')}`)
	if (descriptor.script) compiler.compileScript(descriptor, { id: file })
	if (descriptor.template) {
		const result = compiler.compileTemplate({ source: descriptor.template.content, filename: file, id: file })
		if (result.errors.length) throw new Error(`${file}: ${result.errors.join('\n')}`)
	}
	for (const style of descriptor.styles) {
		const result = compiler.compileStyle({ source: style.content, filename: file, id: 'data-v-test', scoped: style.scoped })
		if (result.errors.length) throw new Error(`${file}: ${result.errors.join('\n')}`)
	}
	console.log(`PASS ${file}`)
}
for (const dir of ['api', 'mock', 'utils', 'config']) {
	for (const file of fs.readdirSync(path.join(root, dir))) {
		if (!file.endsWith('.js')) continue
		new vm.SourceTextModule(fs.readFileSync(path.join(root, dir, file), 'utf8'))
	}
}
const css = compiler.compileStyle({ source: fs.readFileSync(path.join(root, 'styles/common.css'), 'utf8'), filename: 'common.css', id: 'global' })
if (css.errors.length) throw new Error(css.errors.join('\n'))
console.log(`PASS ${files.length} 个 Vue 文件、业务脚本语法与公共样式`)
