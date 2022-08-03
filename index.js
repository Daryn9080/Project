// подключение необходимых модулей
const express = require("express");
const app = express();
const https = require('https')
//const path = require('path');
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const mongodb = require('mongodb');
const mongoose= require('mongoose')
const Joi= require('joi')

const signupSchema= Joi.object({
  name:Joi.string(),
  age:Joi.number(),
  city:Joi.string(),
  email:Joi.string().email().required(),
  password1:Joi.string().pattern(new RegExp('(?=.*[0-9])(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z])')),
    password2:Joi.ref('password1'),
    button:Joi.string()
})

app.use(bodyParser.json())
app.use(express.json())
app.use(bodyParser.urlencoded({extended:true})) // внедрение модули по обработке http запросов

/*let mongoClient=new mongodb.MongoClient('mongodb://localhost:27017',{
  useUnifiedTopology:true
})
mongoClient.connect(async function(error,mongo){
  if(!error){
let db=mongo.db('5assignment')
let coll= db.collection('users')
  }
  else{
    console.log(error)
  }
})*/
app.use(express.static('public'));
app.use(cookieParser()) // внедрение в наш сервер модуль по работе с cookies
app.use(bodyParser.urlencoded({extended:false})) // внедрение модули по обработке http запросов
app.use(session({
  secret: 'secret',
}))
app.set('view engine', 'ejs') // установка движка шаблонизатора ejs, чтобы работать с ejs файлами

app.get('/register', function(req, res){
  if(req.session.firstVisit){
    req.session.destroy();
  }
  res.render("register")
})


mongoose.connect('mongodb://localhost:27017/blog');
var db = mongoose.connection;
db.on('error',()=>console.log('Error in connecting to DB'))
db.once('open',()=>console.log('Connected to DB'))
var coll = db.collection("users")

app.post('/register', async (req, res) => {
  const {name, email, city, age, password1} = req.body; // деструктуризация содержания запроса с
  var data={
    'name': name,
    'age': age,
    'email':email,
    'city':city,
    'password':password1,
    'isAdmin': false
  }

  try {
    const findUser = await db.collection('users').findOne({email : email})
    console.log(findUser);
    if(findUser){
      console.log("this account is already exist");
    }else{
      const {error} = signupSchema.validate(req.body,{
        abortEarly:false
      })
      if(error){
        console.log(error);
        return res.send(error.details)
      }else{
        db.collection('users').insertOne(data, (err,collection)=>{
          if(err){
            throw err;
          }
          console.log("inserted succesfully")
        })
      }
    }
    res.redirect('login');
  } catch (e) {
    throw e;
  }
})

// if (!req.session.firstVisit) { // проверка условным оператором, на наличие сессии, чтобы проверять, первое ли это посещение
//   req.session.firstVisit = new Date().getTime() // количество миллисекунд с 1 января 1970 года
// }
// const firstVisit = (new Date().getTime() - req.session.firstVisit) / 1000 // разница между последним посещением и первым посещением деленая на 1000, чтобы вычислить секунды
// res.render("display", {name, email, city, age, firstVisit})

app.get('/login', (req,res)=>{
  res.render('login')
})
app.post('/login', async (req, res) => {
  // console.log(req.body);
  if (!req.session.firstVisit) { // проверка условным оператором, на наличие сессии, чтобы проверять, первое ли это посещение
    req.session.firstVisit = new Date().getTime() // количество миллисекунд с 1 января 1970 года
  }
  try {
    const findUser = await db.collection('users').findOne({email : req.body.email})
    // console.log(userFound);
    // res.cookie('username', userFound.username, {maxAge: 1000 * 3600}) // установка cookies для имени, фамилиии и email'
    if(!findUser || findUser.password !== req.body.password){
      console.log("Failure");
      res.redirect('/login');
    }else {
      const firstVisit = (new Date().getTime() - req.session.firstVisit) / 1000
      console.log("Success");
      console.log(findUser);
      res.render("display", {name: findUser.name, isAdmin : findUser.isAdmin, firstVisit : firstVisit})
    }
  } catch (e) {
    throw e;
  }
})



app.get("/currency", function (req, res){
  res.render(__dirname + "/currency.html")
})

app.post("/currency", function(req, res){
  console.log(req.body.from)
  console.log(req.body.to)

  var key = "&api_key=853a900324-5ab247f70a-rfrnx0"
  var from =req.body.from
  var to = req.body.to
  var http = require("http");
  var url = "https://api.fastforex.io/fetch-one?from=" + from + "&to=" + to + key
  https.get(url, function(response){
    var data = []
    response.on("data", function(chunk){
      data.push(chunk)
    })
    response.on("end", function(){
        console.log('-----------------------');
        console.log(
          JSON.parse(Buffer.concat(data).toString())
        )
      var money = JSON.parse(Buffer.concat(data).toString())
      var toCurrency = Object.keys(money.result)[0]
      var toCurrencyAmount =Object.values(money.result)[0]
      res.write("<h1>The currency from " + money.base + " to " + toCurrency + " is " + toCurrencyAmount+"</h1>")
      res.send()
    })
  })
})

app.get('/adminPanel', async function (req, res) {
  const allUsers = await db.collection('users').find().toArray();
  // console.log(allUsers);
  res.render('adminPanel', {allUsers})
})

app.post('/deleteUser', async function(req, res) {
  const {id} = req.body;
  const toDeleteF = await db.collection('users').findOne({__id: id})
  console.log("to delete");
  console.log(toDeleteF);
  const toDelete = await db.collection('users').deleteOne({__id: id})
  const allUsers = await db.collection('users').find().toArray();
  // console.log(allUsers);
  res.render('adminPanel', {allUsers})
})
app.post('/adminPanel', async function (req, res) {
  const allUsers = await db.collection('users').find().toArray();
  const {sortBy} = req.body
  const propComparator = (propName) => (a, b) =>
      a[propName] == b[propName] ? 0 : a[propName] < b[propName] ? -1 : 1
  allUsers.sort(propComparator(sortBy))
  // console.log(allUsers);
  res.render('adminPanel', {allUsers, sortBy})
})

app.post('/addUser', async function (req, res) {
  const allUsers = await db.collection('users').find().toArray();
  const {name, email, city, age, password1, isAdmin} = req.body; // деструктуризация содержания запроса с
  var data={
    'name': name,
    'age': age,
    'email':email,
    'city':city,
    'password':password1,
    'isAdmin': false
  }
  try {
    const findUser = await db.collection('users').findOne({email : email})
    console.log(findUser);
    if(findUser){
      console.log("this account is already exist");
    }else{
      const {error} = signupSchema.validate(req.body,{
        abortEarly:false
      })
      if(error){
        console.log(error);
        return res.send(error.details)
      }else{
        db.collection('users').insertOne(data, (err,collection)=>{
          if(err){
            throw err;
          }
          console.log("inserted succesfully")
        })
      }
    }
    res.render('adminPanel', {allUsers})
    // res.redirect('login');
  } catch (e) {
    throw e;
  }
})








app.listen(3000, function()
{
  console.log("3000 port");
})
