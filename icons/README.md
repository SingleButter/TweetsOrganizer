# 图标文件说明

本扩展需要以下尺寸的图标:

- **icon16.png** (16x16像素) - 扩展栏图标
- **icon48.png** (48x48像素) - 扩展管理页面
- **icon128.png** (128x128像素) - Chrome Web Store

## 临时解决方案

在添加实际图标之前,你可以:

1. **使用在线工具生成图标**:
   - [Favicon Generator](https://favicon.io/)
   - [Icon Generator](https://www.iconsgenerator.com/)

2. **设计建议**:
   - 主题: 书签 + 笔记本
   - 颜色: 蓝色/紫色渐变(与UI一致)
   - 图案: 📚 书本/书签符号
   - 风格: 简洁扁平化

3. **快速生成**:
   - 使用Emoji作为图标素材
   - 推荐emoji: 📚 (书本)、🔖 (书签)、📝 (笔记)
   - 在线转换: [Emoji to PNG](https://emoji.gg/emoji-to-png-converter)

## 创建步骤

### 方式一: 使用Figma/Sketch

1. 创建128x128画布
2. 设计图标
3. 导出为PNG(128x128, 48x48, 16x16)
4. 放置到此文件夹

### 方式二: 使用在线工具

1. 访问 https://favicon.io/emoji-favicons/
2. 选择emoji(如📚)
3. 下载favicon包
4. 重命名并放置到此文件夹:
   - favicon-32x32.png → icon16.png (调整尺寸)
   - favicon.ico → icon48.png (调整尺寸)
   - android-chrome-192x192.png → icon128.png (调整尺寸)

### 方式三: 命令行生成(临时)

使用ImageMagick快速生成纯色图标:

```bash
# 需要安装ImageMagick
convert -size 16x16 xc:#667eea icon16.png
convert -size 48x48 xc:#667eea icon48.png
convert -size 128x128 xc:#667eea icon128.png
```

## 注意事项

- 图标背景应为透明(PNG格式)
- 确保在不同尺寸下清晰可见
- 遵循Chrome扩展图标设计规范
