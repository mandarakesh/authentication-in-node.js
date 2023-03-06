const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");

const databasePath = path.join(__dirname, "userData.db");
const app = express();
app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`Database Error: ${error.message}`);
  }
};

initializeDbAndServer();

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;

  const userDetails = `
    SELECT username
    FROM user
    WHERE username = '${username}';`;

  const encryptedPassword = await bcrypt.hash(password, 10);
  const userDetailsResponse = await database.get(userDetails);

  if (userDetailsResponse === undefined) {
    const newUser = `
             INSERT INTO
             user(username, name, password, gender, location)
             VALUES('${username}', '${name}', '${encryptedPassword}', '${gender}', '${location}');`;
    if (password.length > 5) {
      await database.run(newUser);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

app.post("/login", async (request, response) => {
  const { username, password } = request.body;

  const userDetails = `
  SELECT * FROM user WHERE username = '${username}';`;

  const userResponse = await database.get(userDetails);
  const encryptedPassword = await bcrypt.hash(password, 10);

  if (userResponse === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isValidPassword = await bcrypt.compare(
      password,
      userResponse.password
    );
    if (isValidPassword) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;

  const userDetails = `
    SELECT *
    FROM user 
    WHERE username = '${username}';`;

  const userResponse = await database.get(userDetails);

  if (userDetails === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidPassword = await bcrypt.compare(
      oldPassword,
      userResponse.password
    );
    if (isValidPassword === true) {
      if (newPassword.length < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = await bcrypt.hash(newPassword, 10);

        const updatePassword = `
                UPDATE user 
                SET password = '${encryptedPassword}'
                WHERE username = '${username}';`;

        await database.run(updatePassword);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
module.exports = app;
