const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const app = express();
const port = 3000;
const sql = require("mssql");
require("dotenv").config();

app.use(cors());

const HOST = "webappserverdb.database.windows.net";
const USERNAME = "azureuser";
const PASSWORD = "s@Fal102938";
const DATABASE = "web";

const config = {
  user: USERNAME,
  password: PASSWORD,
  server: HOST,
  database: DATABASE,
  pool: {
    max: 10, // Maximum number of connections in the pool
    min: 0, // Minimum number of connections in the pool
    idleTimeoutMillis: 30000, // How long a connection is allowed to be idle (in milliseconds)
  },
};

// Use connection pool to manage database connections
const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

// Middleware to parse JSON
app.use(express.json());

// Serve static files (including the HTML file)
app.use(express.static(path.join(__dirname, "public")));

// Create 'tasks' table if not exists
async function createTable() {
  try {
    // Wait for the connection pool to be established
    await poolConnect;

    // Execute the query to create the 'tasks' table if it doesn't exist
    const result = await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tasks')
      BEGIN
          CREATE TABLE tasks (
              id INT IDENTITY(1,1) PRIMARY KEY,
              title NVARCHAR(255) NOT NULL,
              description NVARCHAR(MAX)
          );
      END;
    `);

    console.log("Table creation result:", result);
  } catch (err) {
    console.error("Error creating table:", err);
  }
}

// Initialize connection pool and create table
createTable();

// CRUD operations

// Get all tasks
app.get("/tasks", async (req, res) => {
  try {
    // Wait for the connection pool to be established
    await poolConnect;

    // Execute the query to get all tasks
    const result = await pool.request().query("SELECT * FROM tasks");

    // Send the results as JSON
    res.json(result.recordset);
  } catch (err) {
    console.error("Error executing SQL query:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Add a new task
app.post("/tasks", async (req, res) => {
  const { title, description } = req.body;

  try {
    // Wait for the connection pool to be established
    await poolConnect;

    // Execute the insert query
    const result = await pool
      .request()
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description)
      .query(
        "INSERT INTO tasks (title, description) VALUES (@title, @description)"
      );

    // Check if any rows were affected
    if (result.rowsAffected[0] === 0) {
      // No rows were inserted
      res.status(500).json({ error: "Task not created" });
    } else {
      // Rows were inserted successfully
      res.status(201).json({ message: "Task created successfully" });
    }
  } catch (err) {
    console.error("Error executing SQL query:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a task
app.delete("/tasks/:taskId", async (req, res) => {
  const taskId = req.params.taskId;

  try {
    // Wait for the connection pool to be established
    await poolConnect;

    // Execute the delete query
    const result = await pool
      .request()
      .input("taskId", sql.Int, taskId)
      .query("DELETE FROM tasks WHERE id = @taskId");

    // Check if any rows were affected
    if (result.rowsAffected[0] === 0) {
      // No rows were deleted (task with taskId not found)
      res.status(404).json({ error: "Task not found" });
    } else {
      // Rows were deleted successfully
      res.json({ message: "Task deleted successfully" });
    }
  } catch (err) {
    console.error("Error executing SQL query:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
