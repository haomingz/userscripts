# Plex 中文番剧 MAL 匹配助手

让 Plex 中的中文番剧标题能够找到 MyAnimeList（MAL）条目，并辅助 [MAL-Sync](https://github.com/MALSync/MALSync) 完成关联。脚本可独立展示 MAL 地址；观看进度同步仍由 MAL-Sync 负责。

## 安装

1. 安装 Tampermonkey。
2. 打开仓库中的 [`Plex Chinese MAL Helper.user.js`](./Plex%20Chinese%20MAL%20Helper.user.js)，复制全部内容到 Tampermonkey 的新建脚本中，保存。
3. 同时使用 MAL-Sync 时，先按其 [Plex 配置说明](https://github.com/MALSync/MALSync/wiki/Emby-Plex) 配置。建议将动画库名称设为 `Anime`，并确认 MAL-Sync 已登录 MAL。
4. 刷新 Plex 网页，打开番剧的季详情或播放页面，左下角会出现“中文番剧 → MAL”面板。

脚本默认匹配 `https://app.plex.tv/*`、`http://localhost:32400/web/*` 和 `http://127.0.0.1:32400/web/*`。

若使用局域网 IP、自定义端口或反向代理域名，请在 Tampermonkey 脚本设置的“用户匹配”中加入自己的 Plex 地址，例如 `https://plex.example.com/*`。也可在脚本头部增加对应 `@match`。同时为 MAL-Sync 配置同一个自定义域名。建议使用精确的 Plex 地址。

## 使用

- **自动匹配**：唯一精确命中的条目有 MAL ID 时，会保存关联；同名条目可用已知年份区分。简体、繁体、日文原名、英文别名均可参与匹配。
- **候选确认**：相似匹配、多条同名结果、Plex 第 2 季及后续季、特别篇、缺少季数的元数据，均需核对候选后点击“关联此条目”。年份和类型会显示在候选旁。
- **手动搜索**：自动读取不到标题时，直接输入中文、日文或英文标题。更换搜索关键词后需手动选择结果，避免新关键词自动覆盖当前作品。
- **补查 MAL**：数据集里没有 MAL ID 的候选可点击“查找 MAL 候选”，通过 Jikan 搜索；结果需手动确认。
- **手动关联**：输入 MAL 动画 ID（如 `52991`）或 `https://myanimelist.net/anime/52991`。脚本通过 Jikan 核对 ID 并读取 MAL 标准标题，成功后保存。接口不可用时可以使用已有数据集候选中的 MAL 地址。
- **复制与纠正**：已关联的条目提供“复制 MAL 地址”“复制匹配标题”和“填入 MAL-Sync”。
- **取消关联**：删除本助手保存的当前关联。MAL-Sync 自己已保存的关联需要在其纠正窗口修改。

可以收起面板，或通过 Tampermonkey 菜单重新展开。“唯一精确匹配时自动关联”和“为 MAL-Sync 提供匹配标题”可分别关闭。

## 与 MAL-Sync 的配合方式

新版 MAL-Sync 的 Plex 适配器从元数据响应读取标题，并用 `parentRatingKey` 标识季。因此，**只修改页面文字或插入一个 MAL 链接，并不会让 MAL-Sync 自动识别这个链接**。

本脚本在收到 MAL-Sync 的 `malsync-xhr` 事件后提取原始番剧信息；已有确认映射时，在原始事件处理完毕后发送带有匹配标题的元数据副本，避免依赖两个脚本的监听器注册顺序。季详情和单集播放都使用完整的 MAL 标题，避免拼接中文“第 N 季”导致再次搜索失败。不会修改原始事件、Plex 的真实接口响应、服务器媒体库、集数或标识符。首次关联时优先通过 Jikan 获取 MAL 的标准标题；查询失败则使用数据集中的英文名或日文原名。

MAL-Sync 可能已缓存旧的搜索结果，或当前正在等待你选择条目。此时：

1. 打开 MAL-Sync 的纠正/关联窗口。
2. 在本助手中点击“填入 MAL-Sync”。
3. 核对其 `URL` 字段，再点击 **MAL-Sync 自己的 Update 按钮**。

本助手支持纠正窗口的开放 Shadow DOM，只填写 URL，不自动点击 Update。窗口尚未打开、窗口没有 URL 输入框或结构变化时，会复制地址供你粘贴。首次搜索的“Action required”窗口可能只有搜索框，可以复制匹配标题后搜索并选择条目，或打开完整纠正窗口再填 URL。

事件辅助基于 2026-10-09 检查到的官方源码接口，涉及以下文件：

- [Plex 适配器](https://github.com/MALSync/MALSync/blob/master/src/pages-chibi/implementations/Plex/main.ts)
- [元数据事件代理](https://github.com/MALSync/MALSync/blob/master/src/pages-chibi/proxies/requestProxy.ts)
- [纠正窗口](https://github.com/MALSync/MALSync/blob/master/src/_provider/Search/correctionApp.vue)

旧版本、浏览器脚本隔离或未来接口变化可能影响事件辅助。复制 MAL 地址及手动关联仍可使用。启用脚本前已加载的元数据不会被补抓，安装后请刷新页面并重新打开季详情。

## 分季与缓存

Plex 的季数与 MAL 条目经常不是一一对应：同一作品可能按半年番、后半篇、OVA 或特别篇拆分。脚本保留标题中的季数、剧场版和 OVA 信息；不会把 Plex Season 2 自动视为某个 MAL 续作。第 0 季特别篇也需要手动确认。一个 Plex 季内部同时包含多个 MAL 条目时，需要在 MAL-Sync 中配置其关联规则或集数偏移。

映射按 **网页来源、Plex 服务器、剧集 ID、季数** 分开保存。同一季不同集数可复用，另一季或另一服务器不会继承。缺少季数时按该季的 Plex ID 隔离。整部剧详情与各季也分别保存；只有页面文字、没有元数据时，关联按页面 ID 保存。完全手动搜索按当前页面和关键词保存。

番剧数据首次使用时下载，缓存 7 天；更新失败时继续使用旧缓存并提示。点击“更新番剧数据”可强制刷新。脚本只持有最近 100 条元数据记录，页面切换后会清空候选；旧页面的异步搜索结果不能写到新页面。

## 数据与隐私

| 来源 | 用途 | 何时请求 |
| --- | --- | --- |
| [bangumi-data](https://github.com/bangumi-data/bangumi-data) | 中文、繁体、英文别名，日文原名，年份及 MAL/Bangumi ID | 首次匹配、缓存过期或手动更新 |
| [Jikan](https://docs.api.jikan.moe/) | 核对 MAL ID、读取标准标题、补查 MAL 候选 | 首次确认关联、手动关联或补查候选 |

中文标题匹配在浏览器中完成，不把你的中文媒体库标题发送到搜索服务。点击补查候选时，会发送该候选的英文或日文搜索标题。网络请求使用 `GM_xmlhttpRequest` 的匿名模式，不需要 API Key。

配置、数据缓存及关联都保存在本脚本的 Tampermonkey 存储中。脚本不提取或保存 Plex Token、不请求 Plex 服务器，也不写 MAL-Sync 的私有存储或 MAL 账号；观察到的元数据请求 URL 会去除查询参数，只保留路径。页面上的标题和外部数据以文本节点显示。

标题数据来自 **bangumi-data**，遵循其 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 许可。仓库不内嵌该完整数据集，运行时从其官方仓库获取。

## 常见问题

**没有自动读到标题**：确认 MAL-Sync 已运行且动画库名称符合其要求，刷新后打开季详情或播放页。如果只有剧集总览、MAL-Sync 未运行或事件不可访问，可直接输入标题搜索。

**已经显示 MAL 地址，MAL-Sync 仍搜索失败**：使用纠正窗口的 URL 字段完成关联。标题辅助不能清除 MAL-Sync 已有的错误映射缓存。

**中文译名搜不到**：换一个中文译名，或输入日文/英文标题。bangumi-data 的覆盖范围有限，未收录作品、国创作品及新番可能需要手动输入 MAL ID。

**Jikan 请求失败或提示 429**：稍后重试。已有数据集 MAL 地址仍可复制；首次取得的数据集也会缓存。已有确认映射无需再次联网获取标准标题。

**切换集数后看不到关联**：元数据中的剧集 ID、季数缺失时只能按页面保存。若 Plex 元数据完整，同一服务器同一季应复用关联。

## 开发验证

无构建步骤、无运行时 npm 依赖。使用 Node.js 18 或更新版本运行核心测试：

```powershell
node --check "plex/Plex Chinese MAL Helper.user.js"
node --test tests/plex-mal-helper.test.cjs
```

浏览器回归测试使用 Playwright 和独立的模拟 Plex 页面，不连接你的 Plex/MAL 账号。安装 Playwright 并准备 Chromium 后运行：

```powershell
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node tests/plex-mal-helper.browser.cjs
```

可用 `PLAYWRIGHT_MODULE_PATH` 指定已有的 Playwright 包路径，或用 `PLAYWRIGHT_CHANNEL=msedge` 使用本机 Edge。测试涵盖事件标题辅助、开放 Shadow DOM 纠正窗口、同季复用、跨季隔离、切页竞争、网络失败与缓存回退。真实 Plex 页面、Tampermonkey 隔离行为及账号同步需要安装后验证。
