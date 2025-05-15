'use strict';
const express = require('express');
const router = express.Router();
const moment = require('moment');
const querystring = require('qs');
const crypto = require("crypto");
const config = require('config');

function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}

router.post('/create_payment_url', (req, res) => {
    try {
        // Kiểm tra yêu cầu  
        if (!req.body || !req.body.amount || !req.body.language) {
            return res.status(400).json({ message: 'Yêu cầu không hợp lệ' });
        }

        // Cấu hình VNPAY  
        const tmnCode = 'IG720LYN';
        const secretKey = 'D1L07YZNJ5QEXOFQOGGZ1GDF5D4FRRCM';
        const vnpUrl = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const returnUrl = 'http://localhost:1337/payment';

        // Tạo dữ liệu giao dịch  
        const orderId = moment().format('DDHHmmss');
        const amount = req.body.amount;
        const bankCode = req.body.bankCode;
        const locale = req.body.language;
        const currCode = 'VND';

        // Tạo đối tượng VNPAY  
        const vnp_Params = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: tmnCode,
            vnp_Locale: locale,
            vnp_CurrCode: currCode,
            vnp_TxnRef: orderId,
            vnp_OrderInfo: 'Thanh toan cho ma GD:' + orderId,
            vnp_OrderType: 'other',
            vnp_Amount: amount * 100 * 1000,
            vnp_ReturnUrl: returnUrl,
            vnp_IpAddr: '127.0.0.1',
            vnp_CreateDate: moment().format('YYYYMMDDHHmmss'),
        };

        if (bankCode) {
            vnp_Params.vnp_BankCode = bankCode;
        }

        // Sắp xếp đối tượng VNPAY  
        const sortedParams = sortObject(vnp_Params);

        // Tạo chuỗi ký  
        const signData = querystring.stringify(sortedParams, { encode: false });
        const hmac = crypto.createHmac('sha512', secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        // Thêm chuỗi ký vào đối tượng VNPAY  
        sortedParams.vnp_SecureHash = signed;

        // Tạo URL VNPAY  
        const vnpUrlWithParams = vnpUrl + '?' + querystring.stringify(sortedParams, { encode: false });

        // Chuyển hướng đến URL VNPAY  
        res.status(200).json({ paymentUrl: vnpUrlWithParams });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi không xác định' });
    }
});  

router.get('/vnpay_return', (req, res) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let tmnCode = config.get('vnp_TmnCode');
    let secretKey = config.get('vnp_HashSecret');
    let signData = querystring.stringify(vnp_Params, { encode: false });


    // Fix for 'Buffer' is deprecated warning
    let hmac = crypto.createHmac("sha512", secretKey);
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        //Kiem tra xem du lieu trong db co hop le hay khong va thong bao ket qua
        res.json({ code: vnp_Params['vnp_ResponseCode'] }); // Changed to JSON response
    } else {
        res.json({ code: '97' }); // Changed to JSON response
    }
});


router.get('/vnpay_ipn', function (req, res, next) {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];
    let orderId = vnp_Params['vnp_TxnRef'];
    let rspCode = vnp_Params['vnp_ResponseCode'];
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    let secretKey = config.get('vnp_HashSecret');
    let signData = querystring.stringify(vnp_Params, { encode: false });
    let hmac = crypto.createHmac("sha512", secretKey);

    // Fix for 'Buffer' is deprecated warning
    let signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
    let paymentStatus = '0';

    let checkOrderId = true;
    let checkAmount = true;
    if (secureHash === signed) {
        if (checkOrderId) {
            if (checkAmount) {
                if (paymentStatus == "0") {
                    if (rspCode == "00") {
                        //thanh cong
                        paymentStatus = '1'
                        res.status(200).json({ RspCode: '00', Message: 'Success' }); // JSON Response
                    } else {
                        //that bai
                        paymentStatus = '2'
                        res.status(200).json({ RspCode: '00', Message: 'Success' });  // JSON Response
                    }
                } else {
                    res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' }); // JSON Response
                }
            } else {
                res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });  // JSON Response
            }
        } else {
            res.status(200).json({ RspCode: '01', Message: 'Order not found' }); // JSON Response
        }
    } else {
        res.status(200).json({ RspCode: '97', Message: 'Checksum failed' }); // JSON Response
    }
});


