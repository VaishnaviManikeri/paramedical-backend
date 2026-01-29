const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        author: {
            type: String,
            default: 'Admin'
        },
        category: {
            type: String,
            default: 'General'
        },
        image: {
            type: String,
            default: ''
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);
