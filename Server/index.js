// require("dotenv").config();
// const express = require("express");
// const app = express();
// const cors = require("cors");
// const path = require("path");
// const mongoose = require("mongoose");
// const cookieParser = require("cookie-parser");
// const authRoute = require("./routes/authRoute");
// const adminRoute = require("./routes/adminRoutes");
// const warehousePersonRoute = require("./routes/warehousePersonRoutes");
// const servicePersonRoute = require("./routes/servicePersonRoutes");


// const URI = process.env.MONGODB_URL;
// const PORT = process.env.PORT;
// app.get('/set-cookie', (req, res) => {
//   res.cookie('sessionId', 'abc123', {
//       domain: '192.168.x.x', // Replace with your IP
//       path: '/',
//       httpOnly: true,
//       secure: false, // Use true if running over HTTPS
//   });
//   res.send('Cookie has been set');
// });
// main()
//   .then(() => {
//     console.log("Connected to MongoDB");
//   })
//   .catch((err) => {
//     console.log(err);
//   });

// async function main() {
//   await mongoose.connect(URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   });
// }

// app.use(cors());
// app.use(cookieParser());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// // app.use(
// //   "../uploads/images",
// //   express.static(path.join(__dirname, "uploads", "images"))
// // );

// // by shiv
// app.use(
//   "/uploads/images",
//   express.static(path.join(__dirname, "uploads"))
// );

// app.get("/", (req, res) => {
//   res.send("Server Working Fine");
// });

// app.use("/user", authRoute);
// app.use("/admin", adminRoute);
// app.use("/warehouse-admin", warehousePersonRoute);
// app.use("/service-person", servicePersonRoute);

// app.listen(PORT, () => {
//   console.log(`Server running at port ${PORT}`);
// });



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

// Load environment variables
const URI = process.env.MONGODB_URL;
const PORT = process.env.PORT || 8000; // Default to port 8000 if not defined

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
app.use("/uploads/images", express.static(path.join(__dirname, "uploads")));

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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://192.168.x.x:${PORT}`); // Replace with your local IP
});
