const express = require("express");
const mysql = require("mysql");
const cors = require("cors");
const path = require("path");

const app = express();
const port = 3000;
require("dotenv").config();

app.use(cors());

// MySQL connection
const db = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USERNAME,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  port: process.env.PORT,
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL: ", err);
    throw err;
  }
  console.log("Connected to MySQL database");
});

// Create 'tasks' table if not exists
db.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT
  )
`);

// Middleware to parse JSON
app.use(express.json());

// Serve static files (including the HTML file)
app.use(express.static(path.join(__dirname, "public")));

// CRUD operations

// Get all tasks
app.get("/tasks", (req, res) => {
  db.query("SELECT * FROM tasks", (err, results) => {
    if (err) {
      console.error("Error executing MySQL query: ", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.json(results);
  });
});

// Add a new task
app.post("/tasks", (req, res) => {
  const { title, description } = req.body;
  db.query(
    "INSERT INTO tasks (title, description) VALUES (?, ?)",
    [title, description],
    (err) => {
      if (err) {
        console.error("Error executing MySQL query: ", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.status(201).json({ message: "Task added successfully" });
    }
  );
});

// Update a task
app.put("/tasks/:taskId", (req, res) => {
  const { title, description } = req.body;
  const taskId = req.params.taskId;
  db.query(
    "UPDATE tasks SET title = ?, description = ? WHERE id = ?",
    [title, description, taskId],
    (err) => {
      if (err) {
        console.error("Error executing MySQL query: ", err);
        res.status(500).json({ error: "Internal Server Error" });
        return;
      }
      res.json({ message: "Task updated successfully" });
    }
  );
});

// Delete a task
app.delete("/tasks/:taskId", (req, res) => {
  const taskId = req.params.taskId;
  db.query("DELETE FROM tasks WHERE id = ?", [taskId], (err) => {
    if (err) {
      console.error("Error executing MySQL query: ", err);
      res.status(500).json({ error: "Internal Server Error" });
      return;
    }
    res.json({ message: "Task deleted successfully" });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
