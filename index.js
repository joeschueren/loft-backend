const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv").config();
const session = require("express-session");
const bcrypt = require("bcrypt");

const app = express();

app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use(cors({
    credentials: true,
    origin: "http://localhost:3000"
}));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 86400000 }
}));

mongoose.connect(process.env.MONGO_URL?.toString()).then(console.log("successfully connected"));

const postSchema = new mongoose.Schema({
    title: String,
    text: String,
    date: String,
})

const Post = new mongoose.model("Posts", postSchema);

app.post("/login", async function(req, res){
    const username = req.body.username;
    const password = req.body.password;

    const userAuth = username === process.env.EMAIL;

    let hash = process.env.PASSWORD;

    const passAuth = await bcrypt.compare(password, hash);

    if(userAuth && passAuth){
        req.session.isAuthenticated = true;
        res.status(200).json("Successfully Authenticated");
    }
    else{
        res.status(204).json("Authorization Failed");
    }
})

app.get("/check-auth", async function(req, res){
    if(req.session.isAuthenticated){
        res.status(200).json("Success");
    }
    else{
        res.status(401).json("Unauthorized");
    }
})

app.get("/get-post/:title", async function(req, res){

    const postTitle = req.params.title;

    try{
        const post = await Post.find({title: postTitle}).exec();

        if(post.length > 0){
            res.status(200).json(post);
        }
        else{
            res.status(404).json("No Post Found");
        }
    } catch(error) {
        res.status(500).json("Server Error");
    }
})

app.get("/get-posts", async function(req, res) {
    try{
        const posts = await Post.find({}).exec();
        res.status(200).json(posts);
    } catch(error) {
        console.log(error);
        res.status(500).json("Server Error");
    }
});

app.post("/add-post", async function(req, res) {
    const userPost = req.body;

    console.log(req.body);

    const timestamp = new Date().getTime();
    const formattedDate = new Date(timestamp).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });

    try{
        const newPost = new Post({
            title: userPost.title,
            text: userPost.text,
            date: formattedDate,
        })

        const post = await newPost.save();

        if(post){
            res.status(200).json("Successfully saved post");
        }
        else{
            res.status(500).json("Server Error");
        }

    } catch (error) {
        console.log(error);
        res.status(500).json("Server Error")
    }

});

app.post("/update", async(req, res) => {
    const _id = req.body._id;
    const title = req.body.newTitle;
    const text = req.body.text;

    if(req.session.isAuthenticated){
        const result = await Post.updateOne({_id: _id}, {$set: {title: title, text: text}});

        if(result){
            res.status(200).json("Successfully Update");
        }
        else{
            res.status(500).json("server error");
        }
    }
    else {
        res.status(401).json("Unauthorized");
    }
})

app.post("/delete", async(req, res) => {
    const title = req.body.title;

    if(req.session.isAuthenticated){
        const result = await Post.deleteOne({title: title}).exec();

        if(result.deletedCount){
            res.status(200).json("Successfully Deleted");
        }
        else{
            res.status(500).json("Server Error");
        }
    }
    else{
        res.status(401).json("unauthorized");
    }
})

app.listen(5000, () => {
    console.log("Server listening on port 5000");
});