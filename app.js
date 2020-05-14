//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose"); 
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("/public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));



//session
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {useUnifiedTopology: true, useNewUrlParser: true});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = new mongoose.model("User", userSchema)

passport.use(User.createStrategy());
 
// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());




//GET home, login and register pages ----------------------------------------
app.get('/', (req, res)=>{
    res.render('home');
})
app.get('/login', (req, res)=>{
    res.render('login');
})
app.get('/register', (req, res)=>{
    res.render('register');
})

//check if user is logged in already
// app.get('/secrets', (req, res)=>{
//     if(req.isAuthenticated()){
//         res.render("secrets");
//     } else{
//         res.redirect("login");
//     }
// })

app.get('/secrets', (req, res)=>{
    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if (err){
          console.log(err);
        } else {
          if (foundUsers) {
            res.render("secrets", {usersWithSecrets: foundUsers});
          }
        }
      });
})
//POST register and login----------------------------------------------------------------------------
app.post('/register', (req, res)=>{
    User.register({username: req.body.username}, req.body.password, (err, user)=>{
        if(err){
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("secrets");
            })
        }
    })
})



app.post('/login', (req, res)=>{
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })
    
    req.login(user, (err)=>{
        if(err){
            console.log(err);
        } else{
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("secrets");
            })
        }
    })
})

app.get('/logout', (req, res)=>{
    req.logout();
    res.redirect("/");
})

//post a secret =-=====================================
app.get('/submit', (req, res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    } else{
        res.redirect("login");
    }
})
app.post('/submit', (req, res)=>{
    const submittedSecret = req.body.secret;

//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
})

app.listen(3000, ()=>{
    console.log('Listening on port 3000');
})