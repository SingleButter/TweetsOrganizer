// AI分类器 - 三层策略
export class AIClassifier {
  constructor() {
    this.cache = new Map();
    this.rulesEngine = new KeywordRulesEngine();
  }

  /**
   * 对推文进行智能分类
   * @param {Object} tweetData - 推文数据
   * @param {Array} existingCategories - 现有分类列表
   * @returns {Promise<Object>} 分类结果 {category, isNew, confidence, reason}
   */
  async classify(tweetData, existingCategories) {
    const content = this.prepareContent(tweetData);
    const cacheKey = this.hashContent(content.text);

    // 1. 检查缓存 (最高优先级)
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 7 * 24 * 60 * 60 * 1000) {
      console.log("[AIClassifier] 使用缓存结果:", cached.result);
      return cached.result;
    }

    // 2. 调用AI (默认首选,因为需要生成总结)
    try {
      let result = await this.callGeminiAPI(content, existingCategories);
      
      console.log("[AIClassifier] AI分类成功:", result);
      
      // 缓存结果
      this.cache.set(cacheKey, {
        result: result,
        timestamp: Date.now(),
      });
      
      return result;
    } catch (error) {
      console.error("[AIClassifier] AI分类失败, 尝试使用规则引擎:", error);
      
      // 3. AI失败时的降级策略: 规则引擎
      let result = this.rulesEngine.classify(content, existingCategories);
      if (result.confidence > 0) {
        console.log("[AIClassifier] 规则降级匹配成功:", result);
        return result;
      }

      // 4. 彻底失败: 默认分类
      return {
        category: "未分类",
        title: content.text.substring(0, 15),
        summary: "[AI Failed] " + content.text.substring(0, 150),
        isNew: false,
        confidence: 0.5,
        reason: "AI分类失败,使用默认分类",
      };
    }
  }

  /**
   * 准备分类内容
   */
  prepareContent(tweetData) {
    return {
      text: tweetData.content.text,
      hashtags: tweetData.content.hashtags || [],
      mentions: tweetData.content.mentions || [],
      author: tweetData.author.handle,
      hasMedia: tweetData.media && tweetData.media.length > 0,
      mediaTypes: tweetData.media ? tweetData.media.map((m) => m.type) : [],
    };
  }

  /**
   * 调用Google Gemini API
   */
  async callGeminiAPI(content, existingCategories) {
    // 获取API密钥
    const config = await chrome.storage.local.get("geminiApiKey");
    const apiKey = config.geminiApiKey;

    if (!apiKey) {
      throw new Error("未配置Gemini API密钥");
    }

    const prompt = `你是一个推文内容分类助手。请根据以下推文内容选择最合适的分类。

现有分类: ${existingCategories.length > 0 ? existingCategories.join(", ") : "无"}

推文内容:
- 文本: ${content.text}
- 标签: ${content.hashtags.join(", ") || "无"}
- 作者: @${content.author}
- 媒体类型: ${content.mediaTypes.join(", ") || "无"}

请分析内容主题,并:
1. 如果现有分类中有合适的,直接选择
2. 如果没有完全匹配但有接近的,选择最接近的
3. 如果完全没有合适的,建议一个新的分类名称(简短,2-4个字)
4. 生成一个精简标题(title),必须在15个字以内,概括推文核心
5. 生成一个内容总结(summary),必须在150字以内,总结推文主要内容

必须以JSON格式返回(不要包含其他文字):
{
  "category": "分类名称",
  "title": "精简标题",
  "summary": "内容总结",
  "isNew": false,
  "confidence": 0.95,
  "reason": "选择理由"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1000,
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || response.statusText;
      throw new Error(`Gemini API错误 (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      const errorMsg = data.error?.message || "返回空结果";
      throw new Error(`Gemini API异常: ${errorMsg}`);
    }

    const text = data.candidates[0].content.parts[0].text;
    console.log('[AIClassifier] AI原始响应:', text);

    // 提取JSON - 查找大括号范围
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error('[AIClassifier] AI未返回有效的JSON, 原始响应:', text);
      throw new Error("无法从AI响应中找到JSON对象 (未找到大括号)");
    }

    const jsonStr = text.substring(firstBrace, lastBrace + 1);
    console.log('[AIClassifier] 提取的JSON字符串:', jsonStr);

    try {
      const result = JSON.parse(jsonStr);
      console.log('[AIClassifier] JSON解析成功:', result);
      return result;
    } catch (e) {
      console.error('[AIClassifier] JSON解析失败:', e);
      console.error('[AIClassifier] 尝试解析的字符串:', jsonStr);

      // 尝试清理常见问题
      try {
        // 移除可能的控制字符和多余空白
        const cleanedStr = jsonStr
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 移除控制字符
          .replace(/,(\s*[}\]])/g, '$1'); // 移除尾随逗号

        console.log('[AIClassifier] 清理后的JSON字符串:', cleanedStr);
        const result = JSON.parse(cleanedStr);
        console.log('[AIClassifier] 清理后解析成功:', result);
        return result;
      } catch (e2) {
        console.error('[AIClassifier] 清理后仍然解析失败:', e2);
        throw new Error(`无法从AI响应中提取JSON: ${e.message}\n原始响应: ${text.substring(0, 200)}`);
      }
    }
  }

  /**
   * 生成内容哈希(用于缓存)
   */
  hashContent(text) {
    const str = text.substring(0, 100);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash;
    }
    return hash.toString();
  }
}

