// 添加对话历史数组
let conversationHistory = [];

// 添加你的 API Key
const API_KEY = 'sk-213c0b9f7e394fc8bb9eeb5e35e2f8b6'; // 请替换为你的实际 API Key
const API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function submitQuestion() {
    const question = document.getElementById('question-input').value;
    if (question.trim() === '') return;

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

    try {
        // 调用 deepseek 官方 API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'deepseek-chat', // 修改为正确的模型名称
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        // 添加响应状态检查
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API 请求失败: ${errorData.error?.message || '未知错误'}`);
        }

        const data = await response.json();
        const answer = data.choices[0].message.content;

        // 添加系统消息
        const systemMessage = document.createElement('div');
        systemMessage.className = 'answer';
        
        // 添加AI头像
        const botAvatar = document.createElement('div');
        botAvatar.className = 'bot-avatar';
        systemMessage.appendChild(botAvatar);
        
        // 添加消息内容
        const messageContent = document.createElement('div');
        messageContent.textContent = answer;
        systemMessage.appendChild(messageContent);

        document.getElementById('chat-body').appendChild(systemMessage);

        // 添加系统消息到对话历史
        conversationHistory.push({ role: 'assistant', content: answer });

        // 滚动到底部
        chatBody.scrollTop = chatBody.scrollHeight;

        try {
            // 移除以下非流式输出的API调用
            // const response = await fetch(API_URL, {
            //     method: 'POST',
            //     headers: {
            //         'Content-Type': 'application/json',
            //         'Authorization': `Bearer ${API_KEY}`,
            //         'Accept': 'application/json'
            //     },
            //     body: JSON.stringify({
            //         model: 'deepseek-chat',
            //         messages: conversationHistory,
            //         temperature: 0.7,
            //         max_tokens: 1000
            //     })
            // });
            
            // 移除以下非流式输出的响应处理
            // if (!response.ok) {
            //     const errorData = await response.json();
            //     throw new Error(`API 请求失败: ${errorData.error?.message || '未知错误'}`);
            // }
            
            // const data = await response.json();
            // const answer = data.choices[0].message.content;
            
            // 移除以下非流式输出的消息显示
            // const systemMessage = document.createElement('div');
            // systemMessage.className = 'answer';
            // const botAvatar = document.createElement('div');
            // botAvatar.className = 'bot-avatar';
            // systemMessage.appendChild(botAvatar);
            // const messageContent = document.createElement('div');
            // messageContent.textContent = answer;
            // systemMessage.appendChild(messageContent);
            // document.getElementById('chat-body').appendChild(systemMessage);
            // conversationHistory.push({ role: 'assistant', content: answer });
            // chatBody.scrollTop = chatBody.scrollHeight;
            
            // 直接开始流式输出
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                    'Accept': 'text/event-stream'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: conversationHistory,
                    temperature: 0.7,
                    max_tokens: 1000,
                    stream: true
                })
            });
            
            // 创建系统消息容器
            const systemMessage = document.createElement('div');
            systemMessage.className = 'answer';
            
            // 添加AI头像
            const botAvatar = document.createElement('div');
            botAvatar.className = 'bot-avatar';
            systemMessage.appendChild(botAvatar);
            
            // 添加消息内容容器
            const messageContent = document.createElement('div');
            systemMessage.appendChild(messageContent);
            
            // 添加思考过程容器
            const thinkingContainer = document.createElement('div');
            thinkingContainer.className = 'thinking';
            systemMessage.appendChild(thinkingContainer);
        
            document.getElementById('chat-body').appendChild(systemMessage);
        
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let result = '';
            let isThinking = true;
        
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
        
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
                            const data = JSON.parse(line.slice(6));
                            if (data.choices[0].delta.content) {
                                if (isThinking) {
                                    thinkingContainer.textContent += data.choices[0].delta.content;
                                } else {
                                    messageContent.textContent += data.choices[0].delta.content;
                                }
        
                                // 滚动到底部
                                chatBody.scrollTop = chatBody.scrollHeight;
                            }
        
                            // 检测思考过程结束
                            if (data.choices[0].finish_reason === 'stop') {
                                isThinking = false;
                                thinkingContainer.remove();
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