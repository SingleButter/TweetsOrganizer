// Twitter书签监听器 - Custom Button Version
class TwitterBookmarkMonitor {
  constructor() {
    this.extractor = new window.TweetExtractor();
    this.observer = null;
    this.processedTweets = new Set(); // 记录已注入按钮的推文ID
    
    // Icon SVG
    this.notionIcon = `
      <svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-18jsvk2" style="color: inherit; height: 1.25em;">
        <path d="M4.5 4.5 L4.5 19.5 L19.5 19.5 L19.5 7.5 L16.5 4.5 Z M16 5 L18.5 7.5 L16 7.5 Z M6 6 L14.5 6 L14.5 9 L17.5 9 L17.5 18 L6 18 Z M8 10 L15.5 10 L15.5 11.5 L8 11.5 Z M8 13 L15.5 13 L15.5 14.5 L8 14.5 Z M8 16 L13 16 L13 17.5 L8 17.5 Z" fill="currentColor"></path>
      </svg>
    `;
    
    // Selectors
    this.selectors = {
      tweet: '[data-testid="tweet"]',
      actionBar: '[role="group"]',
      bookmarkButton: '[data-testid="bookmark"], [data-testid="removeBookmark"]',
      shareGroup: '[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]' // Used for positioning reference
    };
  }

  /**
   * 启动监听
   */
  start() {
    console.log('[TwitterBookmarkMonitor] 启动自定义按钮注入模式...');

    // 观察DOM变化以注入按钮
    this.observer = new MutationObserver((mutations) => {
      // 简单防抖，避免过于频繁处理
      this.handleMutations(mutations);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 初始处理现有推文
    this.processAllTweets();
  }

  handleMutations(mutations) {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    
    if (shouldScan) {
      this.processAllTweets();
    }
  }

  processAllTweets() {
    const tweets = document.querySelectorAll(this.selectors.tweet);
    tweets.forEach(tweet => this.injectButton(tweet));
  }

  injectButton(tweetElement) {
    // 检查是否已经注入
    if (tweetElement.dataset.notionBtnInjected) return;
    
    const actionBar = tweetElement.querySelector(this.selectors.actionBar);
    if (!actionBar) return;

    // 找到书签按钮 (作为参考点)
    const bookmarkBtn = actionBar.querySelector(this.selectors.bookmarkButton);
    if (!bookmarkBtn) return; // 如果还没有加载出书签按钮，稍后再试

    // 创建按钮容器 (模仿Twitter样式)
    const btnContainer = document.createElement('div');
    btnContainer.className = 'css-1-1 css-1dbjc4n r-18u37iz r-1h0z5md'; // Flex layout classes similar to Twitter's
    btnContainer.style.display = 'inline-flex';
    btnContainer.style.alignItems = 'center';
    btnContainer.style.marginLeft = '8px'; // Add some spacing
    
    // 创建实际按钮
    const button = document.createElement('div');
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.className = 'css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l'; // Twitter interaction classes
    button.style.cursor = 'pointer';
    button.style.display = 'flex';
    button.style.alignItems = 'center';
    button.style.justifyContent = 'center';
    button.style.width = '34px';
    button.style.height = '34px';
    button.style.borderRadius = '9999px';
    button.style.transition = 'background-color 0.2s';
    button.title = 'Save to Notion';
    
    // 设置Hover效果
    button.onmouseover = () => { button.style.backgroundColor = 'rgba(29, 155, 240, 0.1)'; button.style.color = '#1d9bf0'; };
    button.onmouseout = () => { button.style.backgroundColor = 'transparent'; button.style.color = 'inherit'; };

    // 图标容器
    const iconDiv = document.createElement('div');
    iconDiv.className = 'css-1dbjc4n r-xoduu5';
    iconDiv.style.color = 'RGB(83, 100, 113)'; // Twitter gray
    iconDiv.innerHTML = this.notionIcon;
    
    button.appendChild(iconDiv);
    btnContainer.appendChild(button);

    // 绑定点击事件
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleButtonClick(tweetElement, button, iconDiv);
    });

    // 插入到书签按钮之前
    // actionBar通常包含四个主要组: reply, retweet, like, views/share/bookmark
    // 我们尝试插入到最后一个组的开头，或者直接插在Bookmark按钮之前
    const parentContainer = bookmarkBtn.parentNode; // Usually a div wrapping the bookmark button
    if (parentContainer && parentContainer.parentNode === actionBar) {
        // 如果bookmarkBtn是直接包裹在div里的，我们插入在这个div之前
        actionBar.insertBefore(btnContainer, parentContainer);
    } else {
        // 否则直接插入在bookmarkBtn之前
        bookmarkBtn.parentElement.insertBefore(btnContainer, bookmarkBtn);
    }
    
    // 标记已注入
    tweetElement.dataset.notionBtnInjected = 'true';
  }

