const express = require('express');
const fs = require('fs');
const readline = require('readline');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// Ensure MongoDB URI is secured and not hard-coded in production
const uri = "mongodb+srv://ellalesperance1:5f0tswkweOirORqr@cluster0.l7npyes.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.get('/process', async (req, res) => {
    const { search, type } = req.query;
    let collection;
    try {
        await client.connect();
        collection = client.db('Stock').collection('PublicCompanies');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        res.status(500).send('Database connection failed');
        return;
    }

    let query = type === 'company' ? { companyName: { $regex: search, $options: 'i' } } : { stockTicker: { $regex: search, $options: 'i' } };
    try {
        const results = await collection.find(query).toArray();
        const promises = results.map(async (company) => {
            company.currentPrice = await fetchStockPrice(company.stockTicker);
            return company;
        });
        const resultsWithPrices = await Promise.all(promises);
        res.json(resultsWithPrices);
    } catch (error) {
        console.error('Error querying MongoDB', error);
        res.status(500).send('Error processing your request');
    } finally {
        await client.close();
    }
});

async function fetchStockPrice(stockTicker) {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockTicker}&apikey=1SMRBU9X0JEEJIQ0`;
    try {
        const response = await axios.get(url);
        if (response.data && response.data["Global Quote"]) {
            return response.data["Global Quote"]["05. price"];
        } else {
            throw new Error('Invalid API response');
        }
    } catch (error) {
        console.error(`Error fetching stock price for ${stockTicker}:`, error);
        return 'Unavailable';
    }
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
