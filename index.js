const express = require('express');
const AWS = require('aws-sdk');
const port = process.env.PORT || 5000;
const fileUpload = require('express-fileupload');
const Artwork = require('./models/artwork')
const User = require('./models/user')
const cors = require('cors'); // Import cors middleware
const mongoDB = require("./db");
mongoDB();
const app = express();

// Enable CORS for all routes
app.use(cors());

// Configure AWS
AWS.config.update({
    accessKeyId: process.env.ACCESS_KEY,
    secretAccessKey: process.env.SECRET_ACCESS_KEY,
    region: "us-east-1"
});

// Create S3 instance
const s3 = new AWS.S3();

// Use express-fileupload middleware
app.use(fileUpload());
app.use(express.json());
app.get("/", (req, res) => {
    res.send("Server is live and running as well as it should");
});

app.use('/api', require("./routes/userRoutes"));
// Route for uploading image
app.post('/upload', async (req, res) => {
    if (!req.files || !req.files.image) {
        return res.status(400).send('No image uploaded.');
    }

    const file = req.files.image;
    const fileContent = file.data;
    const params = {
        Bucket: process.env.BUCKET_NAME,
        Key: Date.now().toString() + '-' + file.name,
        Body: fileContent
    };

    // Upload to S3
    s3.upload(params, (err, data) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error uploading image to S3.');
        }
        console.log('File uploaded successfully.', data.Location);
        res.send('Image uploaded successfully!');
    });
    const uploadData = await s3.upload(params).promise();
    const artwork = new Artwork({
        image: uploadData.Location, // S3 object URL
        style: req.body.style,
        artist: req.body.artist, // Assuming this comes from the request body
        category: req.body.category,
        name: req.body.name
    });

    // Save Artwork to MongoDB
    await artwork.save();
});

app.get('/artwork', async (req, res) => {
    try {
        const { limit } = req.query;
        const randomArtworks = await Artwork.aggregate([
            { $sample: { size: parseInt(limit) } }
        ]);
        res.json(randomArtworks);
    } catch (error) {
        console.error('Error fetching random artworks:', error);
        res.status(500).send('Error fetching random artworks.');
    }
});

app.get('/allartwork', async (req, res) => {
    try {
        const allArtworks = await Artwork.find({});
        console.log('All Artworks:', allArtworks);
        res.json(allArtworks);
    } catch (error) {
        console.error('Error fetching all artworks:', error);
        res.status(500).send('Error fetching all artworks.');
    }
});

app.get('/allusers', async (req, res) => {
    try {
        const allUsers = await User.find({});
        console.log('All Users:', allUsers);
        res.json(allUsers);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).send('Error fetching all users.');
    }
});


app.get('/search', async (req, res) => {
    const { query } = req.query;

    if (!query) {
        return res.status(400).send('The "query" parameter is required.');
    }

    try {
        const artworks = await Artwork.find({ $text: { $search: query } });
        res.json(artworks);
    } catch (error) {
        console.error('Error searching for artworks:', error);
        res.status(500).send('Error searching for artworks.');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is listening at http://localhost:${port}`);
});
