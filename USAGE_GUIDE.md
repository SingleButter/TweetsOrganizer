# 使用指南

## 快速开始(5分钟)

### 步骤1: 配置Notion (2分钟)

1. **创建Integration**
   - 打开 https://www.notion.so/my-integrations
   - 点击 "+ New integration"
   - 名称: "Twitter Bookmark Sync"
   - 提交后复制API密钥(secret_...)

2. **创建数据库**
   - 在Notion创建新页面
   - 添加Table数据库
   - 添加属性:
     - 标题 (Title)
     - 分类 (Select)
     - 作者 (Text)
     - 原文链接 (URL)
     - 保存时间 (Date)
     - 标签 (Multi-select)
     - 媒体类型 (Multi-select)

3. **连接Integration到数据库**
   - 点击数据库右上角 "..."
   - Add connections
   - 选择你的Integration

4. **复制Database ID**
   - 数据库URL: `notion.so/workspace/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx?v=...`
   - 复制中间32位字符串

### 步骤2: 配置扩展 (2分钟)

1. 点击扩展图标 → "⚙️ 设置"
2. 粘贴Notion API密钥和Database ID
3. 点击 "测试Notion连接"
4. (可选) 配置Gemini API进行AI分类
5. 点击 "💾 保存设置"

### 步骤3: 开始使用 (1分钟)

1. 访问 Twitter/X
2. 为任意推文添加书签
3. 等待通知: "书签已同步"
4. 在Notion中查看结果

---

## 详细功能说明

### 自动同步

**工作流程**:
```
用户点击书签 → 扩展检测 → 提取内容 → AI分类 → 创建Notion页面 → 通知用户
```

**支持的内容**:
- ✅ 纯文本推文
- ✅ 图片(1-4张,自动获取原图)
- ✅ 视频(嵌入推文链接)
- ✅ 外部链接卡片
- ✅ Hashtags和@mentions
- ✅ 点赞/转发/回复数

**同步时间**: 通常3-5秒

### AI智能分类

**工作原理**:

1. **规则匹配(优先)**
   - 检查关键词: "javascript", "代码", "设计"等
   - 立即返回,无API成本
   - 准确率: 80%+

2. **缓存查询**
   - 检查7天内相似内容
   - 避免重复AI调用

3. **Gemini AI(降级)**
   - 仅处理疑难案例(约20%)
   - 理解上下文,灵活分类
   - 自动创建新分类

**默认分类**:
- 技术 (code, programming, ai, javascript...)
- 设计 (design, ui, ux, figma...)
- 新闻 (breaking, news, 新闻...)
- 学习 (learn, tutorial, 教程...)
- 工具 (tool, app, 工具...)
- 思考 (thought, opinion, 想法...)

**自定义分类**:
在Notion数据库的"分类"属性中添加新选项,AI会自动识别并使用。

### 同步历史

**查看方式**:
- 点击扩展图标 → 查看最近5条
- 打开设置页面 → 查看完整历史(最近100条)

**历史记录包含**:
- 同步时间
- 推文预览
- 分类结果
- 成功/失败状态

### 失败重试

**自动保存**:
- 网络错误
- API限流
- 配置问题

**手动重试**:
1. 点击扩展图标 → "🔄 重试失败"
2. 或在设置页面 → "重试失败项"

**重试策略**:
- 最多重试5次
- 超过5次自动放弃
- 成功后自动从队列移除

---

## 高级配置

### 关闭AI分类

如果不想使用AI(或没有Gemini API密钥):

1. 设置页面 → AI分类配置
2. AI提供商 → 选择"关闭AI分类"
3. 保存设置

此时仅使用关键词规则匹配,未匹配到的推文归类为"未分类"。

### 暂停自动同步

临时不想同步:

1. 设置页面 → 同步设置
2. 取消勾选 "启用自动同步"
3. 保存设置

### 自定义关键词规则

编辑 `background/ai-classifier.js` 中的 `rules` 对象:

```javascript
this.rules = {
  '技术': ['code', 'programming', 'javascript', '你的关键词'],
  '你的分类': ['关键词1', '关键词2']
};
```

---

## 故障排查

### 问题1: 书签没有同步

**检查步骤**:
1. 打开扩展弹窗,查看状态是否为"正常运行"
2. 检查设置中Notion API配置是否正确
3. 在设置页面点击"测试Notion连接"
4. 查看Chrome控制台是否有错误(F12)

**常见原因**:
- Notion API密钥失效
- Database ID错误
- Integration未连接到数据库
- 自动同步已禁用

### 问题2: 分类不准确

**优化方法**:
1. 添加自定义关键词规则
2. 在Notion数据库中预设常用分类
3. 配置Gemini API提升准确率

### 问题3: 图片没有显示

**原因**: Twitter图片链接可能过期

**解决**:
- 图片链接会自动替换为原图质量(`&name=orig`)
- 如果图片过期,点击推文链接查看原文

### 问题4: 通知没有显示

**检查**:
1. Chrome设置 → 隐私和安全 → 网站设置 → 通知
2. 确保允许chrome-extension://显示通知
3. 或在扩展管理页面检查权限

---

## 成本说明

### 完全免费方案

**配置**:
- Twitter监听: 浏览器本地 ($0)
- AI分类: Google Gemini免费API ($0)
- Notion存储: 免费版无限页面 ($0)

**限制**:
- Gemini: 15次/分钟, 1500次/天
- 对于个人使用完全足够(80%使用规则匹配)

**实际成本**: $0/月

### 可选付费升级

如需更强AI能力:
- **Claude API**: $0.01/条推文
- **GPT-4**: $0.03/条推文

每天100条推文约 $1-3/天

---

## 性能优化

### 减少API调用

1. **增加关键词规则**: 覆盖更多场景
2. **预设分类**: 在Notion中创建常用分类
3. **批量处理**: 累积多条后统一分类

### 加快同步速度

1. **简化Notion页面**: 减少块数量
2. **关闭不需要的功能**: 如不需要AI分类
3. **检查网络**: 确保网络稳定

---

## 数据导出

### 从Notion导出

1. 打开Notion数据库
2. 右上角 "..." → Export
3. 选择格式: Markdown, CSV, PDF
4. 下载

### 批量导入现有书签

(功能开发中)

---

## 隐私与安全

### 数据流向

```
Twitter (你的浏览器)
    ↓ 本地处理
Chrome扩展
    ↓ HTTPS加密
Notion API (你的Notion账户)
```

### 不经过第三方

- ✅ 所有数据仅在本地和Notion间传输
- ✅ API密钥存储在本地Chrome Storage
- ✅ 不上传到任何第三方服务器
- ✅ 开源代码,可审计

### 权限说明

- `storage`: 保存配置和缓存
- `notifications`: 显示同步结果
- `twitter.com`, `x.com`: 监听书签操作
- `api.notion.com`: 调用Notion API
- `generativelanguage.googleapis.com`: 调用Gemini API

---

## 更新日志

### v1.0.0 (2026-01-17)

**首次发布**:
- ✅ 实时监听Twitter书签
- ✅ 自动同步到Notion
- ✅ AI智能分类
- ✅ 失败重试机制
- ✅ 同步历史查看
- ✅ 配置界面

---

## 获取帮助

**遇到问题?**
1. 查看本指南的"故障排查"部分
2. 在GitHub Issues提问
3. 查看README.md常见问题

**功能建议?**
欢迎在GitHub Issues提交建议!
