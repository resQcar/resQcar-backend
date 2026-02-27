const express = require("express");
const cors = require("cors");
require("dotenv").config();

// initialize firebase admin once
require("./config/firebase");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("resQcar backend running ✅"));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/users", require("./routes/user.routes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));