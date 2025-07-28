const prisma = require("../../config/prismaClient");
const WarehouseItems = require("../../models/serviceInventoryModels/warehouseItemsSchema");
const axios = require("axios");
const moment = require("moment");
const mongoose = require("mongoose");