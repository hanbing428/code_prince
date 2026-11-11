# 测试与验收

## 自动验证

2026-11-05，Windows，Node v22.22.3。受测业务源码摘要见 `docs/evidence/source-sha256.json`。模拟模式开启、无数据库迁移、无真实网络接口调用。

1. `node --experimental-default-type=module --test tests/api.test.mjs`
   - 14 项通过：访客读写、跨身份私密访问、公开转私密、日期和必填校验、祭奠幂等、回忆归属、留言开关/删除、管理权限、账号限制、纪念馆/账号删除级联、路由编码、mock 零真实请求。
2. `node --experimental-vm-modules tests/check-source.mjs "<包含 compiler-sfc 的模块目录>"`
   - 使用本机已安装的 `@vue/compiler-sfc` 3.5.26，7 个 Vue 文件（App + 6 页）、业务脚本和公共 CSS 通过。未增加项目运行依赖。
3. `node tests/preview-server.mjs "<含 vue 与 @vue/compiler-sfc 的 node_modules>"`
   - 浏览器适配预览地址：`http://127.0.0.1:4175`。这是测试适配器，不是 uni-app H5 构建结果。
   - 再运行 `node tests/browser-preview.mjs "<playwright 模块路径>" "<浏览器可执行文件路径>"`。
   - Edge 无头浏览器，390×844：访客浏览、模拟登录、私密建馆、选图回忆、献花点灯、留言、公开设置、亲友权限、举报和管理下架通过，无运行时错误。截图已目视检查。
4. Skill 使用 `skill-creator/scripts/quick_validate.py` 验证通过。校验依赖 PyYAML 6.0.3 仅装在忽略的 `unpackage/validation/python`，Python 3.12.14；不是应用依赖。

本机 Vue 模块来源：`F:/HBuilderX/project/my-code-test/node_modules`（只读复用）。自动检查不依赖该项目业务代码；换机器后传入等价安装路径。完整命令和结果见 `docs/evidence/verification.md`。

失败与修正记录：首次 Skill 依赖安装遇到 pip 缓存权限及 Python 3.15 缺少 C++ 编译环境，改用已安装 Python 3.12 二进制 wheel 后通过。首次浏览器测试遇到适配器 favicon 404 与按钮可访问名称空格差异，修正测试适配器后全流程通过；旧失败截图保留用于诊断，不代表当前页面。

## 人工验收清单

2026-11-11 复核：Windows、Node v22.22.3，重新运行上述接口测试和编译器检查，分别 14/14、7/7 通过，业务脚本语法与公共样式通过。24 个文件与 `docs/evidence/source-sha256.json` 的既有摘要全部匹配，业务源码未修改。本轮未重跑浏览器适配器，未执行 HBuilderX、微信开发者工具或真机检查。复核详情见 `docs/evidence/verification.md`。

- 首页 → 模拟登录 → 新建纪念馆 → 添加回忆 → 献花/点灯 → 留言 → 编辑隐私 → 分享。
- 退出后打开私密馆应被拒绝；公开馆可读，写入需登录。
- 未知日期、日期先后错误、重复提交、关闭留言、删除确认。
- 管理演示中的举报处理、下架恢复、账号限制。
- HBuilderX 编译、微信开发者工具布局与分享菜单、真机图片选择与输入框体验。

上述微信/HBuilderX及用户人工验收全部待验。已完成的浏览器适配器检查不能证明微信小程序、真实后端或生产发布通过。
