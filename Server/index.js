require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const authRoute = require("./routes/authRoute");
const adminRoute = require("./routes/adminRoutes");
const warehousePersonRoute = require("./routes/warehousePersonRoutes");
const servicePersonRoute = require("./routes/servicePersonRoutes");
const serviceTeamRoute = require("./routes/serviceTeamRoutes");

// Load environment variables
const URI = process.env.MONGO_URL;
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Test route to set cookies

// app.get('/set-cookie', (req, res) => {
//   res.cookie('sessionId', 'abc123', {
//       domain: process.env.IP_ADDRESS, // Replace with your server's IP address
//       path: '/',
//       httpOnly: true,
//       secure: false, // Set to true if using HTTPS
//       sameSite: 'Lax', // Adjust based on your needs
//   });
//   res.send('Cookie has been set');
// });

// Routes
app.get("/", (req, res) => {
  res.send("Server Working Fine");
});

app.use("/user", authRoute);
app.use("/admin", adminRoute);
app.use("/warehouse-admin", warehousePersonRoute);
app.use("/service-person", servicePersonRoute);
app.use("/service-team", serviceTeamRoute);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at port: ${PORT}`); // Replace with your local IP
});
