const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// 启用 CORS
app.use(cors());

// 解析 JSON
app.use(express.json());

// osu! API 代理端点
app.get('/api/users/lookup', async (req, res) => {
    try {
        const userIds = req.query['ids[]'];
        if (!userIds) {
            return res.status(400).json({ error: 'Missing user ID parameter' });
        }

        const response = await fetch(
            `https://osu.ppy.sh/users/lookup?ids%5B%5D=${userIds}`
        );

        if (!response.ok) {
            return res.status(response.status).json({
                error: `osu! API returned ${response.status}: ${response.statusText}`
            });
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({ error: error.message });
    }
});

// 获取当前用户信息（包括好友列表）
app.get('/api/current-user', async (req, res) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: 'Missing userId parameter' });
        }

        const response = await fetch(`https://osu.ppy.sh/users/${userId}`);

        if (!response.ok) {
            return res.status(response.status).json({
                error: `osu! API returned ${response.status}: ${response.statusText}`
            });
        }

        const html = await response.text();

        // 提取 json-current-user script 标签内容
        const scriptMatch = html.match(/<script id="json-current-user" type="application\/json">\s*([\s\S]*?)\s*<\/script>/);

        if (!scriptMatch) {
            return res.status(404).json({ error: 'Current user data not found in page' });
        }

        console.log(scriptMatch)

        const userData = JSON.parse(scriptMatch[1]);
        console.log(userData)
        res.json(userData);
    } catch (error) {
        console.error('Error fetching current user info:', error);
        res.status(500).json({ error: error.message });
    }
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

app.listen(PORT, () => {
    console.log(`🚀 Proxy server running on http://localhost:${PORT}`);
    console.log(`📝 API endpoint: http://localhost:${PORT}/api/users/lookup`);
});
