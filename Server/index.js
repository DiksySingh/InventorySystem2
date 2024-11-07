require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const itemRoute = require("./routes/itemRoute");
const authRoute = require("./routes/authRoute");
const warehouseRoute = require("./routes/warehouseRoute");
const transactionRoute = require("./routes/transactionRoute");
const pickupItemRoute = require("./routes/pickupItemRoute");

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
  express.static(path.join(__dirname, "uploads/images"))
);

app.get("/", (req, res) => {
  res.send("Server Working Fine");
});

app.use("/user", authRoute);
app.use("/admin", itemRoute);
app.use("/admin", transactionRoute);
app.use("/admin", warehouseRoute);
app.use("/admin", pickupItemRoute);
app.use("/warehouse-admin", warehouseRoute);
app.use("/warehouse-admin", itemRoute);
app.use("/warehouse-admin", transactionRoute);
app.use("/service-person", transactionRoute);
app.use("/warehouse-admin", pickupItemRoute);
app.use("/service-person", pickupItemRoute);

app.listen(PORT, () => {
  console.log(`Server running at port ${PORT}`);
});
