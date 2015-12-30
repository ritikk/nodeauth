var express = require('express');
var app = express();
var pg = require('pg');
var exphbs = require('express-handlebars'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    methodOverride = require('method-override'),
    session = require('express-session'),
    passport = require('passport'),
    LocalStrategy = require('passport-local'),
    func = require('./functions.js')(process.env.DATABASE_URL);


app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(session({secret: 'supernova', saveUninitialized: true, resave: true}));
app.use(passport.initialize());
app.use(passport.session());

// Session-persisted message middleware
app.use(function(req, res, next){
  var err = req.session.error,
      msg = req.session.notice,
      success = req.session.success;

  delete req.session.error;
  delete req.session.success;
  delete req.session.notice;

  if (err) res.locals.error = err;
  if (msg) res.locals.notice = msg;
  if (success) res.locals.success = success;

  next();
});

// Configure express to use handlebars templates
var hbs = exphbs.create({
    defaultLayout: 'main', //we will be creating this layout shortly
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');


app.get('/', function(request, response) {
  console.log(process.env.DATABASE_URL);
  response.render('home', {user: request.user});
});

app.get('/signin', function(request, response) {
    response.render('signin');
});

//sends the request through our local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/local-reg', passport.authenticate('local-signup', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//sends the request through our local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
  successRedirect: '/',
  failureRedirect: '/signin'
  })
);

//logs user out of site, deleting them from the session, and returns to homepage
app.get('/logout', function(req, res){
  var name = req.user.username;
  console.log("LOGGIN OUT " + req.user.username)
  req.logout();
  res.redirect('/');
  req.session.notice = "You have successfully been logged out " + name + "!";
});

passport.use('local-signup', new LocalStrategy(
    { passReqToCallback: true},
    function (request, username, password, done) {
        func.localRegistration(username, password)
        .then(function(user) {
            if (user) {
                console.log("Registered as: " + user.username);
                request.session.success = "You are successfully registered and logged in " + user.username + "!";
                done(null, user);
            } else {
                request.session.error = "Username in use";
                done(null, user);
            }
        })
        .fail(function(err) {
            console.log(err.body);
        });
    }
));

passport.serializeUser(function (user, done) {
    console.log("serializing " + user.username);
    done(null, user);
});

passport.deserializeUser(function (obj, done) {
    console.log("deserializing " + obj);
    done(null, obj);
});

app.get('/db', function(request, response) {
    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
        client.query("SELECT * FROM test_table", function(err, result) {
            done();
            if(err) {
                console.error(err);
                response.send("Error " + err);
            } else {
                response.render('pages/db', {results: result.rows});
            }
        });
    });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});


