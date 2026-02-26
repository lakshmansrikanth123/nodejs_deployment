
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser"); 

const app = express();

mongoose.connect("mongodb://127.0.0.1:27017/complexapp");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
    secret: "supersecret",
    resave: false,
    saveUninitialized: false
}));

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const taskSchema = new mongoose.Schema({
    title: String,
    userId: mongoose.Schema.Types.ObjectId
});

const User = mongoose.model("User", userSchema);
const Task = mongoose.model("Task", taskSchema);

function isAuth(req, res, next) {
    if (req.session.userId) next();
    else res.redirect("/login");
}

function pageTemplate(title, content) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>${title}</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    </head>
    <body class="bg-light">
        <div class="container mt-5">
            ${content}
        </div>
    </body>
    </html>`;
}

app.get("/", (req, res) => res.redirect("/login"));

app.get("/register", (req, res) => {
    res.send(pageTemplate("Register", `
        <h2>Register</h2>
        <form method="POST">
            <input class="form-control mb-2" name="username" placeholder="Username" required />
            <input class="form-control mb-2" name="password" type="password" placeholder="Password" required />
            <button class="btn btn-primary">Register</button>
            <a href="/login" class="btn btn-link">Login</a>
        </form>`));
});

app.post("/register", async (req, res) => {
    const hash = await bcrypt.hash(req.body.password, 10);
    await User.create({ username: req.body.username, password: hash });
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    res.send(pageTemplate("Login", `
        <h2>Login</h2>
        <form method="POST">
            <input class="form-control mb-2" name="username" placeholder="Username" required />
            <input class="form-control mb-2" name="password" type="password" placeholder="Password" required />
            <button class="btn btn-success">Login</button>
            <a href="/register" class="btn btn-link">Register</a>
        </form>`));
});

app.post("/login", async (req, res) => {
    const user = await User.findOne({ username: req.body.username });
    if (!user) return res.send("User not found");
    const valid = await bcrypt.compare(req.body.password, user.password);
    if (!valid) return res.send("Wrong password");
    req.session.userId = user._id;
    res.redirect("/dashboard");
});

app.get("/dashboard", isAuth, async (req, res) => {
    const tasks = await Task.find({ userId: req.session.userId });
    const taskList = tasks.map(t => `
        <li class="list-group-item d-flex justify-content-between">
            ${t.title}
            <a href="/delete/${t._id}" class="btn btn-danger btn-sm">Delete</a>
        </li>`).join("");
    res.send(pageTemplate("Dashboard", `
        <h2>Dashboard</h2>
        <form method="POST" action="/add">
            <input class="form-control mb-2" name="title" placeholder="New Task" required />
            <button class="btn btn-primary">Add Task</button>
        </form>
        <ul class="list-group mt-3">${taskList}</ul>
        <a href="/logout" class="btn btn-warning mt-3">Logout</a>`));
});

app.post("/add", isAuth, async (req, res) => {
    await Task.create({ title: req.body.title, userId: req.session.userId });
    res.redirect("/dashboard");
});

app.get("/delete/:id", isAuth, async (req, res) => {
    await Task.findByIdAndDelete(req.params.id);
    res.redirect("/dashboard");
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
