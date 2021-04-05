// VARIABLES
const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
const router = express.Router();
const nunjucks = require('nunjucks');
const mysql = require('mysql');
const { errorMonitor } = require('events');

// OTHER VARIABLES
let user_EmployeeID;
let user_EmployeeStatus;
let user_MentorId;
let user_MenteeId;
let tasks_list = [];
let todayDate = new Date().toLocaleString();
let upcomingTasks;
let upcomingTrainings;

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
                user_EmployeeID = result[0].EmployeeID;
                user_EmployeeStatus = result[0].Employee_Status;
                
                if (user_EmployeeStatus == 0)
                {
                    db.query('SELECT * FROM Mentees WHERE EmployeeID = ?', [user_EmployeeID], function (err, result, fields) {
                        user_MenteeId = result[0].MenteeID;
                        user_MentorId = result[0].MentorID;
                    });
                }
                else if (user_EmployeeStatus == 1)
                {
                    db.query('SELECT * FROM Mentors WHERE EmployeeID = ?', [user_EmployeeID], function (err, result, fields) {
                        user_MentorId = result[0].MentorID;
                        db.query('SELECT * FROM Mentees WHERE MentorID = ?', [user_MentorId], function (err, result, fields) {
                            user_MenteeId = result[0].MenteeID;
                        });
                    });

                }
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
    if (req.session.loggedin) 
    {
        if (user_EmployeeStatus == 0)
        {
            let trainingCompletedCount = 0;

            db.query('SELECT * FROM Employees WHERE EmployeeID = ?', [user_EmployeeID], function(err, result, fields)
            {
                db.query('SELECT COUNT(Training_ID) AS trainings FROM Training WHERE Training_Feedback IN (1,2,3,4,5) AND MenteeID = ?', [user_MenteeId], function(err, trainingResults) {
                    trainingCompletedCount = trainingResults[0].trainings;
                    console.log(trainingCompletedCount);
                });
                
                db.query('SELECT * FROM Employees JOIN Mentors ON Employees.EmployeeID = Mentors.EmployeeID WHERE MentorID = ?', [user_MentorId], function(err, resultTwo, fields) {
                    console.log(resultTwo[0]);
                    res.render('main.html', { mainAccount: result[0], accountTwo: resultTwo[0], status: 'Mentee', trainingCompleted: trainingCompletedCount, todayDate: todayDate});
                });
            });
        }
        else if (user_EmployeeStatus == 1)
        {
            db.query('SELECT * FROM Employees WHERE EmployeeID = ?', [user_EmployeeID], function(err, result, fields)
            {
                db.query('select * from Employees join Mentees join Mentors on Mentees.EmployeeID = Employees.EmployeeID and Mentors.MentorID = Mentees.MentorID where Mentees.MentorID = ?', [user_MentorId], function(err, resultTwo, fields) {
                    res.render('main.html', { mainAccount: result[0], accountTwo: resultTwo[0], status: 'Mentor', todayDate: todayDate});
                })
            });
            
            

            // db.query('SELECT * FROM Employees WHERE EmployeeID = ?', [user_EmployeeID], function(err, result, fields)
            // {
            //     db.query('SELECT * FROM Employees JOIN Mentees ON Employees.EmployeeID = Mentees.EmployeeID WHERE MenteeID = ?', [user_MenteeId], function(err, resultTwo, fields) {
            //         console.log(resultTwo[0]);
            //         res.render('main.html', { mainAccount: result[0], accountTwo: resultTwo[0], status: 'Mentee', color: '#3693D0'  });
            //     });
            // });
        }
    }
    else 
    {
        res.redirect('/')
    }
});



// GET REPORT / PERFORMANCE PAGE
app.get('/report', function(req, res) {
    if (req.session.loggedin)
    {
        db.query('SELECT * FROM Tasks T JOIN Training TR JOIN Feedback FB ON T.Task_ID = TR.Task_ID AND TR.Training_Feedback = FB.FeedbackID WHERE TR.Training_Feedback is not Null AND TR.MenteeID = ?', [user_MenteeId], function(err, resultsReport) {
            console.log(resultsReport);
            db.query('SELECT * FROM Feedback', function(err, feedbacksResult) {
                console.log(feedbacksResult);
                res.render('report.html', {resultsReport: resultsReport, employeeStatus: user_EmployeeStatus, feedbacks: feedbacksResult});
            })
        });
    }
});

