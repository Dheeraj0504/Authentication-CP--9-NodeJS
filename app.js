const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');

const {open} = require('sqlite');
const sqlite3 = require('sqlite3');

const app = express();
app.use(express.json());
const databasePath = path.join(__dirname, 'userData.db');

let database = null;

const initilizeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/');
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initilizeDbAndServer();

//API 1: User Registration
app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body;
  //Syntax: const hashedPassword = await bcrypt.hash(password, saltRounds);
  const hashedPassword = await bcrypt.hash(password, 10);
  const checkUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';
  `;
  const databaseUser = await database.get(checkUserQuery);

  if (databaseUser === undefined) {
    //Scenario 3: Successful registration of the registrant
    const createUserQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );
    `;
    if (password.length > 5) {
      const createUser = await database.run(createUserQuery);
      // console.log(createUser);
      response.send('User created successfully');
    } 
    else {
      //Scenario 2: If the registrant provides a password with less than 5 characters
      response.status(400)
      response.send('Password is too short')
    }
  }
  else {
    //Scenario 1: If the username already exists
    response.status(400);
    response.send('User already exists');
  }
});

//API 2: User Login
app.post('/login', async (request, response) => {
  const {username, password} = request.body;
  const checkUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';
  `;
  const databaseUser = await database.get(checkUserQuery);

  if (databaseUser === undefined) {
    //Scenario 1: If an unregistered user tries to login
    response.status(400);
    response.send('Invalid user');
  } 
  else {
    //Syntax: const isPasswordMatched = bcrypt.compare(password, databaseUser.password);
    const isPasswordMatched = await bcrypt.compare(password, databaseUser.password);

    if (isPasswordMatched === true) {
      //Scenario 3: Successful login of the user
      response.send('Login success!');
    } 
    else {
      //Scenario 2: If the user provides incorrect password
      response.status(400)
      response.send('Invalid password')
    }
  }
});

//API 3: Change Password
app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const checkUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';
  `;
  const databaseUser = await database.get(checkUserQuery);

  if (databaseUser === undefined) {
    response.status(400);
    response.send('Invalid user');
  } 
  else {
    const isPasswordMatched = await bcrypt.compare(oldPassword, databaseUser.password);
    if (isPasswordMatched === true) {
      //Scenario 3: Successful password update
      if (newPassword.length > 5) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = `
          UPDATE 
            user
          SET
            password = '${hashedPassword}'
          WHERE 
            username = '${username}';
        `;
        const user = await database.run(updatePasswordQuery);
        response.send('Password updated');
      } 
      else {
        //Scenario 2: If the user provides new password with less than 5 characters
        response.status(400);
        response.send('Password is too short');
      }
    } 
    else {
      //Scenario 1:If the user provides incorrect current password
      response.status(400);
      response.send('Invalid current password');
    }
  }
});
module.exports = app;

//Get All List of Users
app.get('/users/', async (request, response) => {
  const getUsersQuery = `
    SELECT
      *
    FROM
      user;
  `;
  const usersDetails = await database.all(getUsersQuery);
  response.send(usersDetails);
});

//Delete users based on username
app.delete('/users/:username/', async (request, response) => {
  const {username} = request.params;
  const deleteUser = `
    DELETE FROM
      user
    WHERE 
      username = '${username}'
  `;
  await database.run(deleteUser);
  response.send('User Deleted');
});
