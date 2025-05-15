'use strict';
var debug = require('debug')('my express app');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var app = express();
var db = require('./db');
var authRoutes = require('./routes/auth');
var session = require('express-session');
var usersroute = require('./routes/users');
var productsroute = require('./routes/products');
var cartRoute = require('./routes/cart');
var payRoute = require('./routes/payment');
var OrdersRoute = require('./routes/orders');
var vnpayRoute = require('./routes/vnpay');
const axios = require('axios');
const cors = require('cors');


// C?u hình CORS
const corsOptions = {
    origin: 'http://localhost:1337', // Ch? ??nh origin ???c phép
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // N?u c?n g?i cookie
};

app.use(cors(corsOptions));
// C?u hình các middleware
app.use(session({
    secret: 'jeunesse',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/auth', authRoutes);
app.use('/users', usersroute);
app.use('/products', productsroute);
app.use('/cart', cartRoute); 
app.use('/payment', payRoute); 
app.use('/orders', OrdersRoute); 
app.use('/vnpay', vnpayRoute);

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});  
// ???ng d?n
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'homepage.html'));
});

app.get('/admin', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'admin_products.html'));
});

app.get('/admin/orders',function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'admin_orders.html'));
});

app.get('/about', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'about.html'));
});

app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});
app.get('/profile', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'profile.html'));
});

app.get('/products/:category', function (req, res) {
    var category = req.params.category;
    var filePath = path.join(__dirname, 'views', 'products.html'); // Tr? v? t?p HTML

    res.sendFile(filePath, function (err) {
        if (err) {
            res.status(500).send('File không t?n t?i ho?c không th? t?i');
        }
    });
});

app.get('/admin/orders/:order_id', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'admin_detailorder.html'));
});

app.get('/admin/user', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'admin_user.html'));
});


app.get('/admin/client', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'admin_client.html'));
});

app.get('/products/detail/:id', function (req, res) {
    var productId = req.params.id;
    var filePath = path.join(__dirname, 'views', 'detailproducts.html'); // Tr? v? t?p HTML

    res.sendFile(filePath, function (err) {
        if (err) {
            res.status(500).send('File không t?n t?i ho?c không th? t?i');
        }
    });
   
}); 
// gi? hàng
app.get('/cart', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'cart.html'));
});

app.get('/payment', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'checkout.html'));
});

app.get('/tracking', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'TrackingOrders.html'));
});

app.get('/order-detail/:id', function (req, res) {
    res.sendFile(path.join(__dirname, 'views', 'OrderDetail.html'));
});

// x? lý l?i 404

app.post('/api/momo-payment/:userId', async (req, res) => {

    const crypto = require('crypto');
    const userId = req.params.userId;

    // Ki?m tra xem user_id có ???c cung c?p không
    if (!userId) {
        return res.status(400).json({ error: 'Thi?u user_id trong yêu c?u' });
    }


    const query = `
        SELECT
          SUM(ci.quantity * p.price) AS total_price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
    `;

    connection.query(query, [userId], async (err, results) => {
        if (err) {
            return res.status(500).json({ message: "L?i khi truy v?n gi? hàng!" });
        }

        const totalPrice = results[0]?.total_price || 0;

        if (totalPrice === 0) {
            return res.status(400).json({ message: "Gi? hàng tr?ng ho?c không h?p l?!" });
        }

        const accessKey = 'F8BBA842ECF85'; // Access key c?a b?n
        const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz'; // Secret key c?a b?n
        const orderId = `MOMO${Date.now()}`; // Order ID c?a b?n
        const requestId = orderId; // Request ID th??ng b?ng v?i order ID
        const amount = totalPrice; // S? ti?n thanh toán
        const orderInfo = 'JEUNESSE'; // Thông tin ??n hàng
        const partnerCode = 'MOMO'; // Mã ??i tác
        const redirectUrl = 'http://localhost:1337/'; // URL chuy?n h??ng
        const ipnUrl = 'http://localhost:1337/ipn'; // IPN URL (c?p nh?t thông tin thanh toán)
        const extraData = 'eyJ1c2VybmFtZSI6ICJtb21vIn0='; // Extra data (n?u có)

        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

        console.log('RAW SIGNATURE: ', rawSignature);

        // T?o ch? ký HMAC-SHA256
        const signature = crypto
            .createHmac('sha256', secretKey)
            .update(rawSignature)
            .digest('hex');

        console.log('Signature: ', signature);

        const requestBody = JSON.stringify({
            partnerCode,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            requestType: "captureWallet",
            extraData,
            signature,
        });


        const options = {
            method: 'POST',
            url: 'https://test-payment.momo.vn/v2/gateway/api/create',
            headers: {
                'Content-Type': 'application/json',
            },
            data: requestBody,
        };

        try {
            const result = await axios(options);
            console.log("MoMo API response: ", result.data); // Log toàn b? k?t qu? tr? v? t? MoMo

            // Ki?m tra và x? lý k?t qu? tr? v? t? MoMo
            if (result.data) {
                return res.status(200).json({ qrUrl: result.data.qrCodeUrl, payUrl: result.data.payUrl });

            } else {
                return res.status(500).json({ message: "Không t?o ???c mã QR!" });
            }
        } catch (error) {
            console.error("Error from MoMo: ", error.response?.data || error.message); // Log l?i chi ti?t
            return res.status(500).json({ message: "L?i t? server!" });
        }
    });
    

});



app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// X? lý l?i
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.send({
        message: err.message,
        error: err
    });
});

}


app.set('port', process.env.PORT || 3001);

var server = app.listen(app.get('port'), function () {
    debug('Express server listening on port ' + server.address().port);
});
