# Twitter Bookmark to Notion

📚 一键保存Twitter推文到Notion,并使用AI智能分类和总结

## 功能特点

✅ **自定义按钮** - 在每条推文上添加Notion图标按钮,按需保存
✅ **AI智能处理** - 自动生成精简标题、内容摘要和智能分类
✅ **完整数据** - 保存推文文本、图片、视频、作者信息等
✅ **零成本运行** - 使用Google Gemini免费API
✅ **失败重试** - 失败自动保存到队列,支持手动重试
✅ **数据隐私** - 所有数据仅在本地和Notion间传输

## 安装步骤

### 1. 准备工作

#### 1.1 创建Notion Integration

1. 访问 [Notion Integrations](https://www.notion.so/my-integrations)
2. 点击 "+ New integration"
3. 填写名称(如 "Twitter Bookmark Sync")
4. 选择关联的workspace
5. 点击 "Submit" 创建
6. 复制 **API密钥** (以 `secret_` 开头)

#### 1.2 创建Notion数据库

1. 在Notion中创建一个新页面
2. 添加一个Database(Table视图)
3. 添加以下属性列:
   - **标题** (Title) - AI生成的精简标题
   - **分类** (Select) - AI智能分类
   - **总结** (Text) - AI生成的内容摘要
   - **作者** (Text) - Twitter用户名
   - **原文链接** (URL) - 推文链接
   - **保存时间** (Date) - 保存时间
   - **标签** (Multi-select) - hashtags
   - **媒体类型** (Multi-select) - 图片/视频/链接

4. 点击右上角 "..." → "Add connections" → 选择你刚创建的Integration
5. 复制Database ID:
   - 打开数据库,URL格式: `notion.so/[workspace]/[database_id]?v=...`
   - 复制 `database_id` 部分(32位字符串)

#### 1.3 获取Gemini API密钥(推荐,用于AI处理)

1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey)
2. 点击 "Create API key"
3. 选择项目或创建新项目
4. 复制生成的API密钥

> **注意**: 如果不配置Gemini API,将使用关键词规则进行分类,无法生成AI标题和摘要

### 2. 安装扩展

#### 方式一: 开发者模式(推荐)

1. 克隆或下载本项目
2. 打开Chrome浏览器,访问 `chrome://extensions/`
3. 开启右上角 "开发者模式"
4. 点击 "加载已解压的扩展程序"
5. 选择项目文件夹 `twitterBookmark`

#### 方式二: Chrome Web Store(即将上架)

从Chrome Web Store搜索 "Twitter Bookmark to Notion" 安装

### 3. 配置扩展

1. 点击扩展图标,选择 "设置"
2. **Notion配置**:
   - 粘贴Notion API密钥
   - 粘贴Database ID
   - 点击 "测试Notion连接"
3. **AI分类配置** (可选):
   - 粘贴Gemini API密钥
   - 点击 "测试AI分类"
4. 点击 "保存设置"

### 4. 开始使用

