'use strict';
var express = require('express');
var router = express.Router();
var path = require('path');
var db = require('../db'); // K?t n?i ??n MySQL


router.get('/', (req, res) => {
    db.query(`
        SELECT o.order_id, o.order_date, o.total_price, u.name AS customer_name, u.username AS customer_phone, os.name AS status_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        JOIN order_statuses os ON o.status_id = os.id
        ORDER BY o.order_date DESC
    `, (err, orders) => {
        if (err) {
            console.error('Error fetching orders:', err);
            return res.status(500).json({ message: 'Error fetching orders' });
        }

        res.json(orders);
    });
});

router.get('/statuses', (req, res) => {
    db.query('SELECT * FROM order_statuses', (err, results) => {
        if (err) {
            console.error('Error fetching order statuses:', err);
            return res.status(500).json({ success: false, message: 'Error fetching order statuses' });
        }
        res.json(results);
    });
});

// Lấy danh sách đơn hàng của người dùng hiện tại
router.get('/user', (req, res) => {
    const user_id = req.session.user.id; // Lấy id của người dùng từ session

    if (!user_id) {
        return res.status(401).json({ message: 'Bạn chưa đăng nhập.' });
    }
    console.log("Session user:", req.session.user);
    db.query(`
        SELECT o.order_id, o.order_date, o.total_price, os.name AS status_name, os.id AS status_id, oi.product_id, oi.quantity, p.image_url, p.name AS product_name, p.price AS product_price
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        JOIN order_statuses os ON o.status_id = os.id
        WHERE o.user_id = ?
        ORDER BY o.order_date DESC
    `, [user_id], (err, results) => {
        if (err) {
            console.error('Error fetching user orders:', err);
            return res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn hàng.' });
        }
        // Nhóm các sản phẩm theo order_id
        const orders = {};
        results.forEach(row => {
            if (!orders[row.order_id]) {
                orders[row.order_id] = {
                    order_id: row.order_id,
                    order_date: row.order_date,
                    total_price: row.total_price,
                    status_name: row.status_name,
                    status_id: row.status_id,
                    items: []
                };
            }
            orders[row.order_id].items.push({
                product_id: row.product_id,
                product_name: row.product_name,
                quantity: row.quantity,
                price: row.product_price,
                image_url: row.image_url
            });
        });

        // Chuyển đổi object thành array
        const orderArray = Object.values(orders);
        res.json(orderArray); 

    });
});



//Đã có sẵn
// Lấy thông tin chi tiết của một đơn hàng
router.get('/:orderId', (req, res) => {
    const { orderId } = req.params;
    console.log("orderId: ", orderId);
    db.query(`
        SELECT o.*, u.name AS customer_name, u.username AS customer_phone, u.password AS customer_password, u.address AS customer_address, os.name AS status_name
        FROM orders o
        JOIN users u ON o.user_id = u.id
        LEFT JOIN order_statuses os ON o.status_id = os.id
        WHERE o.order_id = ?
    `, [orderId], (err, orderResult) => {
        if (err) {
            console.error('Error fetching order details:', err);
            return res.status(500).json({ message: 'Error fetching order details' });
        }
        if (!orderResult || orderResult.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const order = orderResult[0];

        db.query('SELECT oi.*, p.name AS product_name, p.image_url FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?', [order.id], (err, orderItemsResult) => {
            if (err) {
                console.error('Error fetching order items:', err);
                return res.status(500).json({ message: 'Error fetching order items' });
            }

            res.json({ ...order, items: orderItemsResult });

        });
    });
});


router.put('/:orderId/status', (req, res) => {
    const { orderId } = req.params;
    const { statusId } = req.body;

    db.query('UPDATE orders SET status_id = ? WHERE order_id = ?', [statusId, orderId], (err, result) => {
        if (err) {
            console.error('Error updating order status:', err);
            return res.status(500).json({ success: false, message: 'Error updating order status' });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.json({ success: true, message: 'Order status updated successfully' });
    });
});

// Lấy danh sách đơn hàng của người dùng hiện tại
router.get('/useror', (req, res) => {
    const user_id = req.session.user.id; // Lấy id của người dùng từ session

    if (!user_id) {
        return res.status(401).json({ message: 'Bạn chưa đăng nhập.' });
    }
    console.log("Session user:", req.session.user);
    db.query(`
        SELECT o.order_id, o.order_date, o.total_price, os.name AS status_name, os.id AS status_id, oi.product_id, oi.quantity, p.image_url, p.name AS product_name, p.price AS product_price
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        JOIN order_statuses os ON o.status_id = os.id
        WHERE o.user_id = ?
        ORDER BY o.order_date DESC
    `, [user_id], (err, results) => {
        if (err) {
            console.error('Error fetching user orders:', err);
            return res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn hàng.' });
        }
    });
    res.json(results);
});



module.exports = router;