# Spice Atlas Split View Helper 0.8.2

The application stays v0.8.0. This optional Manifest V3 helper uses protocol 2 to open and close approved image-search partners beside a local Atlas tab.

## Update and use

1. Exit an old split before updating Atlas in place.
2. In Chrome/Edge extension management, reload the existing helper from the installed Atlas folder's browser_helper directory. For first installation only, enable developer mode and Load unpacked.
3. Confirm helper 0.8.2, then refresh Atlas (Ctrl+F5). Use the same browser where the helper is installed.
4. Restricted Google/Baidu sources open or reuse the helper-owned partner. Switching to Commons, Bing, an embeddable source or reading mode closes that partner and restores the Atlas layout. A Close split view button is also available.
5. When this Edge does not expose the automatic API, Atlas says so explicitly and provides a source-tab link. Edge's built-in manual split feature does not imply an extension can invoke it. Other browsers are accepted only when their actual API exists.

Current documented tabs split APIs offer creation and unsplitting, without a pane-ratio parameter. The helper cannot set 2:1 automatically; drag the browser divider. Atlas instead automatically collapses its catalogue during a split. The catalogue can be shown, hidden or resized independently.

## Lifecycle and access

The bridge registers at document_start, announces readiness and validates a real recent action for opening. The worker validates the top-level MessageSender URL, creates matching adjacent tabs and verifies their split IDs. Open/close operations are queued per Atlas tab. Closing explicitly unsplits, removes only the recorded helper partner and verifies the resulting state. Tab events synchronize manual browser changes.

The helper retains only its paired-tab IDs in session storage. Reloading/updating a helper can invalidate earlier ownership records; exit an old split before upgrading. Unrelated user splits and moved partners are preserved.

Permissions remain storage plus local 127.0.0.1/localhost hosts. No remote page content access, header changes, verification bypass, global browsing-history access or automatic installation. An embedded application window cannot use an extension installed in a separate browser.

Validation uses controlled browser APIs and actual page/bridge/worker code; browser layout QA uses labelled synthetic content. Native helper 0.8.2 installation and Windows Chrome/Edge splitting were not exercised in this environment.

References: [Chrome tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [Edge split policy](https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/SplitScreenEnabled), [review 4](../docs/V08_REVIEW4.zh-CN.md).

## 中文说明

应用仍为 v0.8.0，助手为 **0.8.2**。

- 升级前先退出旧分屏，停止服务并原位更新；在扩展管理页重新加载原助手，确认 0.8.2，再强制刷新图鉴。继续引用原安装目录中的 browser_helper，不使用临时下载目录。
- Google／百度等受限来源会自动打开或复用助手自己的右侧原站页；切回 Commons／Bing、可内嵌来源或阅读模式会收回该分屏并关闭来源页，也可直接点击“关闭分屏”。
- Edge 若没有向扩展提供自动接口，页面会明确说明“安装助手也无法自动唤醒”，仅提供有效的新标签原站入口；可用 Edge 工具栏手动分屏。根据真实检测结果启用，不只看浏览器版本。
- 原生分屏比例暂不能通过当前公开接口自动设为 2∶1，可拖动浏览器分隔线。图鉴分屏时默认收起目录，退出恢复；顶部按钮可随时开关目录，普通桌面可拖动目录边缘调宽。
- 只收回当前助手记录的配对，不关闭不相关的用户分屏；扩展重新加载后，旧配对可能需手动退出一次。本轮 API 回归及合成布局检查通过，真实 Windows 浏览器仍需本机验收。