1. 访问 [Twitter](https://twitter.com) 或 [X](https://x.com)
2. 在任意推文的操作栏中,找到**Notion图标按钮**(位于书签按钮左侧)
3. 点击Notion按钮保存推文
4. 等待几秒,会收到同步成功通知
5. 在Notion数据库中查看保存的推文(包含AI生成的标题、摘要和分类)

## 工作原理

```
Twitter页面加载
    ↓
MutationObserver监听DOM
    ↓ 检测到新推文出现
自动注入Notion按钮
    ↓ 按钮位于书签按钮左侧
用户点击Notion按钮
    ↓
提取推文完整内容
    ↓ 文本/图片/视频/作者/统计数据
调用Gemini API
    ↓ 生成标题(15字内) + 摘要(150字内) + 分类
同步到Notion
    ↓ 创建页面,填充属性和内容
显示成功通知
```

## AI智能处理

### 生成内容

每次保存推文时,Gemini AI 会自动生成:

1. **精简标题** (15字以内)
   - 提取推文核心要点
   - 便于在Notion中快速浏览

2. **内容摘要** (150字以内)
   - 总结推文主要内容
   - 适合归档和搜索

3. **智能分类**
   - 根据现有分类智能匹配
   - 或自动创建新分类(2-4字)

### 降级策略

如果 Gemini API 失败,系统会自动降级:

1. **优先**: 使用 Gemini API (生成标题+摘要+分类)
2. **降级**: 使用关键词规则引擎进行分类
3. **兜底**: 使用"未分类"并保留原文前15字作为标题

### 数据缓存

- **缓存有效期**: 7天
- **缓存依据**: 推文文本前100字的哈希值
- **减少API调用**: 相似内容不重复请求AI

### 成本控制

- Gemini免费额度: 1500次/天
- 实际使用: 每条推文1次API调用
- 每天保存50条推文完全免费
- **总成本: $0/月**

## 项目结构

```
twitterBookmark/
├── manifest.json              # 扩展配置
├── background/                # 后台脚本
│   ├── service-worker.js      # 消息路由,流程编排
│   ├── notion-client.js       # Notion API封装
│   └── ai-classifier.js       # AI分类逻辑
├── content-scripts/           # 前端脚本
│   ├── twitter-monitor.js     # 按钮注入与点击监听
│   └── tweet-extractor.js     # 推文数据提取
├── options/                   # 设置页面
│   ├── options.html
│   ├── options.css
│   └── options.js
├── popup/                     # 扩展弹窗
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/                     # 图标文件
```

## 常见问题

### Q: 为什么使用自定义按钮而不是监听书签操作?

A: 自定义按钮方案更灵活:
- 用户可以自主选择保存哪些推文
- 不干扰Twitter原生书签功能
- 避免误触发同步
- 更清晰的用户体验

### Q: 支持哪些推文内容?

A: 支持纯文本、图片(1-4张)、视频、外部链接卡片、hashtags、@mentions,以及点赞/转发/回复统计数据。

### Q: AI生成的内容准确吗?

A: Gemini AI提供高质量的内容处理:
- 标题: 准确提取核心要点,简洁明了
- 摘要: 保留关键信息,去除冗余
- 分类: 理解上下文语义,智能匹配现有分类
- 推文原文: 完整保留在Notion页面内容中,不会丢失信息

### Q: 数据安全吗?

A: 完全安全:
- 所有数据仅在本地浏览器、Notion和Gemini API间传输
- API密钥存储在本地Chrome Storage,不上传到任何服务器
- 推文原文直接保存到Notion,不经过AI修改
- 开源代码,可自行审查

### Q: Notion中看到的是原文还是AI总结?

A: 两者都有:
- **页面标题**: AI生成的精简标题(15字以内)
- **总结属性**: AI生成的摘要(150字以内)
- **页面内容**: 完整的推文原文(未经AI修改)
- **其他数据**: 图片、视频、作者信息等原始数据

### Q: 同步失败怎么办?

A: 失败的同步会自动保存到本地队列,可以在设置页面或弹窗中点击"重试失败项"手动重试。

## 技术栈

- **浏览器扩展**: Chrome Extension Manifest V3
- **DOM操作**: MutationObserver API + 动态按钮注入
- **AI处理**: Google Gemini 3 Flash Preview
- **笔记平台**: Notion API
- **语言**: Vanilla JavaScript (ES6 Modules)
- **架构**: Content Scripts + Background Service Worker

## 开发计划

- [ ] 支持批量导入现有书签
- [ ] 支持更多笔记平台(语雀、Obsidian)
- [ ] 自定义分类规则编辑器
- [ ] 导出为Markdown
- [ ] 全文搜索功能

## 贡献指南

欢迎提交Issue和Pull Request!

### 本地开发

1. 克隆仓库
2. 在Chrome中加载扩展
3. 修改代码后刷新扩展
4. 测试功能

## 许可证

MIT License

## 致谢

- [Notion API](https://developers.notion.com/)
- [Google Gemini](https://ai.google.dev/)
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)

---

**如有问题或建议,请在GitHub Issues中反馈**
