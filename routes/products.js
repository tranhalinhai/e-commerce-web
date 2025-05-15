'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');
var db = require('../db'); // K?t n?i ??n MySQL
var multer = require('multer');
var fs = require('fs');

// Đảm bảo thư mục images tồn tại
const imagesDir = path.join(__dirname, '..', 'public', 'image');
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true }); // Tạo thư mục images nếu chưa tồn tại
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, imagesDir); // Lưu vào thư mục D:/21CDP1-TMDT/Jeunesse/public/images
    },
    filename: function (req, file, cb) {
        const timestamp = Date.now(); // Đặt tên file với timestamp để tránh trùng
        cb(null, `${timestamp}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Lấy danh sách sản phẩm
router.get('/get', (req, res) => {
    db.query('SELECT * FROM products', (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Lỗi khi truy vấn cơ sở dữ liệu!' });
        }
        res.status(200).json(results);  // Trả về danh sách sản phẩm dưới dạng JSON
    });
});


// Thêm sản phẩm mới
router.post('/add', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Không có ảnh được tải lên.' });
    }
    var name = req.body.name;
    var description = req.body.description;
    var price = req.body.price;
    var image_url = `/image/${req.file.filename}`;
    var category = req.body.category;
    var flavor = req.body.flavor;
    var stock = req.body.stock;

    // Thêm sản phẩm vào cơ sở dữ liệu
    db.query(
        'INSERT INTO products (name, description, price, image_url, category, flavor, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, description, price, image_url, category, flavor, stock],
        err => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Đã xảy ra lỗi khi thêm sản phẩm' });
            }
            res.json({ message: 'Thêm sản phẩm thành công' });
        }
    );
});

// Cập nhật sản phẩm
router.put('/update/:id', (req, res) => {
    var  id  = req.params.id;
    var name = req.body.name;
    var description = req.body.description;
    var price = req.body.price;
    var image_url = req.body.image_url;
    var category = req.body.category;
    var flavor = req.body.flavor;
    var stock = req.body.stock;
    db.query(
        'UPDATE products SET name = ?, description = ?, price = ?,  image_url = ?, category = ?, flavor = ? , stock = ? WHERE id = ?',
        [name, description, price, image_url, category, flavor, stock, id],
        err => {
            if (err) throw err;
            res.json({ message: 'Thay đổi thông tin sản phẩm thành công' });
        }
    );
});

// Xóa sản phẩm
router.delete('/del/:id', (req, res) => {
    var  id  = req.params.id;
    db.query('DELETE FROM products WHERE id = ?', [id], err => {
        if (err) throw err;
        res.json({ message: 'Xóa sản phẩm thành công' });
    });
});

// Lọc sản phẩm theo loại
router.get('/api/:category', (req, res) => {
    var category = req.params.category; // Lấy tên category từ URL

    db.query('SELECT * FROM products WHERE category = ?', [category], (err, results) => {
        if (err) {
            console.error('Lỗi khi truy vấn database:', err);
            res.status(500).send('Lỗi server');
            return;
        }
        res.json(results);

    });
});

// chi tiết sản phẩm

router.get('/detail-product/:id', (req, res) => {
    var productId = req.params.id; 

    db.query('SELECT * FROM products WHERE id = ?', [productId], (err, results) => {
        if (err) {
            console.error('Lỗi khi truy vấn database:', err);
            return res.status(500).json({ error: 'Lỗi server' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm.' });
        }

        res.json(results[0]); // Chỉ trả về sản phẩm đầu tiên
    });
});


    module.exports = router;