  async handleButtonClick(tweetElement, button, iconDiv) {
    if (button.dataset.loading === 'true') return;
    
    try {
      // 设置加载状态
      button.dataset.loading = 'true';
      const originalColor = iconDiv.style.color;
      iconDiv.style.color = '#1d9bf0'; // Blue for loading
      iconDiv.style.animation = 'spin 1s linear infinite';
      
      // 添加CSS animation if needed (checking if style element exists)
      if (!document.getElementById('notion-btn-style')) {
        const style = document.createElement('style');
        style.id = 'notion-btn-style';
        style.textContent = `@keyframes spin { 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
      }

      console.log('[TwitterBookmarkMonitor] 点击保存按钮');

      // 检查扩展上下文是否有效
      if (!chrome.runtime?.id) {
        alert('插件已更新，请刷新页面后重试 (Extension updated, please refresh page)');
        button.dataset.loading = 'false';
        iconDiv.style.animation = 'none';
        iconDiv.style.color = originalColor;
        return;
      }

      // 提取数据
      const tweetData = this.extractor.extract(tweetElement);
      if (!tweetData) {
        throw new Error('无法提取推文数据');
      }

      // 发送消息
      chrome.runtime.sendMessage({
        type: 'BOOKMARK_ADDED',
        data: tweetData
      }, (response) => {
        // 恢复状态
        button.dataset.loading = 'false';
        iconDiv.style.animation = 'none';

        if (chrome.runtime.lastError) {
          console.error('[TwitterBookmarkMonitor] 发送失败:', chrome.runtime.lastError);
          this.showStatus(button, iconDiv, 'error');
          return;
        }

        if (response && response.success) {
          console.log('[TwitterBookmarkMonitor] 保存成功');
          this.showStatus(button, iconDiv, 'success');
        } else {
          console.error('[TwitterBookmarkMonitor] 保存失败:', response);
          this.showStatus(button, iconDiv, 'error');
        }
      });

    } catch (error) {
      console.error('[TwitterBookmarkMonitor] 处理点击失败:', error);
      button.dataset.loading = 'false';
      iconDiv.style.animation = 'none';
      this.showStatus(button, iconDiv, 'error');
    }
  }

  showStatus(button, iconDiv, status) {
    const originalHTML = iconDiv.innerHTML;
    const originalColor = iconDiv.style.color;
    
    if (status === 'success') {
      iconDiv.style.color = '#00ba7c'; // Green
      // Checkmark icon
      iconDiv.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" style="color: inherit; height: 1.25em; fill: currentColor;"><path d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12z M7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z"></path></svg>`; // Heart icon basically acting as success for now
      
      // Revert after 2 seconds
      setTimeout(() => {
        iconDiv.innerHTML = originalHTML;
        iconDiv.style.color = 'RGB(83, 100, 113)';
      }, 2000);
    } else {
      iconDiv.style.color = '#f4212e'; // Red
      // Error icon (Exclamation)
      iconDiv.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" style="color: inherit; height: 1.25em; fill: currentColor;"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path></svg>`;
      
      setTimeout(() => {
        iconDiv.innerHTML = originalHTML;
        iconDiv.style.color = 'RGB(83, 100, 113)';
      }, 2000);
    }
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// 启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const monitor = new TwitterBookmarkMonitor();
    monitor.start();
  });
} else {
  const monitor = new TwitterBookmarkMonitor();
  monitor.start();
}
