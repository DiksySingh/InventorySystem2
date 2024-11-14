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


const URI = process.env.MONGO_URL;
const PORT = process.env.PORT;

main()
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(
//   "../uploads/images",
//   express.static(path.join(__dirname, "uploads", "images"))
// );

// by shiv
app.use(
  "/uploads/images",
  express.static(path.join(__dirname, "uploads"))
);

app.get("/", (req, res) => {
  res.send("Server Working Fine");
});

app.use("/user", authRoute);
app.use("/admin", adminRoute);
app.use("/warehouse-admin", warehousePersonRoute);
app.use("/service-person", servicePersonRoute);

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