// GET TASK ASSIGNMENTS PAGE
app.get('/tasks', function(req, res) {
    console.log(req.session.loggedin)
    console.log(req.session)
    if (req.session.loggedin) {
        if (user_EmployeeStatus == 0) {
            db.query('SELECT * FROM Tasks JOIN Training ON Tasks.Task_ID = Training.Task_ID WHERE Training.Training_Feedback is NULL AND Training.MenteeID = ?', [user_MenteeId], function(err, resultsThree) {
                upcomingTasks = resultsThree;
                console.log(resultsThree);
            });

            db.query('SELECT COUNT(Task_ID) AS trainings FROM Training WHERE Training_Feedback IN (1,2,3,4,5) AND MenteeID = ?', [user_MenteeId], function(err, trainingResults) {
                trainingCompletedCount = trainingResults[0].trainings;
            res.render('tasks.html', {employeeStatus: user_EmployeeStatus, trainingCompletedCount: trainingCompletedCount, upcomingTasks: upcomingTasks});
            });
        }
        else if (user_EmployeeStatus == 1) {
            db.query('SELECT * FROM Tasks JOIN Training ON Tasks.Task_ID = Training.Task_ID WHERE Training.Training_Feedback is NULL AND Training.MentorID = ?', [user_MentorId], function(err, resultsThree) {
                upcomingTasks = resultsThree;
                console.log(resultsThree);
                res.render('tasks.html', {employeeStatus: user_EmployeeStatus, upcomingTasks: resultsThree});
            });
        }
    } else {
        res.redirect('/')
    }
    // if (user_EmployeeStatus == 0)
    // {

    //     db.query('SELECT * FROM Tasks JOIN Training on Tasks.Task_ID = Training.Task_ID WHERE Training.MenteeID = ?', [user_MenteeId], function(err, results, fields) {
    //         res.render('tasks.html', {rows: results})
    //     });
    // };
});

app.post('/tasks', function (req, res) {
    if (req.session.loggedin) {
        var taskName = req.body.taskName;
        var taskCategory = req.body.taskCategory;
        var taskDescription = req.body.taskDescription;

        var sql = `INSERT INTO Tasks (Task_Name, Task_Category, Task_Description) VALUES ('${taskName}', '${taskCategory}', '${taskDescription}')`;
        db.query(sql, function(err, data)
        {
            if (err) {
                console.log(err);
            }
            else {
                console.log("Success");
                res.render('tasks.html', {success: 1, successMsg: 'A new task was successfully added.', addedTask: taskName, addedTaskCategory: taskCategory, addedTaskDescription: taskDescription, employeeStatus: user_EmployeeStatus, upcomingTasks: upcomingTasks});
            }
        });
        
    };
});

app.get('/searchtask', function (req, res) {
    if (req.session.loggedin) {
        var sql = `SELECT * FROM Employees WHERE Username = '${req.session.username}'`;
        db.query(sql, (err, data) => {
            if (err) {
                console.log(err);

            } else {

                if (data[0].Employee_Status == 0) {
                    var sql3 = `SELECT * FROM Mentees WHERE EmployeeID = '${data[0].EmployeeID}'`;
                    db.query(sql3, (err, data1) => {
                        if (err) {
                            console.log(err)
                        } else {
                            var sql4 = `SELECT * FROM Training WHERE Training_Feedback IN (1,2,3,4,5) AND MenteeID = '${data1[0].MenteeID}'`;
                            db.query(sql4, function (err, result1, fields) {
                                //onsole.log(result);
                                // console.log(data1[0].MenteeID);

                                console.log(result1)
                                var mainid = [];
                                result1.forEach((ele) => {
                                    mainid.push(ele.Task_ID)
                                })
                                console.log(mainid.join(','))
                                var sql2 = `SELECT * FROM Tasks WHERE Task_ID in (${mainid.join(',')})`; 
                                console.log(sql2);
                                db.query(sql2, function (err, result, fields) {
                                    console.log(result);
                                    // console.log(data1[0].MenteeID);
                                    res.send(result);
                                });
                            });
                        }
                    })
                }
                else if (data[0].Employee_Status == 1) {
                    var sql3 = `SELECT * FROM Mentors WHERE EmployeeID = '${data[0].EmployeeID}'`;
                    db.query(sql3, (err, data1) => {
                        if (err) {
                            console.log(err)
                        } else {
                            var sql2 = `SELECT * FROM Tasks`; 
                            console.log(sql2);
                            db.query(sql2, function (err, result, fields) {
                                console.log(result);
                                // console.log(data1[0].MenteeID);
                                res.send(result);
                            });
                        }
                    })
                }
                else {
                    res.send(JSON.stringify([]));
                }
            }
        })
    } else {
        res.redirect('/')
    }
});


