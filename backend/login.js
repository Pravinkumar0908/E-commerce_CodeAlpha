const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors({
    origin: '*', // Allow all origins for development; restrict in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Serve static files from frontend folder
const frontendPath = '/Users/pravinkumar/Ecommerce/frontend';
app.use(express.static(frontendPath));

// Initialize Firebase Admin SDK
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

// Serve index.html for root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Serve product-showcase.html at /products
app.get('/products', (req, res) => {
    res.sendFile(path.join(frontendPath, 'product-showcase.html'));
});

// Register route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userRecord = await admin.auth().createUser({
            email: `${username}@ecommerce.com`,
            password: password,
            displayName: username,
        });
        await db.collection('users').doc(userRecord.uid).set({
            username: username,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).json({ success: true, message: 'User registered successfully', uid: userRecord.uid });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// Login route
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await admin.auth().getUserByEmail(`${username}@ecommerce.com`);
        res.json({ success: true, message: 'Login successful', uid: user.uid });
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ success: false, message: 'Invalid credentials' });
    }
});

// Fetch user data
app.get('/user/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: userDoc.data() });
    } catch (error) {
        console.error('User fetch error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
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
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});