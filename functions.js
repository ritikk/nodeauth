var bcrypt = require('bcryptjs'),
    Q = require('q'),
    pg = require('pg');

module.exports = function(db) {
    db_url= db;
    var func = {
        localRegistration : function (username, password) {
            var deferred = Q.defer();
            var hash = bcrypt.hashSync(password, 8);
            var user = {
                "username": username,
                "password": hash,
                "avatar": "http://placepuppy.it/images/homepage/Beagle_puppy_6_weeks.JPG"
            };

            console.log(db_url);
            pg.connect(db_url, function(err, client, done) {

                //handle connection errors
                if (err) {
                    done();
                    console.log(err);
                    deferred.reject(new Error(err));
                }

                //check if username is already assigned
                var query = {
                    text: 'SELECT username FROM users WHERE username=$1',
                    values: [username]
                };

                client.query(query, function(err, result) {
                    //username not assigned
                    if(err) {
                        console.log(err);
                        console.log(username + " is free to use.");

                        client.query("INSERT INTO users(username, password, avatar) VALUES ($1, $2, $3)",
                            [user.username, user.password, user.avatar], function(err, result) {
                                done();
                                if(err) {
                                    console.error(err);
                                    deferred.reject(new Error(err));
                                } else {
                                    console.log("added user " + username);
                                    deferred.resolve(user);
                                }
                            });
                    } else {
                        done();
                        console.log("username already in use");
                        deferred.resolve(false);
                    }
                });
            });

            return deferred.promise;
        }
    };

    return func;
};

