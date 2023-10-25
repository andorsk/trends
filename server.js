const express = require('express');
const googleTrends = require('google-trends-api');

const app = express();
const PORT = 3002;

app.use(express.static('public'));

app.get('/trends', async (req, res) => {
    try {
        const keyword = req.query.keyword || 'Bitcoin';
        const results = await googleTrends.interestOverTime({ keyword, startTime: new Date('2019-01-01') });
        res.json(JSON.parse(results));
    } catch (err) {
        console.error('Error:', err);
        res.status(500).send('Error fetching trends data.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
