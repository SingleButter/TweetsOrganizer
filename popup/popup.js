// Popup脚本
document.addEventListener('DOMContentLoaded', async () => {
  await loadStatus();
  bindEventListeners();
});

/**
 * 加载状态信息
 */
async function loadStatus() {
  try {
    // 检查配置
    const config = await chrome.storage.local.get([
      'notionApiKey',
      'notionDatabaseId',
      'enableAutoSync'
    ]);

    const statusEl = document.getElementById('syncStatus');
    const statusValue = statusEl.querySelector('.value') || statusEl;

    if (!config.notionApiKey || !config.notionDatabaseId) {
      statusValue.textContent = '未配置';
      statusValue.className = 'value error';
    } else if (config.enableAutoSync === false) {
      statusValue.textContent = '已暂停';
      statusValue.className = 'value';
    } else {
      statusValue.textContent = '正常运行';
      statusValue.className = 'value active';
    }

    // 加载统计数据
    await loadStatistics();

    // 加载最近同步
    await loadRecentSyncs();

  } catch (error) {
    console.error('加载状态失败:', error);
  }
}

/**
 * 加载统计数据
 */
async function loadStatistics() {
  const { syncHistory = [], failedSyncs = [] } = await chrome.storage.local.get([
    'syncHistory',
    'failedSyncs'
  ]);

  // 今日同步数量
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = syncHistory.filter(record =>
    record.success && record.timestamp >= today.getTime()
  ).length;

  document.getElementById('todayCount').textContent = todayCount;
  document.getElementById('failedCount').textContent = failedSyncs.length;
}

/**
 * 加载最近同步记录
 */
async function loadRecentSyncs() {
  const { syncHistory = [] } = await chrome.storage.local.get('syncHistory');
  const listEl = document.getElementById('recentList');

  if (syncHistory.length === 0) {
    listEl.innerHTML = '<li class="empty">暂无记录</li>';
    return;
  }

  const recentItems = syncHistory.slice(0, 5).map(record => {
    const text = record.tweetText || '(无内容)';
    const preview = text.length > 30 ? text.substring(0, 30) + '...' : text;
    const category = record.category || '未分类';

    return `
      <li>
        ${preview}
        <span class="category">${category}</span>
      </li>
    `;
  }).join('');

  listEl.innerHTML = recentItems;
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
  // 打开设置页面
  document.getElementById('openOptionsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // 重试失败的同步
  document.getElementById('retryBtn').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'RETRY_FAILED_SYNCS' });

      if (response.success) {
        alert('重试完成!');
        await loadStatus();
      } else {
        alert(`重试失败: ${response.error}`);
      }
    } catch (error) {
      alert(`重试失败: ${error.message}`);
    }
  });
}
