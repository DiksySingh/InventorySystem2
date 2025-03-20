const { PrismaClient } = require('@prisma/client');

let prisma;

if (!global.prisma) {
    global.prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error']
    });

    global.prisma.$connect()
        .then(() => console.log("✅ Connected successfully to MySQL."))
        .catch((error) => console.error("❌ Connection failed:", error));
}

prisma = global.prisma;

module.exports = prisma;


// const { PrismaClient } = require('@prisma/client');

// const prisma = new PrismaClient({
//   log: ['query', 'info', 'warn', 'error'], // Enable logs for debugging
// });

// module.exports = prisma;

// const { PrismaClient } = require('@prisma/client');

// let prisma;

// if (!global.prisma) {
//   global.prisma = new PrismaClient();
// }

// prisma = global.prisma;

// module.exports = prisma;

