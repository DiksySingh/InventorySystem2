const AppVersion = require("../../models/commonModels/appVersionSchema");

const createAppVersion = async (req, res) => {
    try {
        const newAppVersion = new AppVersion({
            appVersion: 1,
            link: "https://service.galosolar.com"
        });

        await newAppVersion.save();
        return res.status(200).json({
            success: true,
            message: "App Version Added Successfully"
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

module.exports = {
    createAppVersion
}