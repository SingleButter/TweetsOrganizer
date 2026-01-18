// Options页面脚本
document.addEventListener('DOMContentLoaded', async () => {
  // 加载保存的配置
  await loadConfig();

  // 加载同步历史
  await loadSyncHistory();

  // 绑定事件监听器
  bindEventListeners();
});

/**
 * 加载配置
 */
async function loadConfig() {
  const config = await chrome.storage.local.get([
    'notionApiKey',
    'notionDatabaseId',
    'geminiApiKey',
    'aiProvider',
    'enableAutoSync'
  ]);

  document.getElementById('notionApiKey').value = config.notionApiKey || '';
  document.getElementById('notionDatabaseId').value = config.notionDatabaseId || '';
  document.getElementById('geminiApiKey').value = config.geminiApiKey || '';
  document.getElementById('aiProvider').value = config.aiProvider || 'gemini';
  document.getElementById('enableAutoSync').checked = config.enableAutoSync !== false;
}

/**
 * 绑定事件监听器
 */
function bindEventListeners() {
  // 测试Notion连接
  document.getElementById('testNotionBtn').addEventListener('click', testNotionConnection);

  // 测试AI分类
  document.getElementById('testAIBtn').addEventListener('click', testAIClassification);

  // 保存设置
  document.getElementById('saveBtn').addEventListener('click', saveConfig);

  // 刷新历史
  document.getElementById('refreshHistoryBtn').addEventListener('click', loadSyncHistory);

  // 重试失败项
  document.getElementById('retryFailedBtn').addEventListener('click', retryFailedSyncs);

  // AI提供商变化
  document.getElementById('aiProvider').addEventListener('change', (e) => {
    const geminiGroup = document.getElementById('geminiKeyGroup');
    geminiGroup.style.display = e.target.value === 'gemini' ? 'block' : 'none';
  });
}

/**
 * 测试Notion连接
 */
async function testNotionConnection() {
  const apiKey = document.getElementById('notionApiKey').value.trim();
  const databaseId = document.getElementById('notionDatabaseId').value.trim();
  const statusEl = document.getElementById('notionStatus');

  if (!apiKey || !databaseId) {
    showStatus(statusEl, 'error', '请填写Notion API密钥和Database ID');
    return;
  }

  try {
    showStatus(statusEl, 'info', '正在测试连接...');

    // 测试连接
    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || response.statusText);
    }

    const database = await response.json();
    const dbTitle = database.title && database.title.length > 0
      ? database.title[0].plain_text
      : '(无标题)';

    showStatus(statusEl, 'success', `✅ 连接成功! 数据库: ${dbTitle}`);

    // 自动保存配置
    await chrome.storage.local.set({
      notionApiKey: apiKey,
      notionDatabaseId: databaseId
    });

  } catch (error) {
    showStatus(statusEl, 'error', `❌ 连接失败: ${error.message}`);
  }
}

/**
 * 测试AI分类
 */
async function testAIClassification() {
  const provider = document.getElementById('aiProvider').value;
  const statusEl = document.getElementById('aiStatus');

  if (provider === 'none') {
    showStatus(statusEl, 'info', 'AI分类已关闭');
    return;
  }

  const apiKey = document.getElementById('geminiApiKey').value.trim();

  if (!apiKey) {
    showStatus(statusEl, 'error', '请填写Gemini API密钥');
    return;
  }

  try {
    showStatus(statusEl, 'info', '正在测试AI分类...');

    // 测试推文
    const testPrompt = `你是推文分类助手。请对以下推文进行分类:

推文内容: "Just learned about React hooks, they are amazing! #reactjs #javascript"

现有分类: 技术, 设计, 新闻

返回JSON格式: {"category": "技术", "confidence": 0.95, "reason": "包含编程相关关键词"}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: testPrompt
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 200
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error?.message || response.statusText || '未知错误';
      throw new Error(`API错误 (${response.status}): ${errorMsg}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      const errorMsg = data.error?.message || JSON.stringify(data);
      throw new Error(`AI返回异常: ${errorMsg}`);
    }

    const text = data.candidates[0].content.parts[0].text;
    showStatus(statusEl, 'success', `✅ AI测试成功! 响应: ${text.substring(0, 100)}...`);

    // 自动保存配置
    await chrome.storage.local.set({
      geminiApiKey: apiKey,
      aiProvider: provider
    });

  } catch (error) {
    showStatus(statusEl, 'error', `❌ AI测试失败: ${error.message}`);
  }
}

/**
 * 保存配置
 */
async function saveConfig() {
  const statusEl = document.getElementById('saveStatus');

  try {
    const config = {
      notionApiKey: document.getElementById('notionApiKey').value.trim(),
      notionDatabaseId: document.getElementById('notionDatabaseId').value.trim(),
      geminiApiKey: document.getElementById('geminiApiKey').value.trim(),
      aiProvider: document.getElementById('aiProvider').value,
      enableAutoSync: document.getElementById('enableAutoSync').checked
    };

    await chrome.storage.local.set(config);
    showStatus(statusEl, 'success', '✅ 设置已保存');

    // 3秒后隐藏提示
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 3000);

  } catch (error) {
    showStatus(statusEl, 'error', `❌ 保存失败: ${error.message}`);
  }
}

/**
 * 加载同步历史
 */
async function loadSyncHistory() {
  try {
    const { syncHistory = [] } = await chrome.storage.local.get('syncHistory');
    const tbody = document.getElementById('historyBody');

    if (syncHistory.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-message">暂无同步记录</td></tr>';
      return;
    }

    tbody.innerHTML = syncHistory.slice(0, 20).map(record => {
      const date = new Date(record.timestamp);
      const dateStr = date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const tweetPreview = record.tweetText || '(无内容)';
      const category = record.category || '未分类';
      const statusIcon = record.success ? '✅' : '❌';

      return `
        <tr>
          <td>${dateStr}</td>
          <td class="tweet-preview">
            <a href="${record.tweetUrl}" target="_blank" title="${tweetPreview}">
              ${tweetPreview}
            </a>
          </td>
          <td><span class="category-badge">${category}</span></td>
          <td><span class="status-icon">${statusIcon}</span></td>
        </tr>
      `;
    }).join('');

  } catch (error) {
    console.error('加载同步历史失败:', error);
  }
}

/**
 * 重试失败的同步
 */
async function retryFailedSyncs() {
  try {
    const response = await chrome.runtime.sendMessage({ type: 'RETRY_FAILED_SYNCS' });

    if (response.success) {
      const { success, failed, total } = response.result;
      alert(`重试完成!\n成功: ${success}\n失败: ${failed}\n总计: ${total}`);
      await loadSyncHistory();
    } else {
      alert(`重试失败: ${response.error}`);
    }
  } catch (error) {
    alert(`重试失败: ${error.message}`);
  }
}

/**
 * 显示状态消息
 */
function showStatus(element, type, message) {
  element.className = `status ${type}`;
  element.textContent = message;
  element.style.display = 'block';
}
