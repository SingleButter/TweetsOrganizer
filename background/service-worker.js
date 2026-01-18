// Service Worker - 后台服务协调
import { NotionClient } from './notion-client.js';
import { AIClassifier } from './ai-classifier.js';

console.log('[Service Worker] 已加载');

// 消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Service Worker] 收到消息:', message.type);

  if (message.type === 'BOOKMARK_ADDED') {
    // 异步处理书签同步
    handleBookmarkSync(message.data)
      .then(result => {
        console.log('[Service Worker] 同步成功:', result);
        sendResponse({ success: true, result });
      })
      .catch(error => {
        console.error('[Service Worker] 同步失败:', error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // 保持消息通道开启
  }

  if (message.type === 'GET_SYNC_HISTORY') {
    getSyncHistory()
      .then(history => sendResponse({ success: true, history }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.type === 'RETRY_FAILED_SYNCS') {
    retryFailedSyncs()
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

/**
 * 处理书签同步流程
 */
async function handleBookmarkSync(tweetData) {
  try {
    console.log('[Service Worker] 开始处理书签同步:', tweetData.url);

    // 1. 获取配置
    const config = await chrome.storage.local.get([
      'notionApiKey',
      'notionDatabaseId',
      'geminiApiKey',
      'enableAutoSync'
    ]);

    // 检查是否启用自动同步
    if (config.enableAutoSync === false) {
      console.log('[Service Worker] 自动同步已禁用');
      return { skipped: true, reason: '自动同步已禁用' };
    }

    // 检查Notion配置
    if (!config.notionApiKey || !config.notionDatabaseId) {
      const error = '请先在设置页面配置Notion API';
      await showNotification('配置错误', error, 'error');
      throw new Error(error);
    }

    // 2. 获取现有分类
    const notionClient = new NotionClient(config.notionApiKey, config.notionDatabaseId);
    let existingCategories = [];

    try {
      existingCategories = await notionClient.getExistingCategories();
      console.log('[Service Worker] 现有分类:', existingCategories);
    } catch (error) {
      console.warn('[Service Worker] 获取分类失败,使用空列表:', error);
    }

    // 3. AI分类
    const classifier = new AIClassifier();
    const classificationResult = await classifier.classify(tweetData, existingCategories);
    console.log('[Service Worker] 分类结果:', classificationResult);

    // 4. 同步到Notion
    const page = await notionClient.createTweetPage(
      tweetData,
      classificationResult
    );

    // 5. 记录同步历史
    await addSyncRecord({
      tweetUrl: tweetData.url,
      tweetText: tweetData.content.text.substring(0, 100),
      category: classificationResult.category,
      confidence: classificationResult.confidence,
      notionPageId: page.id,
      success: true,
      timestamp: Date.now()
    });

    // 6. 显示成功通知
    await showNotification(
      '书签已同步',
      `已保存到分类: ${classificationResult.category}`,
      'success'
    );

    return {
      pageId: page.id,
      category: classificationResult.category,
      confidence: classificationResult.confidence
    };

  } catch (error) {
    console.error('[Service Worker] 同步失败:', error);

    // 保存到失败队列
    await saveToFailureQueue(tweetData, error.message);

    // 显示错误通知
    await showNotification(
      '同步失败',
      error.message,
      'error'
    );

    throw error;
  }
}

/**
 * 添加同步记录
 */
async function addSyncRecord(record) {
  const { syncHistory = [] } = await chrome.storage.local.get('syncHistory');

  // 添加到历史记录
  syncHistory.unshift(record);

  // 只保留最近100条
  if (syncHistory.length > 100) {
    syncHistory.length = 100;
  }

  await chrome.storage.local.set({ syncHistory });
}

/**
 * 获取同步历史
 */
async function getSyncHistory() {
  const { syncHistory = [] } = await chrome.storage.local.get('syncHistory');
  return syncHistory;
}

/**
 * 保存到失败队列
 */
async function saveToFailureQueue(tweetData, errorMessage) {
  const { failedSyncs = [] } = await chrome.storage.local.get('failedSyncs');

  failedSyncs.push({
    data: tweetData,
    error: errorMessage,
    timestamp: Date.now(),
    retryCount: 0
  });

  await chrome.storage.local.set({ failedSyncs });
  console.log('[Service Worker] 已保存到失败队列, 总数:', failedSyncs.length);
}

/**
 * 重试失败的同步
 */
async function retryFailedSyncs() {
  const { failedSyncs = [] } = await chrome.storage.local.get('failedSyncs');

  if (failedSyncs.length === 0) {
    return { message: '没有需要重试的项目' };
  }

  console.log('[Service Worker] 开始重试失败的同步, 总数:', failedSyncs.length);

  const results = {
    success: 0,
    failed: 0,
    total: failedSyncs.length
  };

  const remainingFailed = [];

  for (const item of failedSyncs) {
    try {
      await handleBookmarkSync(item.data);
      results.success++;
    } catch (error) {
      item.retryCount++;
      if (item.retryCount < 5) {
        remainingFailed.push(item);
      } else {
        console.error('[Service Worker] 重试次数超过5次,放弃:', item.data.url);
      }
      results.failed++;
    }
  }

  // 更新失败队列
  await chrome.storage.local.set({ failedSyncs: remainingFailed });

  console.log('[Service Worker] 重试完成:', results);
  return results;
}

/**
 * 显示通知
 */
async function showNotification(title, message, type = 'info') {
  const iconMap = {
    success: chrome.runtime.getURL('icons/icon48.png'),
    error: chrome.runtime.getURL('icons/icon48.png'),
    info: chrome.runtime.getURL('icons/icon48.png')
  };

  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: iconMap[type] || iconMap.info,
      title: title,
      message: message,
      priority: type === 'error' ? 2 : 1
    });
  } catch (error) {
    console.error('[Service Worker] 显示通知失败:', error);
  }
}

/**
 * Service Worker保活
 * Manifest V3要求: Service Worker在30秒不活跃后会休眠
 * 使用chrome.alarms定期唤醒
 */
chrome.alarms.create('keep-alive', {
  periodInMinutes: 0.5 // 每30秒
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keep-alive') {
    console.log('[Service Worker] Keep alive');
  }
});

// 扩展安装/更新时的处理
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Service Worker] 扩展已安装/更新:', details.reason);

  if (details.reason === 'install') {
    // 首次安装: 打开设置页面
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    // 更新: 检查是否需要迁移数据
    console.log('[Service Worker] 扩展已更新到版本:', chrome.runtime.getManifest().version);
  }
});

console.log('[Service Worker] 初始化完成');