// 关键词规则引擎
class KeywordRulesEngine {
  constructor() {
    // 默认规则(可以从storage加载用户自定义规则)
    this.rules = {
      技术: [
        "code",
        "programming",
        "javascript",
        "python",
        "react",
        "ai",
        "ml",
        "developer",
        "coding",
        "github",
        "api",
        "software",
        "编程",
        "代码",
        "开发",
        "算法",
        "数据",
      ],
      设计: [
        "design",
        "ui",
        "ux",
        "figma",
        "css",
        "typography",
        "layout",
        "设计",
        "界面",
        "交互",
        "视觉",
        "配色",
      ],
      新闻: [
        "breaking",
        "news",
        "report",
        "announcement",
        "新闻",
        "报道",
        "消息",
        "快讯",
      ],
      学习: [
        "learn",
        "tutorial",
        "course",
        "education",
        "study",
        "学习",
        "教程",
        "课程",
        "教育",
      ],
      工具: [
        "tool",
        "app",
        "software",
        "plugin",
        "extension",
        "工具",
        "应用",
        "插件",
        "扩展",
      ],
      思考: [
        "thought",
        "opinion",
        "idea",
        "philosophy",
        "思考",
        "想法",
        "观点",
        "哲学",
        "感悟",
      ],
    };
  }

  /**
   * 基于规则匹配分类
   */
  classify(content, existingCategories) {
    const text = content.text.toLowerCase();
    const hashtags = content.hashtags.map((h) => h.toLowerCase());
    const scores = {};

    // 计算每个分类的匹配分数
    Object.keys(this.rules).forEach((category) => {
      // 只考虑现有分类
      if (
        existingCategories.length > 0 &&
        !existingCategories.includes(category)
      ) {
        return;
      }

      let score = 0;

      // 文本匹配
      this.rules[category].forEach((keyword) => {
        const kw = keyword.toLowerCase();
        // 文本中包含关键词
        if (text.includes(kw)) {
          score += 1;
        }
        // hashtag完全匹配
        if (hashtags.includes(kw)) {
          score += 2;
        }
      });

      scores[category] = score;
    });

    // 找到最高分
    const entries = Object.entries(scores);
    if (entries.length === 0) {
      return { category: null, confidence: 0 };
    }

    const bestMatch = entries.sort((a, b) => b[1] - a[1])[0];
    const [category, score] = bestMatch;

    if (score > 0) {
      // 置信度计算: 匹配数量越多越高,最高0.9
      const confidence = Math.min(score / 3, 0.9);
      return {
        category: category,
        title: text.substring(0, 15),
        summary: text.substring(0, 150),
        isNew: false,
        confidence: confidence,
        reason: `关键词匹配(${score}个)`,
      };
    }

    return { category: null, confidence: 0 };
  }

  /**
   * 加载用户自定义规则
   */
  async loadCustomRules() {
    const config = await chrome.storage.local.get("customRules");
    if (config.customRules) {
      this.rules = { ...this.rules, ...config.customRules };
    }
  }

  /**
   * 保存用户自定义规则
   */
  async saveCustomRules(rules) {
    await chrome.storage.local.set({ customRules: rules });
    this.rules = { ...this.rules, ...rules };
  }
}

export { KeywordRulesEngine };
