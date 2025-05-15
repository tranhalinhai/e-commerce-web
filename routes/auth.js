
'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');
var db = require('../db'); // Import k?t n?i MySQL

function ensureAuthenticated(req, res, next) {
    if (req.session.user) {
        req.user = req.session.user; // L?u thông tin user vào req ?? dùng trong route
        next();
    } else {
        res.status(401).json({ message: 'Hãy đăng nhập để sử dụng chức năng này!' }); // Chuy?n v? trang ch? n?u ch?a ??ng nh?p
    }
}

// hiện người dùng
router.get('/get/user', ensureAuthenticated, (req, res) => {
    // Check if the logged-in user has admin role
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập!' });
    }

    db.query('SELECT id, name, username, address FROM users WHERE role = "admin"', (err, results) => {
        if (err) {
            console.error("Error fetching admin users:", err);
            return res.status(500).json({ error: "Failed to fetch admin users" });
        }
        res.json(results);
    });
});

// thêm người dùng
router.post('/adduser', ensureAuthenticated, (req, res) => {
    const { name, username, address, password } = req.body;

    // Kiểm tra dữ liệu đầu vào (ví dụ)
    if (!name || !username || !address || !passworrd) {
        return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }

    db.query('INSERT INTO users (name, username, address, password, role) VALUES (?, ?, ?, ?, "admin")', [name, username, address, password], (err, result) => {
        if (err) {
            console.error("Lỗi khi thêm người dùng:", err);
            return res.status(500).json({ error: "Lỗi khi thêm người dùng" });
        }
        res.json({ message: 'Thêm người dùng thành công', userId: result.insertId });
    });
});
// hiện khách hàng 
router.get('/get/client', ensureAuthenticated, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập!' });
    }

    db.query('SELECT id, name, username, address FROM users WHERE role = "user"', (err, users) => {
        if (err) {
            console.error("Error fetching client users:", err);
            return res.status(500).json({ error: "Failed to fetch client users" });
        }

        const clientData = [];
        const promises = users.map(user => {
            return new Promise((resolve, reject) => {
                db.query('SELECT SUM(total_price) AS totalRevenue, COUNT(*) AS orderCount FROM orders WHERE user_id = ?', [user.id], (err, orderData) => {
                    if (err) {
                        console.error("Lỗi khi lấy thông tin đơn hàng của khách hàng:", err);
                        resolve({ ...user, totalRevenue: 0, orderCount: 0 }); // resolve với giá trị mặc định
                        return;
                    }
                    const totalRevenue = orderData[0]?.totalRevenue || 0;
                    const orderCount = orderData[0]?.orderCount || 0;
                    // Kết hợp thông tin user với doanh thu và số đơn hàng
                    resolve({
                        ...user,
                        totalRevenue: totalRevenue,
                        orderCount: orderCount
                    });
                });
            });
        });
        Promise.all(promises)
            .then(clientData => {
                res.json(clientData); // Trả về dữ liệu khách hàng
            })
            .catch(err => {
                console.error("Lỗi trong quá trình xử lý Promise:", err);
                return res.status(500).json({ error: "Lỗi trong quá trình xử lý dữ liệu khách hàng" });
            });
    });
});

//thêm người dùng



//??ng ký tài kho?n
router.post('/register', function (req, res) {
    var name = req.body.name;
    var username = req.body.username;
    var password = req.body.password;
    var address = req.body.address;

    // Ki?m tra thông tin ??u vào
    if (!name || !username || !password || !address) {
        return res.status(400).json({ message: 'Vui lòng nh?p ??y ?? thông tin!' });
    }
    var role = 'user'; //ng??i m?i ??ng ký m?c ??nh là user
    // Ki?m tra username ?ã t?n t?i ch?a
    var checkUserQuery = 'SELECT * FROM users WHERE username = ?';
    db.query(checkUserQuery, [username], function (err, results) {
        if (err) {
            console.error('L?i MySQL:', err);
            return res.status(500).json({ message: '?ã x?y ra l?i trên h? th?ng!' });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: 'tên đăng nhập đã tồn tại!' });
        }

        // n?u ch?a t?n t?i thì thêm m?i
        var insertQuery = 'INSERT INTO users (name, username, password, address, role) VALUES (?, ?, ?, ?, ?)';
        db.query(insertQuery, [name, username, password, address, role], function (err, results) {
            if (err) {
                console.error('L?i MySQL:', err)
                return res.status(500).json({ message: '??ng ký th?t b?i!' });
            }
            res.status(201).json({ message: '??ng ký thành công!' });
        });
    });
}); 