// GET TRAINING SCHEDULE PAGE
app.get('/schedule', function (req, res) {
    if (req.session.loggedin) {
        if (user_EmployeeStatus == 0)
        {
            db.query('SELECT COUNT(Training_ID) AS trainings FROM Training WHERE Training_Feedback IN (1,2,3,4,5) AND MenteeID = ?', [user_MenteeId], function(err, trainingResults) {
                trainingCompletedCount = trainingResults[0].trainings;
                db.query('SELECT * FROM Tasks JOIN Training ON Training.Task_ID = Tasks.Task_ID WHERE Training_Feedback is NULL AND MenteeID = ?', [user_MenteeId], function(err, resultsFour) {
                    upcomingTrainings = resultsFour;
                    res.render('schedule.html', {employeeStatus: user_EmployeeStatus, trainingCompletedCount: trainingCompletedCount, upcomingTrainings: resultsFour});
                });
            
            });
        }
        else if (user_EmployeeStatus == 1)
        {   
            db.query('SELECT * FROM Tasks JOIN Training ON Training.Task_ID = Tasks.Task_ID WHERE Training_Feedback is NULL AND MentorID = ?', [user_MentorId], function(err, resultsFour) {
                upcomingTrainings = resultsFour;
                res.render('schedule.html', {employeeStatus: user_EmployeeStatus, upcomingTrainings: resultsFour});
            });
        }
    };
});

app.post('/trainings', function (req, res) {
    if (req.session.loggedin) {
        var trainStart = req.body.trainStart;
        var trainEnd = req.body.trainEnd;
        var trainAssignDate = req.body.trainAssignDate;
        var taskID = req.body.taskID;

        var sql = `INSERT INTO Training (Training_Start, Training_End, Training_Assign_Date, MentorID, MenteeID, Task_ID) VALUES ('${trainStart}', '${trainEnd}', '${trainAssignDate}', '${user_MentorId}', '${user_MenteeId}', '${taskID}')`;
        db.query(sql, function(err, data)
        {
            if (err) {
                console.log(err);
            }
            else {
                db.query('Select * FROM Tasks WHERE Task_ID = ?', [taskID], function(err, data2) {
                    console.log("Success");
                    console.log(upcomingTrainings);
                res.render('schedule.html', {success: 1, successMsg: 'A new training was successfully requested.', addedTrainingStart: trainStart, addedTrainingEnd: trainEnd, addedtrainingAssign: trainAssignDate, taskID: taskID, employeeStatus: user_EmployeeStatus, addedTrainTask: data2[0], upcomingTrainings: upcomingTrainings});
                })
            }
        });
        
    };
});

/* join training and Tasks */
app.get('/scheduletask', function (req, res) {
    if (req.session.loggedin) {
        var sql = `SELECT * FROM Employees WHERE Username = '${req.session.username}'`;
        db.query(sql, (err, data) => {
            if (err) {
                console.log(err);

            } else {

                if (data[0].Employee_Status == 0) {
                    var sql3 = `SELECT * FROM Mentees WHERE EmployeeID = '${data[0].EmployeeID}'`;
                    db.query(sql3, (err, data1) => {
                        if (err) {
                            console.log(err)
                        } else {
                            var sql4 = `SELECT * FROM Training WHERE Training_Feedback IN (1,2,3,4,5) AND MenteeID = '${data1[0].MenteeID}'`;
                            db.query(sql4, function (err, result1, fields) {
                                //onsole.log(result);
                                // console.log(data1[0].MenteeID);
                                console.log(result1);
                                res.send(result1);
                            
                            });
                        }
                    })


                } else if (data[0].Employee_Status == 1) {
                    var sql3 = `SELECT * FROM Mentors WHERE EmployeeID = '${data[0].EmployeeID}'`;
                    db.query(sql3, (err, data1) => {
                        if (err) {
                            console.log(err)
                        } else {
                            var sql4 = `SELECT * FROM Training WHERE Training_Feedback IN (1,2,3,4,5) AND MentorID = '${data1[0].MentorID}'`;
                            db.query(sql4, function (err, result1, fields) {
                                //onsole.log(result);
                                // console.log(data1[0].MenteeID);
                                console.log(result1);
                                res.send(result1);
                            
                            });
                        }
                    })
                }
                
                else {
                    res.send(JSON.stringify([]));
                }
            }
        })
    } else {
        res.redirect('/')
    }
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