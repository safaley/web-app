const express = require("express");
const cors = require("cors");
const path = require("path");
const app = express();
const port = 3000;
const sql = require("mssql");
const axios = require("axios"); // Import Axios
require("dotenv").config();

app.use(cors());

app.set("view engine", "ejs");

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
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

app.use(express.json());

async function createTable() {
  try {
    await poolConnect;

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
    app.set("views", path.join(__dirname, "views"));
    app.get("/", async (req, res) => {
      try {
        await poolConnect;

        // Use Axios to fetch tasks from the API
        const response = await axios.get("http://localhost:3000/tasks");
        const tasks = response.data;

        res.render("index", { tasks });
      } catch (err) {
        console.error("Error executing SQL query:", err);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });
  } catch (err) {
    console.error("Error creating table:", err);
  }
}

createTable();

app.get("/tasks", async (req, res) => {
  try {
    await poolConnect;
    const result = await pool.request().query("SELECT * FROM tasks");
    res.json(result.recordset);
  } catch (err) {
    console.error("Error executing SQL query:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/tasks", async (req, res) => {
  const { title, description } = req.body;

  console.log("task posted from app.js");
  try {
    await poolConnect;
    const result = await pool
      .request()
      .input("title", sql.NVarChar, title)
      .input("description", sql.NVarChar, description)
      .query(
        "INSERT INTO tasks (title, description) VALUES (@title, @description)"
      );

    if (result.rowsAffected[0] === 0) {
      res.status(500).json({ error: "Task not created" });
    } else {
      res.status(201).json({ message: "Task created successfully" });
    }
  } catch (err) {
    console.error("Error executing SQL query:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/tasks/:taskId", async (req, res) => {
  const taskId = req.params.taskId;

  try {
    await poolConnect;
    const result = await pool
      .request()
      .input("taskId", sql.Int, taskId)
      .query("DELETE FROM tasks WHERE id = @taskId");

    if (result.rowsAffected[0] === 0) {
      res.status(404).json({ error: "Task not found" });
    } else {
      res.json({ message: "Task deleted successfully" });
    }
  } catch (err) {
    console.error("Error executing SQL query:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