// ??ng nh?p
router.post('/login', function (req, res) {
    var username = req.body.username;
    var password = req.body.password;

    // Ki?m tra ??u vào
    if (!username || !password) {
        return res.status(400).json({ message: 'Vui lòng nh?p ??y ?? thông tin!' });
    }

    // Câu l?nh SQL ki?m tra username và password
    var sql = 'SELECT * FROM users WHERE username = ? AND password = ?';
    db.query(sql, [username, password], function (err, results) {
        if (err) {
            console.error('L?i MySQL:', err);
            return res.status(500).json({ message: 'Đã xảy ra lỗi trong hệ thống!' });
        }

        // Ki?m tra k?t qu?
        if (results.length > 0) {
            var user = results[0];
            req.session.user = {
                id: user.id,
                name: user.name,
                username: user.username,
                address: user.address,
                role: user.role
            };

            // Tr? v? ph?n h?i thành công
            res.status(200).json({
                message: 'Đăng nhập thành công!',
                user: req.session.user
                }
            );

        } else {
            res.status(401).json({ message: 'Tên đăng nhập và mật khẩu không đúng!' });
        }
    });
});
//??ng xu?t
router.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            console.error('L?i khi ??ng xu?t:', err);
            return res.status(500).json({ message: 'Không th? ??ng xu?t!' });
        }
        res.status(200).send();  // G?i mã tr?ng thái 200 khi ??ng xu?t thành công
    });
});

// Ki?m tra tr?ng thái ??ng nh?p
router.get('/check-login', function (req, res) {
    if (req.session.user) {
        // N?u ng??i dùng ?ã ??ng nh?p, tr? v? thông tin ng??i dùng
        res.status(200).json({ loggedIn: true, user: req.session.user });
    } else {
        // N?u ng??i dùng ch?a ??ng nh?p
        res.status(200).json({ loggedIn: false });
    }
});


// Route ?? l?y thông tin ng??i dùng ?ã ??ng nh?p
router.get('/profile', ensureAuthenticated, function (req, res) {
    // L?y thông tin ng??i dùng t? session
    var user = req.session.user;

    // Tr? v? thông tin ng??i dùng d??i d?ng JSON
    res.json({
        name: user.name,
        username: user.username,  // Gi? s? b?n l?u s? ?i?n tho?i trong DB
        address: user.address,  // ??a ch? c?a ng??i dùng
    });
});

// C?p nh?t thông tin cá nhân
router.put('/profile', ensureAuthenticated, function (req, res) {
    var userId = req.session.user.id; // L?y ID ng??i dùng t? session
    var name = req.body.name;
    var username = req.body.username;
    var password = req.body.password;
    var address = req.body.address;

    // Ki?m tra ??u vào
    if (!name || !username || !password || !address) {
        return res.status(400).json({ message: 'Vui lòng nh?p ??y ?? thông tin!' });
    }

    // Câu l?nh SQL ?? c?p nh?t thông tin
    var updateQuery = `
        UPDATE users 
        SET name = ?, username = ?, password = ?, address = ? 
        WHERE id = ?`;

    db.query(updateQuery, [name, username, password, address, userId], function (err, result) {
        if (err) {
            console.error('L?i MySQL:', err);
            return res.status(500).json({ message: 'C?p nh?t thông tin th?t b?i!' });
        }

        // C?p nh?t l?i session sau khi thông tin ???c thay ??i
        req.session.user.name = name;
        req.session.user.username = username;
        req.session.user.password = password;
        req.session.user.address = address;

        res.status(200).json({
            message: 'C?p nh?t thông tin thành công!',
            user: req.session.user
        });
    });


});

// sửa thông tin người dùng
router.put('/user/:id', ensureAuthenticated, (req, res) => {
    const userId = req.params.id;
     const updatedData = {  // Updated user data
        name: req.body.name,
        username: req.body.username,
        address: req.body.address,
        // other fields...
    };
    console.log('User ID from URL params:', userId);

    // Ghi log thông tin nhận từ body
    console.log('Request body:', req.body);

    if (!userId || isNaN(userId)) {  // Kiểm tra nếu userId không hợp lệ
        return res.status(400).json({ message: 'ID người dùng không hợp lệ!' });
    }

    const { name, username, address } = req.body;
    if (!name || !username || !address) {
        return res.status(400).json({ message: 'Thiếu thông tin cập nhật!' });
    }

    db.query('UPDATE users SET name = ?, username = ?, address = ? WHERE id = ?', [name, username, address, userId], (err, result) => {
        if (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ message: 'Cập nhật thông tin thất bại!' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }
        res.json({ message: 'Cập nhật thông tin thành công!' });
    });
});

// DELETE USER (DELETE request)
router.delete('/deleteuser/:id', ensureAuthenticated, (req, res) => {
    if (req.session.user.role !== 'admin') {
        return res.status(403).json({ message: 'Bạn không có quyền truy cập!' });
    }
    const userId = req.params.id;

    db.query('DELETE FROM users WHERE id = ?', [userId], (err, result) => {
        if (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({ message: 'Xóa người dùng thất bại!' });
        }
        if (result.affectedRows === 0) { // Check if the user was found and deleted
            return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
        }


        res.json({ message: 'Xóa người dùng thành công!' });
    });
});


module.exports = router;
