require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const authRoute = require("./routes/authRoute");
const adminRoute = require("./routes/adminRoutes");
const commonRoute = require("./routes/commonRoutes");
const warehousePersonRoute = require("./routes/warehousePersonRoutes");
const servicePersonRoute = require("./routes/servicePersonRoutes");
const serviceTeamRoute = require("./routes/serviceTeamRoutes");

// Load environment variables
const URI = process.env.MONGODB_URL;
const PORT = process.env.PORT || 8001; 

// MongoDB connection
main()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

async function main() {
  await mongoose.connect(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

// Middleware
app.use(cors({
  origin: true, // Allow all origins during development
  credentials: true, // Allow cookies to be sent
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`); //for show api urls
//   next();
// });

app.use((req, res, next) => {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)) // Convert to IST
    .toISOString()
    .replace("T", " ") // Replace "T" with space for readability
    .replace("Z", " IST"); // Add "IST" at the end

  console.log(`[${istTime}] ${req.method} ${req.url}`); 
  next();
});


// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.get("/", (req, res) => {
  res.send("Server Working Fine");
});

app.use("/user", authRoute);
app.use("/admin", adminRoute);
app.use("/common", commonRoute);
app.use("/warehouse-admin", warehousePersonRoute);
app.use("/service-person", servicePersonRoute);
app.use("/service-team", serviceTeamRoute);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at port: ${PORT}`); 
});
