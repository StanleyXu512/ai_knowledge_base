// 添加对话历史数组
let conversationHistory = [];

// 添加你的 API Key
const API_KEY = 'sk-252024d0066d4fcf80e490647a4104c6'; // 请替换为你的实际 API Key
const API_URL = 'https://api.deepseek.com/chat/completions';

let isStreaming = false;
let abortController = null;
let reader = null;  // 添加reader变量

async function submitQuestion() {
    const question = document.getElementById('question-input').value;
    if (question.trim() === '') return;

    // 切换按钮状态
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.textContent = '停止';
    submitBtn.onclick = stopStreaming;
    isStreaming = true;
    abortController = new AbortController();

    // 添加用户消息
    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    
    // 添加消息内容
    const messageContent = document.createElement('div');
    messageContent.textContent = question;
    userMessage.appendChild(messageContent);
    
    // 添加用户头像（调整到右侧）
    const userAvatar = document.createElement('div');
    userAvatar.className = 'user-avatar';
    userMessage.appendChild(userAvatar);

    document.getElementById('chat-body').appendChild(userMessage);

    // 清空输入框
    document.getElementById('question-input').value = '';

    // 滚动到底部
    const chatBody = document.getElementById('chat-body');
    chatBody.scrollTop = chatBody.scrollHeight;

    // 添加用户消息到对话历史
    conversationHistory.push({ role: 'user', content: question });

    // 确保消息交替
    if (conversationHistory.length > 1) {
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        const secondLastMessage = conversationHistory[conversationHistory.length - 2];
        
        if (lastMessage.role === secondLastMessage.role) {
            // 如果最后两条消息角色相同，插入一个空消息来强制交替
            conversationHistory.splice(conversationHistory.length - 1, 0, {
                role: lastMessage.role === 'user' ? 'assistant' : 'user',
                content: ''
            });
        }
    }

    try {
        // 确保最后一条消息是用户消息
        if (conversationHistory.length > 0 && 
            conversationHistory[conversationHistory.length - 1].role !== 'user') {
            conversationHistory.push({ role: 'user', content: '' });
        }
        try {
            // 确保最后一条消息是用户消息
            if (conversationHistory.length > 0 && 
                conversationHistory[conversationHistory.length - 1].role !== 'user') {
                conversationHistory.push({ role: 'user', content: '' });
            }

            // 直接开始流式输出
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    model: 'deepseek-reasoner',
                    messages: conversationHistory,
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true,
                    prefix: true  // 添加prefix参数
                })
            });

            // 创建系统消息容器
            const systemMessage = document.createElement('div');
            systemMessage.className = 'answer';
            
            // 添加AI头像
            const botAvatar = document.createElement('div');
            botAvatar.className = 'bot-avatar';
            systemMessage.appendChild(botAvatar);
            
            // 添加思考过程容器
            const thinkingContainer = document.createElement('div');
            thinkingContainer.className = 'thinking reasoning-process';  // 确保这里添加了正确的类名
            systemMessage.appendChild(thinkingContainer);
            
            // 添加消息内容容器
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content'; // 添加 className
            systemMessage.appendChild(messageContent);
            
            document.getElementById('chat-body').appendChild(systemMessage);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = '';
            let isThinking = true;

            while (isStreaming) {
                const { done, value } = await reader.read();
                if (done) {
                    resetSubmitButton();  // 添加这行代码
                    break;
                }

                const chunk = decoder.decode(value);
                result += chunk;

                // 解析流式数据
                const lines = result.split('\n');
                result = lines.pop();

                for (let line of lines) {
                    if (line.trim() === '[DONE]') {
                        break;
                    }
                    
                    if (line.startsWith('data: ')) {
                        try {
                            // 跳过空行和[DONE]标记
                            const dataStr = line.slice(6).trim();
                            if (dataStr === '' || dataStr === '[DONE]') continue;
                            
                            const data = JSON.parse(dataStr);
                            // 处理思考过程
                            if (data.choices[0].delta.reasoning_content) {
                                const reasoningText = document.createElement('span');
                                reasoningText.className = 'reasoning-text';
                                reasoningText.textContent = data.choices[0].delta.reasoning_content;
                                thinkingContainer.appendChild(reasoningText);
                            }
                            // 处理最终结论
                            if (data.choices[0].delta.content) {
                                messageContent.textContent += data.choices[0].delta.content;
                            }

                            // 滚动到底部
                            chatBody.scrollTop = chatBody.scrollHeight;

                            // 检测思考过程结束
                            if (data.choices[0].finish_reason === 'stop') {
                                isThinking = false;
                                
                                // 获取最终内容
                                const finalContent = thinkingContainer.textContent + messageContent.textContent;
                                
                                // 替换整个消息内容，将结论放在思考过程下方
                                messageContent.innerHTML = `
                                    <div class="reasoning-title">思考过程：</div>
                                    <div class="completed-reasoning">${customMarkdownParser(thinkingContainer.textContent)}</div>
                                    <div class="reasoning-divider">结论：</div>
                                    <div class="conclusion">${customMarkdownParser(messageContent.textContent)}</div>
                                `;
                                
                                // 添加动画效果
                                setTimeout(() => {
                                    const elements = messageContent.querySelectorAll('.completed-reasoning, .reasoning-divider, .conclusion');
                                    elements.forEach((el, index) => {
                                        setTimeout(() => {
                                            el.classList.add('show');
                                        }, index * 100); // 每个元素间隔100ms
                                    });
                                }, 10);
                                
                                // 将AI回复添加到对话历史
                                conversationHistory.push({
                                    role: 'assistant',
                                    content: finalContent
                                });
                                
                                // 移除思考过程容器
                                systemMessage.removeChild(thinkingContainer);
                                
                                resetSubmitButton();  // 添加这行代码
                            }
                        } catch (e) {
                            console.error('解析错误:', e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            alert(`请求失败: ${error.message}`);
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`请求失败: ${error.message}`);
    }
}

// 添加回车发送功能
document.getElementById('question-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitQuestion();
    }
});


function customMarkdownParser(markdown) {
    // 解析标题
    markdown = markdown.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    markdown = markdown.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    markdown = markdown.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    // 解析加粗和斜体
    markdown = markdown.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    markdown = markdown.replace(/\*(.*)\*/gim, '<em>$1</em>');

    // 解析代码块和内联代码
    markdown = markdown.replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>');
    markdown = markdown.replace(/`(.*?)`/gim, '<code>$1</code>');

    // 解析列表
    markdown = markdown.replace(/^\s*\n\*(.*)/gim, '<ul>\n<li>$1</li>\n</ul>');
    markdown = markdown.replace(/^\s*\n-(.*)/gim, '<ul>\n<li>$1</li>\n</ul>');
    markdown = markdown.replace(/^\s*\n\d+\.(.*)/gim, '<ol>\n<li>$1</li>\n</ol>');

    // 解析链接和图片
    markdown = markdown.replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2">');
    markdown = markdown.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>');

    // 解析引用
    markdown = markdown.replace(/^>\s*(.*)/gim, '<blockquote>$1</blockquote>');

    // 解析段落
    markdown = markdown.replace(/\n\n/gim, '</p><p>');
    markdown = markdown.replace(/\n/gim, '<br>');

    return `<p>${markdown}</p>`;}

function stopStreaming() {
    if (abortController) {
        abortController.abort();
    }
    if (reader) {
        reader.cancel();  // 显式取消reader
    }
    isStreaming = false;
    resetSubmitButton();
}

function resetSubmitButton() {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.textContent = '发送';
    submitBtn.onclick = submitQuestion;
}
