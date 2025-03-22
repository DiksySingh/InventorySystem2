const { PrismaClient } = require('@prisma/client');

let prisma;

if (!global.prisma) {
    global.prisma = new PrismaClient({});

    global.prisma.$connect()
        .then(() => console.log("✅ Connected successfully to MySQL."))
        .catch((error) => console.error("❌ Connection failed:", error));
}

prisma = global.prisma;

module.exports = prisma;