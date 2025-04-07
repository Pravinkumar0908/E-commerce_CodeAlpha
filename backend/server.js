const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files
const frontendPath = '/Users/pravinkumar/Ecommerce/frontend';
app.use(express.static(frontendPath));

// Initialize Firebase
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://com-e-53f91.firebaseio.com'
    });
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Error initializing Firebase:', error);
    process.exit(1);
}

const db = admin.firestore();

// Serve product-showcase.html at /products
app.get('/products', (req, res) => {
    res.sendFile(path.join(frontendPath, 'product-showcase.html'));
});

// Fetch products
app.get('/api/products', async (req, res) => {
    console.log('Fetching products from /api/products');
    try {
        const snapshot = await db.collection('products').orderBy('createdAt', 'desc').get();
        if (snapshot.empty) {
            console.log('No products found');
            return res.json([]);
        }
        const products = [];
        snapshot.forEach(doc => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log('Products fetched:', products);
        res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products', message: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});