const express = require('express');
const fs = require('fs');
const readline = require('readline');
const { MongoClient } = require('mongodb');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;


const uri = "mongodb+srv://ellalesperance1:5f0tswkweOirORqr@cluster0.l7npyes.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

// Connect to MongoDB
async function connectToMongo() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        return client.db('Stock').collection('PublicCompanies');
    } catch (error) {
        console.error('Failed to connect to MongoDB', error);
        process.exit(1);
    }
}

// Middleware to serve static files and parse URL-encoded bodies
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Serve the home page with the form
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

// Handle the form submission and process data
app.get('/process', async (req, res) => {
    const { search, type } = req.query;
    const collection = await connectToMongo();

    let query = type === 'company' ? { companyName: { $regex: search, $options: 'i' } } : { stockTicker: { $regex: search, $options: 'i' } };
    try {
        const results = await collection.find(query).toArray();
        const promises = results.map(async (company) => {
            company.currentPrice = await fetchStockPrice(company.stockTicker);
            return company;
        });
        const resultsWithPrices = await Promise.all(promises);
        res.send(resultsWithPrices);
    } catch (error) {
        console.error('Error querying MongoDB', error);
        res.status(500).send('Error processing your request');
    }
});

// Function to fetch real-time stock prices from Alpha Vantage
async function fetchStockPrice(stockTicker) {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${stockTicker}&apikey=1SMRBU9X0JEEJIQ0`;
    try {
        const response = await axios.get(url);
        return response.data["Global Quote"]["05. price"];
    } catch (error) {
        console.error(`Error fetching stock price for ${stockTicker}:`, error);
        return 'Unavailable';
    }
}

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
