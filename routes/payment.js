'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');
var db = require('../db'); // K?t n?i ??n MySQL


// Route lấy thông tin thanh toán (GET /payment/details)
router.get('/details', (req, res) => {
    const user = req.session.user;
    const user_id = req.session.user.id;

    // Lấy thông tin giỏ hàng của user (bao gồm cả sản phẩm chính và phụ kiện)
    db.query('SELECT ci.quantity, p.* FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?', [user_id], (err, cartResults) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error' });
        }

            // Tính tổng tiền (bao gồm cả phụ kiện)
            let total = 0;
            cartResults.forEach(item => {
                total += item.quantity * item.price;
            });

            res.json({ user, cart: cartResults, total }); // Trả về cart bao gồm cả sản phẩm chính và phụ kiện
        });
    });


// Route xử lý thanh toán (POST /payment)
router.post('/', (req, res) => {
    const user = req.session.user;
    const user_id = req.session.user.id;
    const { paymentMethod, orderId } = req.body; // Lấy thông tin phương thức thanh toán và mã đơn hàng

    // Lấy thông tin giỏ hàng từ database
    db.query('SELECT ci.quantity, ci.product_id, p.price, p.stock FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = ?', [user_id], (err, cartResults) => { // Thêm trường stock
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }

        if (cartResults.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        const cart = cartResults;
        let total = 0;
        cart.forEach(item => {
            total += item.quantity * item.price * 1000;
        });

        let shippingFee = 30000;
        let discount = (paymentMethod == 'transfer' || paymentMethod == 'momo' || paymentMethod === 'vnpay') ? total * 0.05 : 0;
        total = total + shippingFee - discount;

        // Bắt đầu transaction
        db.query('START TRANSACTION', (err) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ success: false, message: 'Database error' });
            }
            let orderStatus = 'Đã thanh toán'
            if (paymentMethod === 'transfer' || paymentMethod === 'momo' || paymentMethod === 'vnpay') {
                orderStatus = 'Chờ thanh toán'; // Trạng thái chờ thanh toán nếu là chuyển khoản hoặc momo
            }
            db.query('SELECT id FROM order_statuses WHERE name = ?', [orderStatus], (err, statusResult) => {
                if (err) {
                    console.error('Database error getting status id:', err);
                    return db.rollback(() => res.status(500).json({ message: 'Database error' }));
                }
                const statusId = statusResult[0].id;
                // 1. Lưu thông tin đơn hàng vào bảng `orders`
                db.query('INSERT INTO orders (user_id, total_price, order_date, order_id, status_id, payment_method) VALUES (?, ?, NOW(), ?, ?, ?)', [user_id, total, orderId, statusId, paymentMethod], (err, orderResult) => {
                    if (err) {
                        console.error('Database error:', err);
                        return db.query('ROLLBACK', () => res.status(500).json({ success: false, message: 'Database error' }));
                    }

                    const newOrderId = orderResult.insertId;

                    // 2. Lưu thông tin chi tiết đơn hàng vào bảng `order_items`
                    let orderItemsSaved = 0;
                    for (const item of cart) {
                        db.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)', [newOrderId, item.product_id, item.quantity, item.price], (err) => {
                            if (err) {
                                console.error('Database error:', err);
                                return db.query('ROLLBACK', () => res.status(500).json({ success: false, message: 'Database error' }));
                            }

                            orderItemsSaved++;
                            if (orderItemsSaved === cart.length) {
                                // 3. Cập nhật số lượng tồn kho trong bảng `products`
                                let productsUpdated = 0;
                                for (const item of cart) {
                                    // Kiểm tra số lượng tồn kho trước khi cập nhật
                                    if (item.quantity > item.stock) {
                                        console.error('Not enough stock for product:', item.product_id);
                                        return db.query('ROLLBACK', () => res.status(400).json({ success: false, message: 'Not enough stock for one or more products' }));
                                    }
                                    db.query('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id], (err) => {
                                        if (err) {
                                            console.error('Database error:', err);
                                            return db.query('ROLLBACK', () => res.status(500).json({ success: false, message: 'Database error' }));
                                        }

                                        productsUpdated++;
                                        if (productsUpdated === cart.length) {
                                            // 4. Xóa giỏ hàng
                                            db.query('DELETE FROM cart_items WHERE user_id = ?', [user_id], (err) => {
                                                if (err) {
                                                    console.error('Database error:', err);
                                                    return db.query('ROLLBACK', () => res.status(500).json({ success: false, message: 'Database error' }));
                                                }

                                                // Commit transaction
                                                db.query('COMMIT', (err) => {
                                                    if (err) {
                                                        console.error('Database error:', err);
                                                        return db.query('ROLLBACK', () => res.status(500).json({ success: false, message: 'Database error' }));
                                                    }

                                                    req.session.cart = [];
                                                    res.json({ success: true, message: 'Payment successful!' });
                                                });
                                            });
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            });
        });
    });
});


module.exports = router;