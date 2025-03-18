const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
    try {
        await prisma.$connect();
        console.log("Connected successfully to MySQL.");
    } catch (error) {
        console.error("Connection failed:", error.message);
    }
})();

module.exports = prisma;
