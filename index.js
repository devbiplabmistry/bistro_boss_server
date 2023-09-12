const express = require('express')
var cors = require('cors')
require('dotenv').config()
const app = express()
const jwt = require('jsonwebtoken');
const payment_token = process.env.PAYMENT_token;
const stripe = require("stripe")(payment_token);
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json());


function verifyJWT(req, res, next) {
    const authorizationHeader = req.headers.authorization;

    if (!authorizationHeader) {
        return res.status(401).json({ error: true, message: 'Unauthorized access: Token missing' });
    }

    const token = authorizationHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: true, message: 'Unauthorized access: Token missing' });
    }

    jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: true, message: 'Unauthorized access: Invalid token' });
        }
        req.decoded = decoded;
        next();
    });
}
app.post('/jwt', (req, res) => {
    const user = req.body;
    const email = user?.email;
    const token = jwt.sign({
        email,
    }, process.env.SECRET_TOKEN, { expiresIn: '2h' });
    res.send({ token })
})
// mongodb connected
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const e = require('express');
const uri = "mongodb+srv://bistro-boss:BU5uzfJ4zycGCtqR@cluster0.ovmmvr6.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        // database collections
        const userCollection = client.db("bistro-boss").collection("users");
        const menuCollection = client.db("bistro-boss").collection("menu");
        const reviewCollection = client.db("bistro-boss").collection("reviews");
        const cartCollection = client.db("bistro-boss").collection("carts");
        const bookingCollection = client.db("bistro-boss").collection("bookings");
        const paymentCollection = client.db("bistro-boss").collection("payments");




        // verify Admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.roll !== 'Admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' });
            }
            next();
        }

        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { admin: user?.roll === 'Admin' }
            res.send(result);
        })

        // users apis
        app.get("/user", verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })
        app.put("/user/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    roll: "Admin"
                },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result)

        })
        app.delete("/user/:id", verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        app.post("/users", async (req, res) => {
            const user = req.body;
            const userEmail = user?.email;
            if (!userEmail) {
                return res.status(400).json({ error: true, message: "Email is required" });
            }
            const existingUser = await userCollection.findOne({ email: userEmail });
            if (existingUser) {
                return res.status(409).json({ error: true, message: "Email already exists" });
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        // menu related apis
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        app.post('/addItem',verifyJWT,verifyAdmin, async (req, res) => {
            const menu =req.body;
            const email =req.query.email;
            const loggedUser =req.decoded.email;
            if(loggedUser !=email){
                return res.status(403).send({error:true,message:'forbidden access'})
            }
            const result =await menuCollection.insertOne(menu)
            res.send(result)
        })



        // reviews related apis
        app.get('/reviews', async (req, res) => {
            const userEmail = req.query.email
            const query = { email: userEmail }
            const result = await reviewCollection.find(query).toArray()
            res.send(result)
        })
        app.post('/reviews', verifyJWT, async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })
        // table booking api
        app.post('/booking', verifyJWT, async (req, res) => {
            const bookings = req.body.data;
            const result = await bookingCollection.insertOne(bookings)
            res.send(result)
        })
        app.get('/booking', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await bookingCollection.find(query).toArray()
            res.send(result)
        })
        app.delete('/booking/:id', verifyJWT, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query)
            res.send(result)
        })
        // carts related apis
        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })
        app.post('/carts', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }
            const doc = req.body
            const result = await cartCollection.insertOne(doc);
            res.send(result)
        })
        // cart deleted by users 
        app.delete('/cart/:id', verifyJWT, async (req, res) => {
            const email = req.decoded.email;
            const accessEmail = req.query.email;
            if (email !== accessEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access : Email not verified' })
            }
            // console.log(email);
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result);
        })
        // payment related API's:
        app.get('/payments', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const result = await paymentCollection.find(query).toArray()
            res.send(result)
        })
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
            const { price } = req.body;
            // console.log(price);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: price * 100,
                currency: 'usd',
                "payment_method_types": [
                    "card"
                ],
            })
            res.send({
                clientSecret: paymentIntent.client_secret,
            })

        })

        app.post('/payments', verifyJWT, async (req, res) => {
            const { payments } = req.body;
            // console.log(payments);
            const result = await paymentCollection.insertOne(payments)
            const query = { _id: { $in: payments.menuCartId.map(id => new ObjectId(id)) } };
            const deleteResult = await cartCollection.deleteMany(query)
            res.send({ result, deleteResult })
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);
app.get('/', (req, res) => {
    res.send('Boss is sitting !!')
})
app.listen(port, () => {
    console.log(`Boss app listening on port ${port}`)
})