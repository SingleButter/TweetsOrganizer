// Notion API客户端
export class NotionClient {
  constructor(apiKey, databaseId) {
    this.apiKey = apiKey;
    this.databaseId = databaseId;
    this.baseUrl = 'https://api.notion.com/v1';
    this.notionVersion = '2022-06-28';
  }

  /**
   * 创建推文页面
   * @param {Object} tweetData - 推文数据
   * @param {string} category - 分类名称
   * @returns {Promise<Object>} Notion页面对象
   */
  async createTweetPage(tweetData, category) {
    try {
      const response = await fetch(`${this.baseUrl}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': this.notionVersion
        },
        body: JSON.stringify({
          parent: { database_id: this.databaseId },
          parent: { database_id: this.databaseId },
          properties: this.buildProperties(tweetData, category), // category is now aiResult
          children: this.buildPageContent(tweetData)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Notion API错误: ${error.message || response.statusText}`);
      }

      const page = await response.json();
      console.log('[NotionClient] 页面创建成功:', page.id);
      return page;

    } catch (error) {
      console.error('[NotionClient] 创建页面失败:', error);
      throw error;
    }
  }

  /**
   * 构建页面属性
   */
  buildProperties(tweetData, aiResult) {
    // aiResult可以是包含 {category, title, summary} 的对象
    const category = aiResult?.category || aiResult;
    const title = aiResult?.title || this.truncate(tweetData.content.text, 100);
    const summary = aiResult?.summary || '';

    const properties = {
      '标题': {
        title: [{
          text: {
            content: title
          }
        }]
      },
      '原文链接': {
        url: tweetData.url || null
      },
      '保存时间': {
        date: {
          start: new Date().toISOString()
        }
      },
      '总结': {
        rich_text: [{
          text: {
            content: summary
          }
        }]
      }
    };

    // 作者
    if (tweetData.author.handle) {
      properties['作者'] = {
        rich_text: [{
          text: {
            content: `@${tweetData.author.handle}`
          }
        }]
      };
    }

    // 分类
    if (category) {
      properties['分类'] = {
        select: {
          name: category
        }
      };
    }

    // 标签
    if (tweetData.content.hashtags && tweetData.content.hashtags.length > 0) {
      properties['标签'] = {
        multi_select: tweetData.content.hashtags.map(tag => ({
          name: tag
        }))
      };
    }

    // 媒体类型
    if (tweetData.media && tweetData.media.length > 0) {
      const mediaTypes = [...new Set(tweetData.media.map(m => m.type))];
      properties['媒体类型'] = {
        multi_select: mediaTypes.map(type => ({
          name: type === 'image' ? '图片' : type === 'video' ? '视频' : '链接'
        }))
      };
    }

    return properties;
  }

  /**
   * 构建页面内容块
   */
  buildPageContent(tweetData) {
    const blocks = [];

    // 1. 作者信息卡片
    blocks.push({
      type: 'callout',
      callout: {
        icon: { type: 'emoji', emoji: '👤' },
        rich_text: [{
          text: {
            content: `${tweetData.author.name} (@${tweetData.author.handle})\n📅 ${this.formatDate(tweetData.metadata.timestamp)}`
          }
        }],
        color: 'blue_background'
      }
    });

    // 2. 推文文本
    if (tweetData.content.text) {
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            text: {
              content: tweetData.content.text
            }
          }]
        }
      });
    }

    // 3. 媒体内容
    if (tweetData.media && tweetData.media.length > 0) {
      blocks.push({
        type: 'divider',
        divider: {}
      });

      tweetData.media.forEach(item => {
        if (item.type === 'image' && item.url) {
          blocks.push({
            type: 'image',
            image: {
              type: 'external',
              external: { url: item.url }
            }
          });
        } else if (item.type === 'video' && item.url) {
          // 视频使用书签块(嵌入推文链接)
          blocks.push({
            type: 'bookmark',
            bookmark: {
              url: item.url
            }
          });
        } else if (item.type === 'link' && item.url) {
          blocks.push({
            type: 'bookmark',
            bookmark: {
              url: item.url,
              caption: item.title ? [{
                text: { content: item.title }
              }] : []
            }
          });
        }
      });
    }

    // 4. 统计信息
    if (tweetData.metadata && tweetData.metadata.stats) {
      const stats = tweetData.metadata.stats;
      blocks.push({
        type: 'divider',
        divider: {}
      });
      blocks.push({
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            text: {
              content: `💬 ${this.formatNumber(stats.replies)} 回复 | 🔁 ${this.formatNumber(stats.retweets)} 转发 | ❤️ ${this.formatNumber(stats.likes)} 喜欢`
            }
          }],
          color: 'gray'
        }
      });
    }

    return blocks;
  }

  /**
   * 获取数据库信息
   */
  async getDatabase() {
    try {
      const response = await fetch(`${this.baseUrl}/databases/${this.databaseId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Notion-Version': this.notionVersion
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`获取数据库失败: ${error.message || response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[NotionClient] 获取数据库失败:', error);
      throw error;
    }
  }

  /**
   * 获取现有分类列表
   */
  async getExistingCategories() {
    try {
      const database = await this.getDatabase();
      const categoryProperty = database.properties['分类'];

      if (!categoryProperty || categoryProperty.type !== 'select') {
        return [];
      }

      return categoryProperty.select.options.map(option => option.name);
    } catch (error) {
      console.error('[NotionClient] 获取分类列表失败:', error);
      return [];
    }
  }

  /**
   * 工具方法: 截断文本
   */
  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * 工具方法: 格式化日期
   */
  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 工具方法: 格式化数字
   */
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
