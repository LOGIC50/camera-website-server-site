const express = require('express');
const app = express();
const cors = require('cors');
const admin = require("firebase-admin");
require ('dotenv').config();
const { MongoClient } = require('mongodb');
var ObjectId = require('mongodb').ObjectID;

const port = process.env.PORT || 5000;


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lsk7p.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
console.log(uri);

async function verifyToken (req, res, next){
    if(req.headers?.authorization?.startsWith('Bearer ')){
        const token = req.headers.authorization.split(' ')[1];

        try{
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch{

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db('cameraStore');
        const productsCollection = database.collection('products');
        const reviewsCollection = database.collection('reviews');
        const usersCollection = database.collection('users');

        // GET PRODUCTS API
        app.get('/products', async(req, res) => {
            const cursor = productsCollection.find({});
            const products = await cursor.toArray();
            res.send(products);
        })

        // GET SINGLE PRODUCT API
        app.get('/products/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await productsCollection.findOne(query);
            res.json(result);
            console.log(result);
        })

        // GET REVIEW API
        app.get('/reviews', async(req, res) => {
            const cursor = reviewsCollection.find({});
            const reviews = await cursor.toArray();
            res.send(reviews);
        })

        // POST REVIEW API
        app.post('/reviews', async(req, res) => {
            const review = req.body;
            const result = await reviewsCollection.insertOne(review);
            res.json(review);
        })

        // POST PRODUCTS API
        app.post('/products', async(req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(product);
        })

        app.get('/users/:email', async(req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if(user?.role === 'admin'){
                isAdmin = true;
            }
            res.json({admin: isAdmin})
        })

        // POST USER API
        app.post('/users', async(req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result);
            console.log(result);
        })

        // UPSERT USER DATA
        app.put('/users', async(req, res) => {
            const user = req.body;
            const filter = {email: user.email};
            const options = {upsert: true};
            const updateDoc = {$set: user};
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

        app.put('/users/admin', verifyToken, async(req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if(requester){
                const requesterAccount = await usersCollection.findOne({email: requester})
                if(requesterAccount.role === 'admin'){
                    const filter = {email: user.email};
            const updateDoc = {$set: {role: 'admin'}}
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.json(result);
                }
            }
            else{
                res.status(403).json({message: 'You do not have access to make admin'})
            }
            
            
        })

        // DELETE PRODUCTS API
        app.delete('/products/:id', async(req, res) => {
           const id = req.params.id;
           const query = {_id:ObjectId(id)};
           const result = await productsCollection.deleteOne(query);
           res.json(result);
          
        })
    }
    finally{
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello Logic Camera Store, Welcome')
})


app.listen(port, () => {
    console.log(`listening at ${port}`)
});

