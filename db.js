'use strict';
var express = require('express');
var router = express.Router();
var mysql = require('mysql2');

// thiết lập kết nối  
var db = mysql.createConnection({
    host: 'localhost',       // địa chỉ máy chủ MySQL  
    user: 'Linh',            // Tên người dùng MySQL  
    password: 'linh04102003',            // pass MySQL  
    database: 'jeunesse' // Tên database   
});

// thực hiênj kết nối  
db.connect(function(err) {
    if (err) {
        console.error('Lỗi kết nối MySQL: ' + err.stack);
        return;
    }
    console.log('Kết nối MySQL thành công với ID ' + db.threadId);
});


module.exports = db;