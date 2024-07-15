import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const app = express();
const port = 4000;

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "root",
  database: "bank",
  port: 3306,
});

app.use(cors());
app.use(bodyParser.json());

// Generate OTP
function generateOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// Create user endpoint (POST)
app.post("/users", async (req, res) => {
  const { username, password } = req.body;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  try {
    const userResult = await query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );
    const userId = userResult.insertId;

    await query("INSERT INTO accounts (userId, balance) VALUES (?, ?)", [
      userId,
      0,
    ]);

    res.status(201).send("User and account created");
  } catch (error) {
    console.error("Error creating user and account", error);
    res.status(500).send("Error creating user and account");
  }
});

// Log in endpoint (POST)
app.post("/sessions", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    const user = result[0];

    if (!user) {
      return res.status(401).send("Invalid username or password");
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).send("Invalid username or password");
    }

    const otp = generateOTP();

    await query(
      "INSERT INTO sessions (userId, oneTimePassword) VALUES (?, ?)",
      [user.id, otp]
    );

    res.status(200).json({ message: "Login successful", otp });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Error during login");
  }
});

app.get("/me/accounts", async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization;
    console.log("Authorization Header:", authorizationHeader);

    if (!authorizationHeader) {
      return res.status(401).send("Authorization header is missing");
    }

    const otp = authorizationHeader.split(" ")[1];
    console.log("Extracted OTP:", otp);

    const sessionResult = await query(
      "SELECT * FROM sessions WHERE oneTimePassword = ?",
      [otp]
    );
    const session = sessionResult[0];
    if (!session) {
      return res.status(401).send("Invalid session OTP");
    }

    const userId = session.userId;
    console.log("User ID from session:", userId);

    const userResult = await query(
      "SELECT u.username, a.balance FROM users u JOIN accounts a ON u.id = a.userId WHERE u.id = ?",
      [userId]
    );
    const user = userResult[0];
    if (!user) {
      return res.status(404).send("User not found");
    }

    const { username, balance } = user;
    console.log("Username:", username, "Balance:", balance);

    res.status(200).json({ username, balance });
  } catch (error) {
    console.error("Error fetching balance:", error);
    res.status(500).send("Error fetching balance");
  }
});

// Deposit endpoint (POST)
app.post("/me/accounts/transactions", async (req, res) => {
  const { depositAmount } = req.body;
  const authorizationHeader = req.headers.authorization;

  try {
    if (!authorizationHeader) {
      return res
        .status(401)
        .json({ message: "Authorization header is missing" });
    }

    const otp = authorizationHeader.split(" ")[1];
    console.log("Extracted OTP:", otp);

    const sessionResult = await query(
      "SELECT userId FROM sessions WHERE oneTimePassword = ?",
      [otp]
    );
    const session = sessionResult[0];

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.userId;

    await query("UPDATE accounts SET balance = balance + ? WHERE userId = ?", [
      depositAmount,
      userId,
    ]);

    const accountResult = await query(
      "SELECT balance FROM accounts WHERE userId = ?",
      [userId]
    );
    const newBalance = accountResult[0].balance;

    res.status(200).json({ message: "Deposit successful", newBalance });
  } catch (error) {
    console.error("Error during deposit:", error);
    res.status(500).send("Error during deposit");
  }
});

app.listen(port, () => {
  console.log(`Bank backend is running on http://localhost:${port}`);
});
