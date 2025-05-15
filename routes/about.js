'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');

/* GET about page. */
router.get('/about', function (req, res) {
    res.sendFile(path.join(__dirname, '../views', 'about.html')); 
});

module.exports = router;
