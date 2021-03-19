// VARIABLES
const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
const router = express.Router();
const nunjucks = require('nunjucks');
const mysql = require('mysql');


// CONNECT TO DATABASE
var db = mysql.createConnection({
    host: '107.180.1.16',
    port: 3306,
    user: 'group12021',
    password: '2021group1',
    database: '2021group1'
});

nunjucks.configure('views', {
    autoescape: true,
    express : app
});

app.use(session({
    secret: 'groupOne',
    resave: true,
    saveUnitialized: true
}));

app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

// CONNECT THE DATABASE
db.connect(function(err) {
    if (err) throw err;
    console.log("MySQL Database is Connected.");
});

// GET LOGIN PAGE TO RENDER
app.get('/', function(req, res) {
    res.render('login.html')
});

// TAKE IN LOGIN DATA FROM LOGIN PAGE TO VALIDATE
app.post('/', function(req, res) {
    var username = req.body.username;
    var password = req.body.password;

    if (username && password) {
        db.query('SELECT * FROM Employees WHERE Username = ? AND Password = ?', [username, password], function(err, result, fields) {
            if (result.length > 0) {
                req.session.loggedin = true;
                req.session.username = username;
                res.redirect('/main');
            }
            else {
                res.render('login.html', { msg: 'Invalid Username and/or Password! Try again!'});
            }
        });
    } else {
        res.render('login.html', { msg: 'Please enter your Username and Password!'});
    }
});

// GET MAIN DASHBOARD PAGE
app.get('/main', function(req, res) {
    if (req.session.loggedin) {
        db.query('SELECT * FROM Employees WHERE Username = ?', [req.session.username], function(err, result, fields) {
            res.render('main.html', { account: result[0] });
        });
    } else {
        res.redirect('/')
    }
});

// GET REPORT / PERFORMANCE PAGE
app.get('/report', function(req, res) {
    res.render('report.html')
});

// GET TASK ASSIGNMENTS PAGE
app.get('/tasks', function(req, res) {
    res.render('tasks.html')
});

// GET TRAINING SCHEDULE PAGE
app.get('/schedule', function(req, res) {
    res.render('schedule.html')
});

// LOG USER OUT REDIRECT TO LOGIN PAGE
app.get('/logout', function(req, res) {
    req.session.destroy();
    res.redirect('/');
});


// db.query('SELECT * FROM Employees', function(err, result, fields) {
//     res.render('login.html', {account: result[0]});
// })


app.use('/', router);
app.listen(3000)
console.log('Website Sever Is Running on Port 3000. Access via LOCALHOST:3000');