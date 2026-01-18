// 推文内容提取器
class TweetExtractor {
  /**
   * 从推文DOM元素中提取完整数据
   * @param {HTMLElement} tweetElement - 推文容器元素
   * @returns {Object} 提取的推文数据
   */
  extract(tweetElement) {
    if (!tweetElement) {
      console.error('[TweetExtractor] 推文元素不存在');
      return null;
    }

    try {
      return {
        id: this.extractTweetId(tweetElement),
        author: this.extractAuthor(tweetElement),
        content: this.extractContent(tweetElement),
        media: this.extractMedia(tweetElement),
        metadata: this.extractMetadata(tweetElement),
        url: this.getTweetUrl(tweetElement)
      };
    } catch (error) {
      console.error('[TweetExtractor] 提取失败:', error);
      return null;
    }
  }

  /**
   * 提取推文ID
   */
  extractTweetId(el) {
    const url = this.getTweetUrl(el);
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : '';
  }

  /**
   * 提取作者信息
   */
  extractAuthor(el) {
    const userNameEl = el.querySelector('[data-testid="User-Name"]');
    const avatarEl = el.querySelector('[data-testid="Tweet-User-Avatar"] img');

    // 提取@handle
    const linkEl = el.querySelector('a[href^="/"]');
    const href = linkEl?.getAttribute('href') || '';
    const handle = href.split('/')[1] || '';

    // 提取显示名称
    const nameSpan = userNameEl?.querySelector('span');
    const name = nameSpan?.innerText || handle;

    return {
      name: name,
      handle: handle,
      avatar: avatarEl?.src || ''
    };
  }

  /**
   * 提取文本内容
   */
  extractContent(el) {
    const textDiv = el.querySelector('[data-testid="tweetText"]');
    const text = textDiv?.innerText || '';

    return {
      text: text,
      html: textDiv?.innerHTML || '',
      hashtags: this.extractHashtags(text),
      mentions: this.extractMentions(text)
    };
  }

  /**
   * 提取hashtags
   */
  extractHashtags(text) {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.matchAll(hashtagRegex);
    return Array.from(matches).map(match => match[1]);
  }

  /**
   * 提取@mentions
   */
  extractMentions(text) {
    const mentionRegex = /@(\w+)/g;
    const matches = text.matchAll(mentionRegex);
    return Array.from(matches).map(match => match[1]);
  }

  /**
   * 提取媒体内容(图片/视频/链接)
   */
  extractMedia(el) {
    const media = [];

    // 提取图片
    const photoEls = el.querySelectorAll('[data-testid="tweetPhoto"] img');
    photoEls.forEach(img => {
      let url = img.src;
      // 替换为原图质量
      url = url.replace(/&name=\w+/, '&name=orig');
      media.push({
        type: 'image',
        url: url
      });
    });

    // 提取视频
    const videoEl = el.querySelector('[data-testid="videoPlayer"]');
    if (videoEl) {
      const thumbnail = videoEl.querySelector('img')?.src || '';
      media.push({
        type: 'video',
        thumbnail: thumbnail,
        url: this.getTweetUrl(el) // 视频URL需要从推文链接获取
      });
    }

    // 提取外部链接卡片
    const cardEl = el.querySelector('[data-testid="card.wrapper"]');
    if (cardEl) {
      const linkEl = cardEl.querySelector('a');
      const titleEl = cardEl.querySelector('[role="link"]');
      media.push({
        type: 'link',
        title: titleEl?.innerText || '',
        url: linkEl?.href || ''
      });
    }

    return media;
  }

  /**
   * 提取元数据(时间、统计数据)
   */
  extractMetadata(el) {
    const timeEl = el.querySelector('time');
    const timestamp = timeEl?.getAttribute('datetime') || new Date().toISOString();

    return {
      timestamp: timestamp,
      stats: {
        replies: this.getStatCount(el, 'reply'),
        retweets: this.getStatCount(el, 'retweet'),
        likes: this.getStatCount(el, 'like')
      }
    };
  }

  /**
   * 获取统计数字(点赞/转发/回复)
   */
  getStatCount(el, type) {
    let testId;
    switch (type) {
      case 'reply':
        testId = 'reply';
        break;
      case 'retweet':
        testId = 'retweet';
        break;
      case 'like':
        testId = 'like';
        break;
      default:
        return 0;
    }

    const statEl = el.querySelector(`[data-testid="${testId}"]`);
    if (!statEl) return 0;

    const countEl = statEl.querySelector('[data-testid="app-text-transition-container"]');
    const countText = countEl?.innerText || '0';

    // 处理K/M后缀
    if (countText.includes('K')) {
      return Math.round(parseFloat(countText) * 1000);
    } else if (countText.includes('M')) {
      return Math.round(parseFloat(countText) * 1000000);
    }

    return parseInt(countText) || 0;
  }

  /**
   * 获取推文URL
   */
  getTweetUrl(el) {
    const timeEl = el.querySelector('time');
    const link = timeEl?.parentElement?.getAttribute('href');
    if (link) {
      // 处理相对路径
      if (link.startsWith('/')) {
        return `https://twitter.com${link}`;
      }
      return link;
    }
    return '';
  }
}

// 导出为全局变量,供twitter-monitor.js使用
window.TweetExtractor = TweetExtractor;
