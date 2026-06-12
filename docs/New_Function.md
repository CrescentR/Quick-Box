💻 运维与系统辅助 (System & DevOps)
这部分可以充分利用你后端的 Rust 能力，调用系统底层 API，这是纯 Web 工具做不到的。

端口占用清理 (Port Killer) done

痛点：本地开发时经常遇到 EADDRINUSE 端口被占用，手动查 PID 再杀进程非常繁琐。

实现：前端输入端口号，Rust 端调用系统命令（Windows: netstat + taskkill，Mac/Linux: lsof + kill），一键解除占用。

Hosts 快捷切换 (Hosts Switcher)

痛点：开发/测试/生产环境频繁切换域名指向。

实现：通过 Rust 读取并修改 /etc/hosts 或 C:\Windows\System32\drivers\etc\hosts。提供简单的开关界面。

Linux 命令速查与解释 (tldr/Command Cheat Sheet) done

痛点：tar 怎么解压来着？find 怎么排除目录？看 man 手册太长。
    
实现：集成开源的 tldr 静态 JSON/Markdown 库，输入命令直接看最常用的几条示例。

Linux 权限计算器 (Chmod Calculator) done

痛点：经常忘记 rwx 对应的数字（比如 755, 644）。

实现：纯前端组件，提供勾选框（Owner/Group/Public 的 Read/Write/Execute），实时双向生成命令代码（如 chmod 777）。

🌐 网络与开发接口 (Network & Web) 
IP 与归属地查询 (IP Checker)

痛点：需要快速知道自己的局域网 IP、公网 IP 或排查某个域名的解析地址。

实现：Rust 获取本地网卡 IP；前端调用免费 API（如 ipify）获取公网 IP 及地理位置。

HTTP 状态码速查表 (Status Code Dictionary)

痛点：遇到 409、422、502 偶尔卡壳，需要确认准确含义。

实现：纯前端静态数据，输入 422 立即显示 Unprocessable Entity 及其常见触发场景。

快捷发包测试 (Mini Postman)

痛点：只想测一个简单的 GET/POST 接口，打开 Postman 太重。

实现：提供简单的 URL 输入、Method 选择、Headers 填写和 JSON Body 框，利用前端 fetch 或 Rust 发起请求并展示格式化后的响应。

⌨️ 代码与数据处理 (Coding & Data)
本地代码片段管理器 (Snippet Manager)

痛点：有些常用的配置模板、正则、或者是项目特定的 boilerplate，每次都要去旧项目里翻。

实现：利用你的 SQLite，前端做一个简单的标题+内容的 CRUD，点击条目直接写入系统剪贴板。

文本/代码差异对比 (Text Diff)

痛点：想对比两段 JSON 或文本的差异，不想专门开一个 VS Code。

实现：集成现成的 React Diff 库（如 react-diff-viewer），左右双栏粘贴文本，高亮差异。

Bcrypt / Argon2 密码生成与校验

痛点：测试登录注册逻辑时，需要快速生成一个 Bcrypt Hash 或验证一段 Hash 是否匹配某明文。

实现：前端使用 WASM 或 JS 库，或者传给 Rust 处理（速度更快），提供明文转 Hash、Hash 校验两个 Tab。

进制/基数转换器 (Radix Converter)

痛点：二进制、八进制、十进制、十六进制之间的快速换算，特别是在看硬件协议或位运算时。

实现：纯前端，四个输入框联动，输入任意一个，其他三个自动算出。

Markdown 表格转换器 (Excel/CSV to MD Table)

痛点：写文档时，手敲 Markdown 表格极其痛苦。

实现：支持从剪贴板粘贴 Excel 单元格或 CSV 数据，一键输出对齐的 Markdown 表格代码。

常用正则表达式库 (Regex Library)

痛点：虽然你有“正则测试”，但开发者经常记不住“匹配国内手机号”、“匹配 IPv4”、“匹配身份证”的现成正则。

实现：内置几十个常用的正则表达式模板，支持一键复制，点击可直接无缝跳入你的“正则测试”工具。

🎨 前端与视觉设计 (Frontend & Design)
屏幕取色器 (Screen Color Picker)

痛点：想要复刻别人网页/原型的颜色，F12 太麻烦。

实现：Tauri 有社区维护的屏幕取色插件，或者用 Rust 调用系统 API 实现。取色后可无缝联动你已有的“颜色转换”工具。

CSS 阴影/渐变可视化生成 (CSS Visual Generator)

痛点：手写 box-shadow 或 linear-gradient 的参数很难一次对齐视觉效果。

实现：纯前端可视化调节滑块（角度、颜色、模糊度），下方实时预览并生成 CSS 代码。

二维码生成与解码 (QR Code Studio)

痛点：要在手机上预览局域网跑的本地服务，手打 IP 太累；或者需要看某个神秘二维码里面到底是什么链接。

实现：前端集成 qrcode.react 生成二维码；集成 jsQR 支持粘贴图片解析二维码内容。

🛠️ 日常提效与工作流 (Utility & Workflow)
文本极速翻译 (Quick Translate)

痛点：看源码注释或写英文 Commit 时，需要极其轻量级的划词/复制翻译。

实现：调用 Google Translate 免费镜像 API 或 DeepL API，支持中英互译。

剪贴板纯文本历史记录 (Clipboard History - Lite)

痛点：复制了新的东西，才发现刚刚复制的 token 丢了。

实现：如果不想做全能的剪贴板管理（带图片、文件），可以做一个只监听并记录纯文本（限制 100 条存在 SQLite）的极简版。极其高频。

Git 标准 Commit 生成器 (Git Commit Formatter)

痛点：团队要求 Angular 规范（feat/fix/chore），手敲容易拼错或格式乱。

实现：提供下拉菜单选 Type，输入框填 Scope 和 Subject，一键生成 feat(ui): update button style 并复制。

占位文本生成器 (Lorem Ipsum Generator)

痛点：画原型、写静态页面测试排版时，需要一段看起来很自然的废话。

实现：纯前端，选择生成“段落”、“单词”数量，甚至可以加入中文的“乱数假文”生成。