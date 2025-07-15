const indianStandardTime = () => {
    const now = new Date();

    const istTime = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour12: true, 
    });
    return istTime;
};
module.exports = indianStandardTime;