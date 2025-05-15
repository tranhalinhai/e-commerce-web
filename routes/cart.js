'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');
var db = require('../db'); // K?t n?i ??n MySQL


// API thêm sản phẩm vào giỏ hàng
router.post('/add-to-cart', (req, res) => {
  const { id: product_id, quantity } = req.body;
  const user_id = req.session.user.id;

  // Kiểm tra quantity
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'Số lượng sản phẩm không hợp lệ.' });
  }

  if (!user_id) {
    return res.status(401).json({ success: false, message: 'Người dùng chưa đăng nhập' });
  }

  // Lấy thông tin sản phẩm, bao gồm stock
  db.query('SELECT * FROM products WHERE id = ?', [product_id], (err, productResults) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (productResults.length === 0) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
    }

    const product = productResults[0];
    const stock = product.stock;

    // Kiểm tra xem sản phẩm đã có trong giỏ hàng của user chưa
    db.query('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [user_id, product_id], (err, cartResults) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ success: false, message: 'Database error' });
      }

      if (cartResults.length > 0) {
        // Sản phẩm đã tồn tại, cập nhật số lượng
        const newQuantity = cartResults[0].quantity + quantity;

        // Kiểm tra số lượng tồn kho
        if (newQuantity > stock) {
          return res.status(400).json({ success: false, message: 'Số lượng sản phẩm vượt quá số lượng tồn kho!' });
        }

        db.query('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', [newQuantity, user_id, product_id], (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          res.json({ success: true, message: 'Cập nhật số lượng sản phẩm trong giỏ hàng thành công!' });
        });
      } else {
        // Sản phẩm chưa có, thêm mới vào giỏ hàng

        // Kiểm tra số lượng tồn kho
        if (quantity > stock) {
          return res.status(400).json({ success: false, message: 'Số lượng sản phẩm vượt quá số lượng tồn kho!' });
        }

        db.query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [user_id, product_id, quantity], (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
          }
          res.json({ success: true, message: 'Thêm sản phẩm vào giỏ hàng thành công!' });
        });
      }
    });
  });
});

// API lấy thông tin giỏ hàng
router.get('/get-cart', (req, res) => {
    const user_id = req.session.user.id;

    if (!user_id) {
        return res.status(401).json({ message: 'User not logged in' });
    }

    // Lấy thông tin giỏ hàng của user từ database
    db.query(`
      SELECT ci.quantity, p.* 
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
  `, [user_id], (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json(results);
    });
});

// API xóa sản phẩm khỏi giỏ hàng
router.post('/remove-from-cart', (req, res) => {
    const { id: product_id } = req.body;
    const user_id = req.session.user.id;

    if (!user_id) {
        return res.status(401).json({ message: 'User not logged in' });
    }

    db.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [user_id, product_id], (err) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }
        res.json({ message: 'Product removed from cart successfully!' });
    });
});

// API cập nhật số lượng sản phẩm trong giỏ hàng
router.post('/update-cart-quantity', (req, res) => {
    const { id: product_id, quantity } = req.body;
    const user_id = req.session.user.id;

    if (!user_id) {
        return res.status(401).json({ message: 'User not logged in' });
    }
    if (quantity <= 0) {
        db.query('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?', [user_id, product_id], (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }
            res.json({ message: 'Product removed from cart successfully!' });
        });
    } else {


        // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa
        db.query('SELECT * FROM cart_items WHERE user_id = ? AND product_id = ?', [user_id, product_id], (err, results) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length > 0) {
                // Sản phẩm đã có trong giỏ hàng, cập nhật số lượng
                db.query('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?', [quantity, user_id, product_id], (err) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }
                    res.json({ message: 'Cart quantity updated successfully!' });
                });
            } else {
                // Sản phẩm chưa có trong giỏ hàng, kiểm tra xem có phải phụ kiện không
                db.query('SELECT * FROM products WHERE id = ?', [product_id], (err, productResults) => {
                    if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }

                    if (productResults.length === 0) {
                        return res.status(404).json({ success: false, message: 'Product not found' });
                    }

                    const product = productResults[0];

                    // Nếu là phụ kiện, thêm vào giỏ hàng
                    if (product.category === 'phukien') {
                        db.query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)', [user_id, product_id, quantity], (err) => {
                            if (err) {
                                console.error('Database error:', err);
                                return res.status(500).json({ message: 'Database error' });
                            }
                            res.json({ success: true, message: 'Accessory added to cart successfully!' });
                        });
                    } else {
                        // Không phải phụ kiện, không thêm vào giỏ hàng
                        res.status(400).json({ success: false, message: 'This product cannot be added to cart from here.' });
                    }
                });
            }
        });
    }
});

module.exports = router;