// Query and Refund routes
router.post('/querydr', (req, res) => {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    let date = new Date();
    let crypto = require("crypto");
    let vnp_TmnCode = config.get('vnp_TmnCode');
    let secretKey = config.get('vnp_HashSecret');
    let vnp_Api = config.get('vnp_Api');
    let vnp_TxnRef = req.body.orderId;
    let vnp_TransactionDate = req.body.transDate;
    let vnp_RequestId = moment(date).format('HHmmss');
    let vnp_Version = '2.1.0';
    let vnp_Command = 'querydr';
    let vnp_OrderInfo = 'Truy van GD ma:' + vnp_TxnRef;
    let vnp_IpAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    let vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
    let data = vnp_RequestId + "|" + vnp_Version + "|" + vnp_Command + "|" + vnp_TmnCode + "|" + vnp_TxnRef + "|" + vnp_TransactionDate + "|" + vnp_CreateDate + "|" + vnp_IpAddr + "|" + vnp_OrderInfo;

    let hmac = crypto.createHmac("sha512", secretKey);
    let vnp_SecureHash = hmac.update(Buffer.from(data, 'utf-8')).digest("hex");

    let dataObj = {
        'vnp_RequestId': vnp_RequestId,
        'vnp_Version': vnp_Version,
        'vnp_Command': vnp_Command,
        'vnp_TmnCode': vnp_TmnCode,
        'vnp_TxnRef': vnp_TxnRef,
        'vnp_OrderInfo': vnp_OrderInfo,
        'vnp_TransactionDate': vnp_TransactionDate,
        'vnp_CreateDate': vnp_CreateDate,
        'vnp_IpAddr': vnp_IpAddr,
        'vnp_SecureHash': vnp_SecureHash
    };


    request({
        url: vnp_Api,
        method: "POST",
        json: true,
        body: dataObj
    }, (error, response, body) => {
        if (error) {
            console.error('Error querying transaction:', error);
            return res.status(500).json({ message: 'Error querying transaction' });
        }
        res.json(response.body);
    });

});

router.post('/refund', (req, res) => {
    process.env.TZ = 'Asia/Ho_Chi_Minh';
    let date = new Date();
    let crypto = require("crypto");
    let vnp_TmnCode = config.get('vnp_TmnCode');
    let secretKey = config.get('vnp_HashSecret');
    let vnp_Api = config.get('vnp_Api');
    let vnp_TxnRef = req.body.orderId;
    let vnp_TransactionDate = req.body.transDate;
    let vnp_Amount = req.body.amount * 100;
    let vnp_TransactionType = req.body.transType;
    let vnp_CreateBy = req.body.user;
    let vnp_RequestId = moment(date).format('HHmmss');
    let vnp_Version = '2.1.0';
    let vnp_Command = 'refund';
    let vnp_OrderInfo = 'Hoan tien GD ma:' + vnp_TxnRef;
    let vnp_IpAddr = req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
    let vnp_CreateDate = moment(date).format('YYYYMMDDHHmmss');
    let vnp_TransactionNo = '0';
    let data = vnp_RequestId + "|" + vnp_Version + "|" + vnp_Command + "|" + vnp_TmnCode + "|" + vnp_TransactionType + "|" + vnp_TxnRef + "|" + vnp_Amount + "|" + vnp_TransactionNo + "|" + vnp_TransactionDate + "|" + vnp_CreateBy + "|" + vnp_CreateDate + "|" + vnp_IpAddr + "|" + vnp_OrderInfo;

    let hmac = crypto.createHmac("sha512", secretKey);
    let vnp_SecureHash = hmac.update(Buffer.from(data, 'utf-8')).digest("hex");

    let dataObj = {
        'vnp_RequestId': vnp_RequestId,
        'vnp_Version': vnp_Version,
        'vnp_Command': vnp_Command,
        'vnp_TmnCode': vnp_TmnCode,
        'vnp_TransactionType': vnp_TransactionType,
        'vnp_TxnRef': vnp_TxnRef,
        'vnp_Amount': vnp_Amount,
        'vnp_TransactionNo': vnp_TransactionNo,
        'vnp_CreateBy': vnp_CreateBy,
        'vnp_OrderInfo': vnp_OrderInfo,
        'vnp_TransactionDate': vnp_TransactionDate,
        'vnp_CreateDate': vnp_CreateDate,
        'vnp_IpAddr': vnp_IpAddr,
        'vnp_SecureHash': vnp_SecureHash
    };

    request({
        url: vnp_Api,
        method: "POST",
        json: true,
        body: dataObj
    }, (error, response, body) => {
        if (error) {
            console.error('Error refunding transaction:', error);
            return res.status(500).json({ message: 'Error refunding transaction' });
        }
        res.json(response.body);
    });
});
module.exports = router;