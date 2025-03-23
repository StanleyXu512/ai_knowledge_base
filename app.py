from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

# 简单的知识库，实际应用中可以替换为数据库
knowledge_base = {
    "什么是人工智能": "人工智能是指让计算机模拟人类智能的技术。",
    "AI 有哪些应用领域": "AI 的应用领域包括医疗、交通、金融等。"
}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ask', methods=['POST'])
def ask():
    data = request.get_json()
    question = data.get('question')
    answer = knowledge_base.get(question, "抱歉，未找到相关答案。")
    return jsonify({"answer": answer})

if __name__ == '__main__':
    app.run(debug=True)