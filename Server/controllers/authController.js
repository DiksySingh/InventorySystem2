const Admin = require("../models/adminSchema");
const ServicePerson = require("../models/servicePersonSchema");
const WarehousePerson = require("../models/warehousePersonSchema");
const Warehouse = require("../models/warehouseSchema");
const {
  createSecretToken,
  createRefreshToken,
} = require("../util/secretToken");
const bcrypt = require("bcrypt");
const { refreshToken } = require("../middlewares/authMiddlewares");

module.exports.adminSignup = async (req, res) => {
  const { email, password, createdAt, role } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required",
    });
  }

  try {
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const newUser = new Admin({ email, password, createdAt, role });
    await newUser.save();
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: newUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.warehousePersonSignup = async(req, res) => {
  const {name, email, warehouse, contact, password, role, createdAt } = req.body;
  if(!name || !email || !warehouse || !contact || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  try{
    const existingWarehousePerson = await WarehousePerson.findOne({$or: [{ email }, { contact }]});
    if(existingWarehousePerson){
      return res.status(400).json({
        success: false,
        message: "Warehouse Person Already Exists"
      });
    }

    const existingWarehouse = await Warehouse.findOne({warehouseName: warehouse});
    if(!existingWarehouse){
      return res.status(404).json({
        success: false,
        message: "Warehouse Not Found"
      });
    }

    const newWarehousePerson = new WarehousePerson({
      name,
      email,
      warehouse: existingWarehouse._id,
      contact,
      password,
      role,
      createdAt,
      refreshToken: null,
    });

    await newWarehousePerson.save();
    res.status(200).json({
      success: true,
      message: "Warehouse Person registered successfully",
      data: {
        name: newWarehousePerson.name,
        email: newWarehousePerson.email,
        warehouse: newWarehousePerson.warehouse,
        contact: newWarehousePerson.contact,
        //password: newWarehousePerson.password,
        createdAt: newWarehousePerson.createdAt,
        role: newWarehousePerson.role,
        //refreshToken,
      },
    });
  }catch(error){
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message
    });
  }
}

module.exports.servicePersonSignup = async (req, res) => {
  const { name, email, contact, password, createdAt, role, longitude, latitude, state, district, block } = req.body;
  if (!name || !email || !contact || !password ) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    });
  }

  try {
    const existingServicePerson = await ServicePerson.findOne({
      $or: [{ email }, { contact }],
    });
    if (existingServicePerson) {
      res.status(400).json({
        success: false,
        message: "Service Person already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let blockArray;
    if(block){
      blockArray =  block.split(",").map((b) => b.trim());
    }
    
    const newServicePerson = new ServicePerson({
      name,
      email,
      contact,
      password: hashedPassword,
      longitude: longitude || null,
      latitude: latitude || null,
      state: state || "",
      district: district || "",
      block: blockArray || [],
      createdAt,
      createdBy: req.user._id,
      role,
      refreshToken: null,
    });
    await newServicePerson.save();
    res.status(200).json({
      success: true,
      message: "Service Person registered successfully",
      data: {
        name: newServicePerson.name,
        email: newServicePerson.email,
        contact: newServicePerson.contact,
        password: newServicePerson.password,
        longitude: newServicePerson.longitude,
        latitude: newServicePerson.latitude,
        createdAt: newServicePerson.createdAt,
        createdBy: newServicePerson.createdBy,
        role: newServicePerson.role,
        state: newServicePerson.state,
        district: newServicePerson.district,
        block: newServicePerson.block,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.updateServicePerson = async (req, res) => {
  try {
    const { servicePersonId, name, email, contact, longitude, latitude, updatedAt } = req.body;

    if (!servicePersonId) {
      return res.status(400).json({
        success: false,
        message: "Service Person ID is required",
      });
    }

    // Find the service person by ID
    const servicePersonData = await ServicePerson.findOne({ _id: servicePersonId });
    if (!servicePersonData) {
      return res.status(404).json({
        success: false,
        message: "Service Person not found",
      });
    }

    if (name) servicePersonData.name = name;
    if (email) servicePersonData.email = email;
    if (contact) {
      servicePersonData.contact = contact;
    }
    if (longitude) servicePersonData.longitude = longitude;
    if (latitude) servicePersonData.latitude = latitude;

    servicePersonData.updatedAt = updatedAt;
    servicePersonData.updatedBy = req.user?._id || null;

    const updatedData = await servicePersonData.save();

    return res.status(200).json({
      success: true,
      message: "Service Person updated successfully",
      data: updatedData,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.Login = async (req, res) => {
  try {
    //const { email, password } = req.body;
    const { email, password, role } = req.body;
    const options = {
      withCredentials: true,
      httpOnly: true,
      secure: false,
    };

    if (!email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // if (!email || !password) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "All fields are required",
    //   });
    // }

    let user = await Admin.findOne({ 
      email: email,
      role: role,
    });
    if (!user) {
      user = await WarehousePerson.findOne({ 
        email: email, 
        role: role 
      });
      if (!user) {
        user = await ServicePerson.findOne({ 
          email: email, 
          role: role 
        });
        if(!user){
          return res.status(401).json({
            success: false,
            message: "Incorrect email or password",
          });
        }
      }
    }

    // Compare password
    const auth = await bcrypt.compare(password, user.password);
    if (!auth) {
      return res.status(401).json({
        success: false,
        message: "Incorrect email or password",
      });
    }
    //const role = roles[email] || 'serviceperson';
    //const role = user.role;
    const accessToken = createSecretToken(user._id, role);
    const refreshToken = createRefreshToken(user._id);

    // Update the refreshToken in the database
    if (user.constructor.modelName === "Admin") {
      await Admin.findByIdAndUpdate(user._id, { 
        refreshToken: refreshToken 
      });
    } else if(user.constructor.modelName === "WarehousePerson"){
      await WarehousePerson.findByIdAndUpdate(user._id, { 
        refreshToken: refreshToken 
      });
    }else {
      await ServicePerson.findByIdAndUpdate(user._id, {
        refreshToken: refreshToken,
      });
    }

    // Set cookies for tokens
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json({
        success: true,
        message: `Logged in successfully`,
        id: user._id,
        email: user.email,
        block: user.block,
        // accessToken,
        // refreshToken,
        role,
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports.Logout = async (req, res) => {
  try {
    const userID = req.user._id; // req.user will contain either User or ServicePerson based on the role
    const role = req.user.role; // Assuming role is set in the token

    if (role === "serviceperson") {
      await ServicePerson.findByIdAndUpdate(userID, {
        $set: { refreshToken: null },
      });
    } else if (role === "warehouseAdmin"){
      await WarehousePerson.findByIdAndUpdate(userID, {
        $set: { refreshToken: null },
      });
    }else{
      await Admin.findByIdAndUpdate(userID, { 
        $set: { refreshToken: null } 
      });
    }

    return res
      .status(200)
      .clearCookie("accessToken", { httpOnly: true, secure: false })
      .clearCookie("refreshToken", { httpOnly: true, secure: false })
      .json({
        success: true,
        message: "Logged Out Successfully",
      });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

module.exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const servicePerson = await ServicePerson.findById(req.user._id);

    if (!servicePerson) {
      return res
        .status(404)
        .json({ success: false, message: "Service person not found" });
    }

    // Check if the current password is correct
    const isMatch = await bcrypt.compare(
      currentPassword,
      servicePerson.password
    );
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    servicePerson.password = hashedPassword;
    await servicePerson.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
