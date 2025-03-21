const dotenv = require('dotenv');
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const envFile = process.env.NODE_ENV === 'development' ? '.env.development' : process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(__dirname, envFile) });

// MongoDB - Service Inventory Management System Routes
const authRoute = require("./routes/authRoute");
const adminRoute = require("./routes/adminRoutes");
const commonRoute = require("./routes/commonRoutes");
const warehousePersonRoute = require("./routes/warehousePersonRoutes");
const servicePersonRoute = require("./routes/servicePersonRoutes");
const serviceTeamRoute = require("./routes/serviceTeamRoutes");
// const prisma = require('./config/prismaClient');

/* MySQL - Raw Material Management System Routes */
const authRouter = require("./routes/rawMaterialItemsRoutes/authRouter");
const adminRouter = require("./routes/rawMaterialItemsRoutes/adminRouter");
const commonRouter = require("./routes/rawMaterialItemsRoutes/commonRouter");
const testRouter = require("./routes/test");
// Load environment variables
const URI = process.env.MONGODB_URL;
const PORT = process.env.PORT || 8001; 

// MongoDB connection
main()
  .then(() => {
    console.log("Connected successfully to MongoDB");
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
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`); //for show api urls`
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

/* Raw Material Management System */
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/common", commonRouter);
app.use("/test", testRouter);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running at port: ${PORT}`); 
});
