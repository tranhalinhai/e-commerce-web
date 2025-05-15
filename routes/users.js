'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');

/* GET users listing. */
router.get('/profile', function (req, res) {
    res.sendFile(path.join(__dirname, '../views', 'profile.html'));
});

module.exports = router;
