# 2026-11-05 验证记录

环境：Windows、Node 22.22.3、Vue compiler-sfc 3.5.26、Edge 无头浏览器、390×844。全部使用模拟数据，无真实账号和外部业务服务。源码校验值见同目录 `source-sha256.json`。

## 实际命令

```powershell
node --experimental-default-type=module --test tests/api.test.mjs
node --experimental-vm-modules tests/check-source.mjs 'F:/HBuilderX/project/my-code-test/node_modules/@vue/compiler-sfc'
node tests/preview-server.mjs 'F:/HBuilderX/project/my-code-test/node_modules'
node tests/browser-preview.mjs 'C:/Users/m1879/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright' 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
```

结果：接口 14/14 通过，Vue 7/7 与业务脚本/CSS 通过；浏览器模拟完整流程通过，未出现运行时错误。开发依赖来自本机已有安装，不是应用运行依赖。

Skill 验证采用 bundled `skill-creator/scripts/quick_validate.py`，设置 PYTHONPATH 为本项目 `unpackage/validation/python`，PYTHONUTF8=1，Python 3.12.14，结果 `Skill is valid!`。

## 截图与边界

- `home-preview.png`：访客纪念首页。
- `memorial-preview.png`：公开示例纪念馆。
- `created-memorial-preview.png`：测试新建馆、图文回忆、祭奠和留言。
- `admin-preview.png`：举报下架处理。
- `browser-failure.png`：已修复的旧测试适配器失败现场，保留诊断。

截图是实际源码经浏览器测试适配器渲染后的结果，非微信开发者工具截图。微信分享菜单、原生图片选择、真机输入与布局尚未验收；真实后端、生产鉴权和长期媒体保存未实现；未授权也未执行发布。

## 2026-11-11 · 功能分析与首次源码推送前复核

环境：Windows、Node v22.22.3，复用本机已有 Vue 编译器，不新增依赖。实际执行：

```powershell
node --experimental-default-type=module --test tests/api.test.mjs
node --experimental-vm-modules tests/check-source.mjs 'F:/HBuilderX/project/my-code-test/node_modules/@vue/compiler-sfc'
```

结果：接口 tests 14、pass 14、fail 0；App 与 6 个业务页面编译器检查通过，业务脚本语法与公共样式通过。编译检查产生 Node 实验性 VM Modules 提示，无检查失败。仅操作测试隔离的模拟存储，未请求真实业务服务。

版本对应：对既有 `source-sha256.json` 所列 24 个文件逐个计算 SHA-256，全部匹配。本次未修改业务源码或测试，继续使用该摘要定位受测版本，无数据迁移。浏览器截图仍是 2026-11-05 历史证据，本轮未重跑浏览器，也未执行 HBuilderX/微信开发者工具/真机或用户人工验收。

Git 初始状态：本地原无仓库；远端 main 为 `3ff0aa44366513d9121473f1921730ac687cb611`，仅含 README。项目导入沿用该历史，不强推。最终推送结果在交接记录中更新；GitHub 源码推送与生产发布分别记录。
