const express = require('express')
var cors = require('cors')
require('dotenv').config()
const app = express()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;

// middleware
app.use(cors())
app.use(express.json());

// jwt web token
// function jwtVerify(req, res, next) {
//     const token = req.headers.authorization.split(' ')[1];
//     console.log(req.headers.authorization);

//     if (!token) {
//         return res.status(401).json({ error: true, message: 'Unauthorized access: Token missing' });
//     }

//     jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
//         if (err) {
//             return res.status(401).json({ error: true, message: 'Unauthorized access: Invalid token' });
//         }
//         req.decoded = decoded;
//         next();
//     });
// }
function jwtVerify(req, res, next) {
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
        const menuCollection = client.db("bistro-boss").collection("menu");
        const reviewCollection = client.db("bistro-boss").collection("reviews");
        const cartCollection = client.db("bistro-boss").collection("carts");
        const bookingCollection = client.db("bistro-boss").collection("bookings");

        // menu related apis
        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        // reviews related apis
        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })
        app.post('/reviews', jwtVerify, async (req, res) => {
            const review = req.body;
            // console.log(review);
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })

        // table booking api
        app.post('/booking', jwtVerify, async (req, res) => {
            const bookings = req.body.data;
            const result = await bookingCollection.insertOne(bookings)
            res.send(result)
        })

        app.get('/booking', jwtVerify, async (req, res) => {
            const email = req.query.email;
            if (req.decoded.email != email) {
                res.status(403).send({ error: true, message: 'Forbidden access' })
            }
            const query = { email: email }
            const result = await bookingCollection.find().toArray()
            res.send(result)
        })

        app.delete('/booking/:id', jwtVerify, async (req, res) => {
            // const email = req.query.email;
            // if (req.decoded.email != email) {
            //     res.status(403).send({ error: true, message: 'Forbidden access' })
            // }
            const id = req.params.id
            console.log(id);
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
        app.delete('/cart/:id', jwtVerify, async (req, res) => {
            const email = req.decoded.email;
            const accesEmail = req.query.email;
            if (email !== accesEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access : Email not verified' })
            }
            // console.log(email);
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result);
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