const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const stageActivitySchema = new Schema({
    installationId: {
        type: Schema.Types.ObjectId,
        ref: "NewSystemInstallation",
        required: true,
    },
    empId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    stageId: {
        type: Schema.Types.ObjectId,
        ref:"Stage",
        required: true,
    },
    remarkId: {
        type: Schema.Types.ObjectId,
        default: null,
    }
}, {timestamps: true, collection: "inStageActivities"});

const StageActivity = mongoose.model("StageActivity", stageActivitySchema);
module.exports = StageActivity;