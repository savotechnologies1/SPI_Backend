// const prisma = require("../config/prisma");
// const paypal = require('@paypal/checkout-server-sdk');
// const nodemailer = require('nodemailer');
// const { sendMail } = require("../functions/mailer");
// // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// const Stripe = require('stripe'); // 👈 Sirf itna rakhein (No key here)
// // exports.createPayment = async (req, res) => {
// //     try {
// //         const { items, customerDetails, method, gateway } = req.body;

// //         // Admin aur Tenant fetch karein
// //         const adminId = req.user.id;
// //         const admin = await prisma.admin.findUnique({
// //             where: { id: adminId },
// //             include: { tenant: true }
// //         });

// //         if (!admin || !admin.tenant || !admin.tenant.stripeSecretKey) {
// //             return res.status(404).json({ success: false, message: "Stripe configuration missing." });
// //         }

// //         const tenant = admin.tenant;
        
// //         // ✅ Ye line check karein, variable 'Stripe' hona chahiye
// //         const stripeClient = new Stripe(tenant.stripeSecretKey);

// //         const internalId = items[0].id; 
// //         const orderType = items[0].type; 

// //         if (gateway === 'STRIPE') {
// //             const session = await stripeClient.checkout.sessions.create({
// //                 payment_method_types: ['card'],
// //                 client_reference_id: String(internalId),
// //     metadata: {
// //         orderId: String(internalId),
// //         orderType: orderType,
// //         tenantId: admin.tenant.id
// //     },
// //                 line_items: items.map(item => ({
// //                     price_data: {
// //                         currency: 'usd',
// //                         product_data: { name: item.name },
// //                         unit_amount: Math.round(item.price * 100),
// //                     },
// //                     quantity: item.quantity,
// //                 })),
// //                 mode: 'payment',
// //                 customer_email: customerDetails.email,
// //                 success_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&type=${orderType}`,
// //                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
// //             });
// // console.log('session',session)
// // const paymentUrl = session.url; 

// //            if (method === 'EMAIL') {
// //     // 1. Total Calculate karein
// //     const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);

// //     // 2. Stripe Session se link nikalna
// //     const paymentUrl = session.url; 

// //     // 3. Aapka standard template-based sendMail function call karein
// //     await sendMail(
// //         "order-payment-link", // Template ka naam (Event)
// //         {
// //             "%name%": customerDetails.name || "Customer",
// //             "%amount%": totalAmount,
// //             "%paymentUrl%": paymentUrl,
// //             "%tenantName%": tenant.tenantName || "BHIVES"
// //         },
// //         customerDetails.email // Jisne order kiya uski email
// //     );

// //     return res.json({ 
// //         success: true, 
// //         message: "Order created and payment link has been sent to the customer's email." 
// //     });
// // }
// //             return res.json({ success: true, url: paymentUrl });
// //         }
// //     } catch (error) {
// //         console.error("❌ Checkout Error:", error.message);
// //         res.status(500).json({ success: false, message: error.message });
// //     }
// // };


// // controllers/paymentController.js


// // PayPal Client Helper Function
// // function getPaypalClient(tenant) {
// //     let environment = new paypal.core.SandboxEnvironment(
// //         tenant.paypalClientId, 
// //         tenant.paypalSecretKey
// //     );
// //     return new paypal.core.PayPalHttpClient(environment);
// // }

// // exports.createPayment = async (req, res) => {
// //     try {
// //         const { items, customerDetails, method, gateway } = req.body;
// //         const adminId = req.user.id;

// //         const admin = await prisma.admin.findUnique({
// //             where: { id: adminId },
// //             include: { tenant: true }
// //         });

// //         if (!admin || !admin.tenant) return res.status(404).json({ message: "Tenant settings not found" });

// //         const tenant = admin.tenant;
// //         const internalId = items[0].id;
// //         const orderType = items[0].type;
// //         const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);

// //         // --- STRIPE LOGIC (Same as before) ---
// //         if (gateway === 'STRIPE') {
// //             const stripeClient = new Stripe(tenant.stripeSecretKey);
// //             const session = await stripeClient.checkout.sessions.create({
// //                 payment_method_types: ['card'],
// //                 client_reference_id: String(internalId),
// //                 metadata: { orderId: internalId, orderType, tenantId: tenant.id },
// //                 line_items: items.map(item => ({
// //                     price_data: {
// //                         currency: 'usd',
// //                         product_data: { name: item.name },
// //                         unit_amount: Math.round(item.price * 100),
// //                     },
// //                     quantity: item.quantity,
// //                 })),
// //                 mode: 'payment',
// //                 customer_email: customerDetails.email,
// //                 success_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&type=${orderType}&gateway=stripe`,
// //                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
// //             });

// //             if (method === 'EMAIL') {
// //                 await sendMail("order-payment-link", { "%name%": customerDetails.name, "%amount%": totalAmount, "%paymentUrl%": session.url, "%tenantName%": tenant.tenantName }, customerDetails.email);
// //                 return res.json({ success: true, message: "Stripe link emailed" });
// //             }
// //             return res.json({ success: true, url: session.url });
// //         }

// //         // --- PAYPAL LOGIC (NEW) ---
// //         else if (gateway === 'PAYPAL') {
// //             if (!tenant.paypalClientId || !tenant.paypalSecretKey) {
// //                 return res.status(400).json({ message: "PayPal keys missing for this tenant" });
// //             }

// //             const client = getPaypalClient(tenant);
// //             const request = new paypal.orders.OrdersCreateRequest();
            
// //             request.prefer("return=representation");
// //             request.requestBody({
// //                 intent: 'CAPTURE',
// //                 purchase_units: [{
// //                     reference_id: internalId, // Database ID
// //                     amount: {
// //                         currency_code: 'USD',
// //                         value: totalAmount
// //                     },
// //                     description: `Order ${internalId} for ${tenant.tenantName}`,
// //                     custom_id: JSON.stringify({ orderId: internalId, orderType, tenantId: tenant.id })
// //                 }],
// //                 application_context: {
// //                     brand_name: tenant.tenantName,
// //                     landing_page: 'BILLING',
// //                     user_action: 'PAY_NOW',
// //                     return_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&type=${orderType}&gateway=paypal`,
// //                     cancel_url: `${process.env.FRONTEND_URL}/cancel`
// //                 }
// //             });

// //             const response = await client.execute(request);
// //             const approvalUrl = response.result.links.find(link => link.rel === 'approve').href;

// //             if (method === 'EMAIL') {
// //                 await sendMail("order-payment-link", { "%name%": customerDetails.name, "%amount%": totalAmount, "%paymentUrl%": approvalUrl, "%tenantName%": tenant.tenantName }, customerDetails.email);
// //                 return res.json({ success: true, message: "PayPal link emailed" });
// //             }

// //             return res.json({ success: true, url: approvalUrl });
// //         }

// //     } catch (error) {
// //         console.error("❌ Checkout Error:", error);
// //         res.status(500).json({ success: false, message: error.message });
// //     }
// // };

// // ... existing imports ...

// // Helper function to get PayPal Client (Sandbox/Live logic added)
// // function getPaypalClient(tenant) {
// //     // Agar production keys hain toh LiveEnvironment use karein, warna Sandbox
// //     const environment = process.env.NODE_ENV === 'production' 
// //         ? new paypal.core.LiveEnvironment(tenant.paypalClientId, tenant.paypalSecretKey)
// //         : new paypal.core.SandboxEnvironment(tenant.paypalClientId, tenant.paypalSecretKey);
    
// //     return new paypal.core.PayPalHttpClient(environment);
// // }

// // exports.createPayment = async (req, res) => {
// //     try {
// //         const { items, customerDetails, method, gateway } = req.body;
// //         const adminId = req.user.id;

// //         const admin = await prisma.admin.findUnique({
// //             where: { id: adminId },
// //             include: { tenant: true }
// //         });

// //         if (!admin || !admin.tenant) return res.status(404).json({ message: "Tenant configuration not found" });

// //         const tenant = admin.tenant;
// //         const internalId = items[0].id; // Main ID (UUID)
// //         const orderType = items[0].type; 
// //         const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);

// //         // --- STRIPE LOGIC (Already Working) ---
// //         if (gateway === 'STRIPE') {
// //             const stripeClient = new Stripe(tenant.stripeSecretKey);
// //             const session = await stripeClient.checkout.sessions.create({
// //                 payment_method_types: ['card'],
// //                 client_reference_id: String(internalId),
// //                 metadata: { orderId: internalId, orderType, tenantId: tenant.id },
// //                 line_items: items.map(item => ({
// //                     price_data: {
// //                         currency: 'usd',
// //                         product_data: { name: item.name },
// //                         unit_amount: Math.round(item.price * 100),
// //                     },
// //                     quantity: item.quantity,
// //                 })),
// //                 mode: 'payment',
// //                 customer_email: customerDetails.email,
// //                 success_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&type=${orderType}&gateway=stripe`,
// //                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
// //             });

// //             if (method === 'EMAIL') {
// //                 await sendMail("order-payment-link", { "%name%": customerDetails.name, "%amount%": totalAmount, "%paymentUrl%": session.url, "%tenantName%": tenant.tenantName }, customerDetails.email);
// //                 return res.json({ success: true, message: "Stripe link emailed" });
// //             }
// //             return res.json({ success: true, url: session.url });
// //         }

// //         // --- PAYPAL LOGIC (Updated to match Stripe's behavior) ---
// //         else if (gateway === 'PAYPAL') {
// //             if (!tenant.paypalClientId || !tenant.paypalSecretKey) {
// //                 return res.status(400).json({ message: "PayPal keys missing for this tenant" });
// //             }

// //             const client = getPaypalClient(tenant);
// //             const request = new paypal.orders.OrdersCreateRequest();
            
// //             request.prefer("return=representation");
// //             request.requestBody({
// //                 intent: 'CAPTURE',
// //                 purchase_units: [{
// //                     reference_id: internalId, // Database UUID
// //                     amount: {
// //                         currency_code: 'USD',
// //                         value: totalAmount
// //                     },
// //                     description: `Order ${internalId}`,
// //                     // Metadata storage for Webhook
// //                     custom_id: JSON.stringify({ 
// //                         orderId: internalId, 
// //                         orderType: orderType, 
// //                         tenantId: tenant.id 
// //                     })
// //                 }],
// //                 application_context: {
// //                     brand_name: tenant.tenantName,
// //                     landing_page: 'BILLING',
// //                     user_action: 'PAY_NOW',
// //                     return_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&type=${orderType}&gateway=paypal`,
// //                     cancel_url: `${process.env.FRONTEND_URL}/cancel`
// //                 }
// //             });

// //             const response = await client.execute(request);
// //             const approvalUrl = response.result.links.find(link => link.rel === 'approve').href;

// //             if (method === 'EMAIL') {
// //                 await sendMail("order-payment-link", { 
// //                     "%name%": customerDetails.name, 
// //                     "%amount%": totalAmount, 
// //                     "%paymentUrl%": approvalUrl, 
// //                     "%tenantName%": tenant.tenantName 
// //                 }, customerDetails.email);
// //                 return res.json({ success: true, message: "PayPal link emailed" });
// //             }

// //             return res.json({ success: true, url: approvalUrl });
// //         }

// //     } catch (error) {
// //         console.error("❌ Checkout Error:", error);
// //         res.status(500).json({ success: false, message: error.message });
// //     }
// // };

// function getPaypalClient(tenant) {
//     // Sandbox or Live based on environment
//     const environment = process.env.NODE_ENV === 'production'
//         ? new paypal.core.LiveEnvironment(tenant.paypalClientId, tenant.paypalSecretKey)
//         : new paypal.core.SandboxEnvironment(tenant.paypalClientId, tenant.paypalSecretKey);
    
//     return new paypal.core.PayPalHttpClient(environment);
// }
// exports.createPayment = async (req, res) => {
//     try {
//         const { items, customerDetails, method, gateway } = req.body;
//         const adminId = req.user.id;

//         const admin = await prisma.admin.findUnique({
//             where: { id: adminId },
//             include: { tenant: true }
//         });

//         if (!admin || !admin.tenant) return res.status(404).json({ success: false, message: "Tenant configuration not found" });
//         const tenant = admin.tenant;
//         const internalId = items[0].id;
//         const orderType = items[0].type;
//         const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);

//         let paymentUrl = "";

//         if (gateway === 'STRIPE') {
//             const stripeClient = new Stripe(tenant.stripeSecretKey);
//             const session = await stripeClient.checkout.sessions.create({
//                 payment_method_types: ['card'],
//                 client_reference_id: String(internalId),
//                 metadata: { orderId: internalId, orderType, tenantId: tenant.id },
//                 line_items: items.map(item => ({
//                     price_data: { currency: 'usd', product_data: { name: item.name }, unit_amount: Math.round(item.price * 100) },
//                     quantity: item.quantity,
//                 })),
//                 mode: 'payment',
//                 customer_email: customerDetails.email,
//                 success_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&type=${orderType}&gateway=stripe`,
//                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
//             });
//             paymentUrl = session.url;
//         } 
//         else if (gateway === 'PAYPAL') {
//             const client = getPaypalClient(tenant);
//             const request = new paypal.orders.OrdersCreateRequest();
//             request.requestBody({
//                 intent: 'CAPTURE',
//                 purchase_units: [{
//                     reference_id: internalId,
//                     amount: { currency_code: 'USD', value: totalAmount },
//                     custom_id: JSON.stringify({ orderId: internalId, orderType, tenantId: tenant.id })
//                 }],
//                 application_context: {
//                     return_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&type=${orderType}&gateway=paypal`,
//                     cancel_url: `${process.env.FRONTEND_URL}/cancel`
//                 }
//             });
//             const response = await client.execute(request);
//             paymentUrl = response.result.links.find(link => link.rel === 'approve').href;
//         }

//         if (method === 'EMAIL') {
//             await sendMail(
//                 "order-payment-link", 
//                 {
//                     "%name%": customerDetails.name || "Customer",
//                     "%amount%": totalAmount,
//                     "%paymentUrl%": paymentUrl, 
//                     "%tenantName%": tenant.tenantName || "BHIVES"
//                 },
//                 customerDetails.email
//             );

//             return res.json({ success: true, message: `Payment link emailed via ${gateway}` });
//         }

//         return res.json({ success: true, url: paymentUrl });

//     } catch (error) {
//         console.error("❌ Checkout Error:", error);
//         res.status(500).json({ success: false, message: error.message });
//     }
// };
// // exports.createPayment = async (req, res) => {
// //     try {
// //         const { items, customerDetails, method, gateway } = req.body;
        
// //         // 1. Authenticated Admin & Tenant fetch karein
// //         const adminId = req.user.id;
// //         const admin = await prisma.admin.findUnique({
// //             where: { id: adminId },
// //             include: { tenant: true }
// //         });

// //         if (!admin || !admin.tenant) {
// //             return res.status(404).json({ success: false, message: "Merchant configuration not found." });
// //         }

// //         const tenant = admin.tenant;
// //         const internalId = items[0].id; // Primary Key (UUID) of Order
// //         const orderType = items[0].type; // 'STOCK' or 'CUSTOM'
// //         const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);

// //         // --- STRIPE GATEWAY LOGIC ---
// //         if (gateway === 'STRIPE') {
// //             if (!tenant.stripeSecretKey) {
// //                 return res.status(400).json({ success: false, message: "Stripe not configured for this tenant." });
// //             }

// //             const stripeClient = new Stripe(tenant.stripeSecretKey);
            
// //             const session = await stripeClient.checkout.sessions.create({
// //                 payment_method_types: ['card'],
// //                 client_reference_id: String(internalId),
// //                 metadata: {
// //                     orderId: String(internalId),
// //                     orderType: orderType,
// //                     tenantId: tenant.id
// //                 },
// //                 line_items: items.map(item => ({
// //                     price_data: {
// //                         currency: 'usd',
// //                         product_data: { name: item.name },
// //                         unit_amount: Math.round(item.price * 100), // Cents mein conversion
// //                     },
// //                     quantity: item.quantity,
// //                 })),
// //                 mode: 'payment',
// //                 customer_email: customerDetails.email,
// //                 success_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&type=${orderType}&gateway=stripe`,
// //                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
// //             });

// //             // Handle Email Method for Stripe
// //             if (method === 'EMAIL') {
// //                 await sendMail("order-payment-link", {
// //                     "%name%": customerDetails.name || "Customer",
// //                     "%amount%": totalAmount,
// //                     "%paymentUrl%": session.url,
// //                     "%tenantName%": tenant.tenantName || "Merchant"
// //                 }, customerDetails.email);

// //                 return res.json({ success: true, message: "Stripe link sent to email." });
// //             }

// //             return res.json({ success: true, url: session.url });
// //         }

// //         // --- PAYPAL GATEWAY LOGIC ---
// //         else if (gateway === 'PAYPAL') {
// //             if (!tenant.paypalClientId || !tenant.paypalSecretKey) {
// //                 return res.status(400).json({ success: false, message: "PayPal not configured for this tenant." });
// //             }

// //             const client = getPaypalClient(tenant);
// //             const request = new paypal.orders.OrdersCreateRequest();
            
// //             request.prefer("return=representation");
// //             request.requestBody({
// //                 intent: 'CAPTURE',
// //                 purchase_units: [{
// //                     reference_id: internalId, // Database ID
// //                     amount: {
// //                         currency_code: 'USD',
// //                         value: totalAmount
// //                     },
// //                     description: `Order ${internalId} - ${tenant.tenantName}`,
// //                     // Metadata for PayPal Webhook
// //                     custom_id: JSON.stringify({ 
// //                         orderId: internalId, 
// //                         orderType: orderType, 
// //                         tenantId: tenant.id 
// //                     })
// //                 }],
// //                 application_context: {
// //                     brand_name: tenant.tenantName,
// //                     landing_page: 'BILLING',
// //                     user_action: 'PAY_NOW',
// //                     return_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&type=${orderType}&gateway=paypal`,
// //                     cancel_url: `${process.env.FRONTEND_URL}/cancel`
// //                 }
// //             });

// //             const paypalOrder = await client.execute(request);
// //             const approvalUrl = paypalOrder.result.links.find(link => link.rel === 'approve').href;

// //             // Handle Email Method for PayPal
// //             if (method === 'EMAIL') {
// //                 await sendMail("order-payment-link", {
// //                     "%name%": customerDetails.name || "Customer",
// //                     "%amount%": totalAmount,
// //                     "%paymentUrl%": approvalUrl, // PayPal Approval Link
// //                     "%tenantName%": tenant.tenantName || "Merchant"
// //                 }, customerDetails.email);

// //                 return res.json({ success: true, message: "PayPal link sent to email." });
// //             }

// //             return res.json({ success: true, url: approvalUrl });
// //         }

// //         else {
// //             return res.status(400).json({ success: false, message: "Invalid payment gateway selected." });
// //         }

// //     } catch (error) {
// //         console.error("❌ createPayment Error:", error.message);
// //         res.status(500).json({ success: false, message: "Internal Server Error: " + error.message });
// //     }
// // };
// exports.capturePaypalOrder = async (req, res) => {
//     try {
//         const { orderId, paypalToken } = req.body; 

//         // 1. Admin/Tenant fetch karein keys ke liye
//         const admin = await prisma.admin.findFirst({
//             where: { id: req.user.id },
//             include: { tenant: true }
//         });

//         const tenant = admin.tenant;
//         const client = getPaypalClient(tenant);

//         // 2. Request Capture
//         const request = new paypal.orders.OrdersCaptureRequest(paypalToken);
//         request.requestBody({});

//         const capture = await client.execute(request);
        
//         // 3. Agar status COMPLETED hai toh DB update karein
//         if (capture.result.status === 'COMPLETED') {
//             const customData = JSON.parse(capture.result.purchase_units[0].custom_id);

//             await prisma.$transaction(async (tx) => {
//                 // Transaction entry
//                 await tx.transaction.create({
//                     data: {
//                         orderNumber: customData.orderId,
//                         orderType: customData.orderType,
//                         amount: capture.result.purchase_units[0].payments.captures[0].amount.value,
//                         gateway: "PAYPAL",
//                         status: 'PAID',
//                         tenantId: tenant.id
//                     }
//                 });

//                 // Status Update
//                 if (customData.orderType === 'CUSTOM') {
//                     await tx.customOrder.update({ where: { id: customData.orderId }, data: { paymentStatus: 'PAID' } });
//                 } else {
//                     await tx.stockOrder.update({ where: { id: customData.orderId }, data: { paymentStatus: 'PAID' } });
//                 }
//             });

//             return res.json({ success: true, message: "Payment successful" });
//         }
        
//         res.status(400).json({ success: false, message: "Payment failed" });

//     } catch (error) {
//         console.error("PayPal Capture Error:", error.message);
//         res.status(500).json({ success: false, message: error.message });
//     }
// };
// // exports.createPayment = async (req, res) => {
// //     try {
// //         const { items, customerDetails, gateway } = req.body;
// //         const tenant = await prisma.tenant.findFirst();

// //         // ALWAYS use the .id (UUID) for database lookups
// //         const internalId = items[0].id; 
// //         const orderType = items[0].type; 

// //         if (gateway === 'STRIPE') {
// //             const stripeClient = require('stripe')(tenant.stripeSecretKey);
            
// //             const session = await stripeClient.checkout.sessions.create({
// //                 payment_method_types: ['card'],
// //                 // Send the internal UUID here
// //                 client_reference_id: String(internalId), 
// //                 metadata: {
// //                     orderId: String(internalId), // Store ID in metadata too
// //                     orderType: orderType,
// //                     tenantId: tenant.id
// //                 },
// //                 line_items: items.map(item => ({
// //                     price_data: {
// //                         currency: 'usd',
// //                         product_data: { name: item.name },
// //                         unit_amount: Math.round(item.price * 100),
// //                     },
// //                     quantity: item.quantity,
// //                 })),
// //                 mode: 'payment',
// //                 customer_email: customerDetails.email,
// //                 success_url: `${process.env.FRONTEND_URL}/success?id=${internalId}`,
// //                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
// //             });

// //             return res.json({ success: true, url: session.url });
// //         }
// //     } catch (error) {
// //         res.status(500).json({ success: false, message: error.message });
// //     }
// // };
// // 2. HANDLE STRIPE WEBHOOK
// // exports.handleStripeWebhook = async (req, res) => {
// //     const sig = req.headers['stripe-signature'];
// //     let event;

// //     try {
// //         event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
// //     } catch (err) {
// //         return res.status(400).send(`Webhook Error: ${err.message}`);
// //     }

// //     if (event.type === 'checkout.session.completed') {
// //         const session = event.data.object;
        
// //         // This is the UUID we sent in createPayment
// //         const recordId = session.client_reference_id; 
// //         const orderType = session.metadata.orderType;

// //         try {
// //             await prisma.$transaction(async (tx) => {
// //                 // 1. Log Transaction
// //                 await tx.transaction.create({
// //                     data: {
// //                         orderNumber: recordId, // Logging the ID or fetch the real orderNumber if needed
// //                         orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
// //                         amount: session.amount_total / 100,
// //                         gateway: "STRIPE",
// //                         status: 'PAID',
// //                         tenantId: session.metadata.tenantId
// //                     }
// //                 });

// //                 // 2. Update Order using the ID (Primary Key)
// //                 if (orderType === 'CUSTOM') {
// //                     await tx.customOrder.update({
// //                         where: { id: recordId }, // Changed from orderNumber to id
// //                         data: { paymentStatus: 'PAID' }
// //                     });
// //                 } else {
// //                     await tx.stockOrder.update({
// //                         where: { id: recordId }, // Changed from orderNumber to id
// //                         data: { paymentStatus: 'PAID' }
// //                     });
// //                 }
// //             });

// //             console.log(`✅ Success: ${orderType} ID ${recordId} updated to PAID`);

// //         } catch (dbError) {
// //             console.error("❌ DB Update Error:", dbError.message);
// //             return res.status(500).send("Internal Server Error");
// //         }
// //     }
// //     res.json({ received: true });
// // };


// exports.handleStripeWebhook = async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     let event;
//     const stripePlatform = new Stripe(process.env.STRIPE_SECRET_KEY);

//     try {
//         event = stripePlatform.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//     } catch (err) {
//         return res.status(400).send(`Webhook Error: ${err.message}`);
//     }

//     if (event.type === 'checkout.session.completed') {
//         const session = event.data.object;
        
//         // 🛑 Dhyaan dein: Aapke log mein metadata.orderId hai, orderNumber nahi
//         const recordId = session.client_reference_id || session.metadata.orderId; 
//         const orderType = session.metadata.orderType;

//         console.log(`🔔 Webhook received for ${orderType} ID: ${recordId}`);

//         try {
//             await prisma.$transaction(async (tx) => {
//                 // 1. Transaction create karein
//                 await tx.transaction.create({
//                     data: {
//                         orderNumber: recordId, 
//                         orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                         amount: session.amount_total / 100,
//                         gateway: "STRIPE",
//                         status: 'PAID',
//                         tenantId: session.metadata.tenantId
//                     }
//                 });

//                 // 2. Order Table Update (ID se)
//                 if (orderType === 'CUSTOM') {
//                     await tx.customOrder.update({
//                         where: { id: recordId },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 } else {
//                     await tx.stockOrder.update({
//                         where: { id: recordId },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 }
//             });
//             console.log(`✅ Success: ${orderType} ID ${recordId} updated to PAID`);
//         } catch (dbError) {
//             console.error("❌ Webhook DB Update Error:", dbError.message);
//         }
//     }
//     res.json({ received: true });
// };
// exports.handlePaypalWebhook = async (req, res) => {
//     const paypalBody = req.body;
    
//     console.log("🔔 PayPal Webhook Received:", paypalBody.event_type);

//     if (paypalBody.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
//         const resource = paypalBody.resource;
//         const rawCustomId = resource.custom_id; // Metadata jo humne bheja tha

//         console.log("📦 Metadata received from PayPal:", rawCustomId);

//         if (!rawCustomId) {
//             console.error("❌ No custom_id found in PayPal resource");
//             return res.status(200).send("No metadata");
//         }

//         try {
//             const metadata = JSON.parse(rawCustomId);
//             const { orderId, orderType, tenantId } = metadata;

//             await prisma.$transaction(async (tx) => {
//                 const existingTrans = await tx.transaction.findFirst({
//                     where: { gatewayTransId: resource.id }
//                 });

//                 if (!existingTrans) {
//                     await tx.transaction.create({
//                         data: {
//                             orderNumber: String(orderId),
//                             orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                             amount: parseFloat(resource.amount.value),
//                             currency: resource.amount.currency_code,
//                             gateway: "PAYPAL",
//                             gatewayTransId: resource.id,
//                             status: 'PAID',
//                             tenantId: tenantId
//                         }
//                     });
//                 }

//                 if (orderType === 'CUSTOM') {
//                     await tx.customOrder.update({
//                         where: { id: orderId },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 } else {
//                     await tx.stockOrder.update({
//                         where: { id: orderId },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 }
//             });

//             console.log(`✅ Success: PayPal Webhook processed for Order ${orderId}`);
//         } catch (err) {
//             console.error("❌ Webhook DB Error:", err.message);
//         }
//     }

//     res.status(200).send("OK");
// };
// // exports.handlePaypalWebhook = async (req, res) => {
// //     console.log("🔔 PayPal Webhook Triggered!"); // Pehle ye check karein
// //      const paypalBody = req.body; // 'event' ki jagah 'paypalBody'
// //     console.log("Event Type:", paypalBody.event_type);

// //     if (paypalBody.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
// //         const resource = paypalBody.resource;
// //         const rawCustomId = resource.custom_id;
// //         try {
// //             const metadata = JSON.parse(rawCustomId);
// //             const { orderId, orderType, tenantId } = metadata;

// //             await prisma.$transaction(async (tx) => {
// //                 const existingTrans = await tx.transaction.findFirst({
// //                     where: { gatewayTransId: resource.id }
// //                 });
                
// //                 if (existingTrans) return;

// //                 // 2. Log in Transaction Table
// //                 await tx.transaction.create({
// //                     data: {
// //                         orderNumber: String(orderId),
// //                         orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
// //                         amount: parseFloat(resource.amount.value),
// //                         currency: resource.amount.currency_code,
// //                         gateway: "PAYPAL",
// //                         gatewayTransId: resource.id,
// //                         status: 'PAID',
// //                         tenantId: tenantId
// //                     }
// //                 });

// //                 // 3. Update Order Table
// //                 if (orderType === 'CUSTOM') {
// //                     await tx.customOrder.update({
// //                         where: { id: orderId },
// //                         data: { paymentStatus: 'PAID' }
// //                     });
// //                 } else {
// //                     await tx.stockOrder.update({
// //                         where: { id: orderId },
// //                         data: { paymentStatus: 'PAID' }
// //                     });
// //                 }
// //             });
// //             console.log(`✅ PayPal Webhook: Order ${orderId} marked as PAID`);
// //         } catch (err) {
// //             console.error("❌ PayPal Webhook Error:", err.message);
// //         }
// //     }

// //     res.status(200).send("Webhook Received");
// // };
// // controllers/paymentController.js
// exports.getOrderStatus = async (req, res) => {
//     try {
//         const { id } = req.query; 
//         let order = await prisma.stockOrder.findUnique({
//             where: { id: id },
//             select: { paymentStatus: true }
//         });

//         if (!order) {
//             order = await prisma.customOrder.findUnique({
//                 where: { id: id },
//                 select: { paymentStatus: true }
//             });
//         }

//         if (!order) {
//             return res.status(404).json({ message: "Order not found in any table" });
//         }

//         res.json({ status: order.paymentStatus }); // 'PAID' or 'PENDING'
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };





// // exports.createPayment = async (req, res) => {
// //     try {
// //         const { items, customerDetails, gateway } = req.body;
// //         const tenant = await prisma.tenant.findFirst();
// //         const finalOrderNumber = items[0].orderNumber || items[0].id; 
// //         const orderType = items[0].type; 

// //         console.log("📤 Sending Order to Stripe:", finalOrderNumber);

// //         if (gateway === 'STRIPE') {
// //             const stripeClient = require('stripe')(tenant.stripeSecretKey);
            
// //             const session = await stripeClient.checkout.sessions.create({
// //                 payment_method_types: ['card'],
// //                 client_reference_id: String(finalOrderNumber), 
// //                 metadata: {
// //                     orderNumber: String(finalOrderNumber), 
// //                     orderType: orderType,
// //                     tenantId: tenant.id
// //                 },
// //                 line_items: items.map(item => ({
// //                     price_data: {
// //                         currency: 'usd',
// //                         product_data: { name: item.name },
// //                         unit_amount: Math.round(item.price * 100),
// //                     },
// //                     quantity: item.quantity,
// //                 })),
// //                 mode: 'payment',
// //                 customer_email: customerDetails.email,
// //                 success_url: `${process.env.FRONTEND_URL}/success?id=${finalOrderNumber}`,
// //                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
// //             });

// //             return res.json({ success: true, url: session.url });
// //         }
// //     } catch (error) {
// //         res.status(500).json({ success: false, message: error.message });
// //     }
// // };
// // // exports.createPayment = async (req, res) => {
// // //     try {
// // //         // tenantId should come from the authenticated user for security
// // //         const adminId = req.user.id;
// // //         const admin = await prisma.admin.findUnique({
// // //             where: { id: adminId },
// // //             include: { tenant: true }
// // //         });
// // //         console.log('admin', admin)
// // //         if (!admin || !admin.tenant) {
// // //             return res.status(404).json({ success: false, message: "Merchant settings not found" });
// // //         }

// // //         const { items, customerDetails, method, gateway } = req.body;
// // //         const tenant = admin.tenant;
// // //         const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

// // //         let paymentUrl = "";
// // //         let orderId = `ORD-${Date.now()}`; // Generate a temporary reference

// // //         // --- STRIPE LOGIC ---
// // //         if (gateway === 'STRIPE') {
// // //             if (!tenant.stripeSecretKey) throw new Error("Stripe not configured.");
// // //             const stripeClient = stripe(tenant.stripeSecretKey);

// // //             const session = await stripeClient.checkout.sessions.create({
// // //                 payment_method_types: ['card'],
// // //                 client_reference_id: orderId,
// // //                 metadata: {
// // //                     orderType: items.some(i => i.type === 'CUSTOM') ? 'CUSTOM' : 'STOCK',
// // //                     tenantId: tenant.id
// // //                 },
// // //                 line_items: items.map(item => ({
// // //                     price_data: {
// // //                         currency: 'usd',
// // //                         product_data: {
// // //                             name: item.name,
// // //                             description: item.type === 'CUSTOM' ? `Custom Order: ${item.orderNumber}` : 'Stock Product'
// // //                         },
// // //                         unit_amount: Math.round(item.price * 100),
// // //                     },
// // //                     quantity: item.quantity,
// // //                 })),
// // //                 mode: 'payment',
// // //                 customer_email: customerDetails.email,
// // //                 client_reference_id: orderId,
// // //                 success_url: `${process.env.FRONTEND_URL}/success?id=${orderId}`,
// // //                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
// // //             });
// // //             paymentUrl = session.url;
// // //         }

// // //         // --- PAYPAL LOGIC ---
// // //         else if (gateway === 'PAYPAL') {
// // //             if (!tenant.paypalClientId || !tenant.paypalSecretKey) throw new Error("PayPal not configured.");

// // //             const environment = new paypal.core.SandboxEnvironment(tenant.paypalClientId, tenant.paypalSecretKey);
// // //             const client = new paypal.core.PayPalHttpClient(environment);
// // //             const request = new paypal.orders.OrdersCreateRequest();

// // //             request.requestBody({
// // //                 intent: 'CAPTURE',
// // //                 purchase_units: [{
// // //                     reference_id: orderId,
// // //                     amount: { currency_code: 'USD', value: totalAmount.toFixed(2) },
// // //                     description: `Order for ${customerDetails.name}`
// // //                 }],
// // //                 application_context: {
// // //                     return_url: `${process.env.FRONTEND_URL}/success`,
// // //                     cancel_url: `${process.env.FRONTEND_URL}/cancel`
// // //                 }
// // //             });

// // //             const order = await client.execute(request);
// // //             paymentUrl = order.result.links.find(link => link.rel === 'approve').href;
// // //         }

// // //         // --- HANDLING METHOD ---
// // //         if (method === 'NOW') {
// // //             // Direct POS response
// // //             return res.json({ success: true, url: paymentUrl });
// // //         }
// // //         else if (method === 'EMAIL') {
// // //             const transporter = nodemailer.createTransport({
// // //                 service: 'gmail',
// // //                 auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD }
// // //             });

// // //             await transporter.sendMail({
// // //                 from: `"${tenant.tenantName}" <${process.env.SMTP_EMAIL}>`,
// // //                 to: customerDetails.email,
// // //                 subject: `Complete your purchase at ${tenant.tenantName}`,
// // //                 html: `
// // //                     <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
// // //                         <h2 style="color: #4f46e5;">Order Ready</h2>
// // //                         <p>Hi ${customerDetails.name},</p>
// // //                         <p>Your order for <strong>$${totalAmount.toFixed(2)}</strong> is ready for payment.</p>
// // //                         <div style="margin: 30px 0;">
// // //                             <a href="${paymentUrl}" style="background: #4f46e5; color: white; padding: 15px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">
// // //                                 Pay Now with ${gateway}
// // //                             </a>
// // //                         </div>
// // //                         <p style="font-size: 12px; color: #666;">If the button doesn't work, copy this link: ${paymentUrl}</p>
// // //                     </div>
// // //                 `
// // //             });
// // //             return res.json({ success: true, message: "Email Sent" });
// // //         }

// // //     } catch (error) {
// // //         res.status(500).json({ success: false, message: error.message });
// // //     }
// // // };

// // // controllers/paymentController.js
// // // controllers/paymentController.js
// // exports.handleStripeWebhook = async (req, res) => {
// //     const sig = req.headers['stripe-signature'];
// //     let event;

// //     try {
// //         event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
// //     } catch (err) {
// //         return res.status(400).send(`Webhook Error: ${err.message}`);
// //     }

// //     if (event.type === 'checkout.session.completed') {
// //         const session = event.data.object;
// //         const orderNumber = session.client_reference_id || session.metadata.orderNumber;
// //         const orderType = session.metadata.orderType;

// //         try {
// //             // 1. Transaction Table (History ke liye)
// //             await prisma.transaction.create({
// //                 data: {
// //                     orderNumber: String(orderNumber),
// //                     orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
// //                     amount: session.amount_total / 100,
// //                     gateway: "STRIPE",
// //                     status: 'PAID', // Enum value
// //                     tenantId: session.metadata.tenantId
// //                 }
// //             });

// //             // 2. Original Tables mein sirf 'paymentStatus' update karein
// //             // Isse production wala 'status' (Pending/Scheduled) disturb nahi hoga
// //             if (orderType === 'CUSTOM') {
// //                 await prisma.customOrder.update({
// //                     where: { orderNumber: String(orderNumber) },
// //                     data: { paymentStatus: 'PAID' } // Naya column update ho raha hai
// //                 });
// //             } else {
// //                 await prisma.stockOrder.update({
// //                     where: { orderNumber: String(orderNumber) },
// //                     data: { paymentStatus: 'PAID' } // Naya column update ho raha hai
// //                 });
// //             }

// //             console.log(`✅ Success: ${orderType} Order ${orderNumber} paymentStatus set to PAID`);

// //         } catch (dbError) {
// //             console.error("❌ DB Update Error:", dbError.message);
// //         }
// //     }
// //     res.json({ received: true });
// // };


// // controllers/paymentController.js

// // exports.handlePaypalWebhook = async (req, res) => {
// //     const event = req.body;

// //     if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
// //         const resource = event.resource;
// //         const rawCustomId = resource.custom_id;
        
// //         console.log("📦 Received custom_id:", rawCustomId);

// //         let orderId = rawCustomId;
// //         let orderType = null;
// //         let tenantId = 't1';

// //         // 1. Try to Parse JSON
// //         try {
// //             const parsed = JSON.parse(rawCustomId);
// //             orderId = parsed.orderId;
// //             orderType = parsed.orderType;
// //             tenantId = parsed.tenantId;
// //         } catch (e) {
// //             console.log("ℹ️ custom_id is a simple string, using as ID.");
// //             orderId = rawCustomId; // UUID fallback
// //         }

// //         try {
// //             await prisma.$transaction(async (tx) => {
// //                 // 2. Entry in Transaction Table
// //                 await tx.transaction.create({
// //                     data: {
// //                         orderNumber: String(orderId),
// //                         orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
// //                         amount: resource.amount.value,
// //                         currency: resource.amount.currency_code,
// //                         gateway: "PAYPAL",
// //                         gatewayTransId: resource.id,
// //                         status: 'PAID',
// //                         tenantId: tenantId
// //                     }
// //                 });

// //                 // 3. SMART UPDATE: Dhoondo record kahan hai
// //                 // Pehle StockOrder try karein
// //                 const stockUpdate = await tx.stockOrder.updateMany({
// //                     where: { id: orderId },
// //                     data: { paymentStatus: 'PAID' }
// //                 });

// //                 // Agar StockOrder mein 0 rows update hui, toh CustomOrder try karein
// //                 if (stockUpdate.count === 0) {
// //                     const customUpdate = await tx.customOrder.updateMany({
// //                         where: { id: orderId },
// //                         data: { paymentStatus: 'PAID' }
// //                     });
                    
// //                     if (customUpdate.count > 0) {
// //                         console.log(`✅ Success: Custom Order ${orderId} updated.`);
// //                     } else {
// //                         console.error(`❌ Error: Order ID ${orderId} not found in any table.`);
// //                     }
// //                 } else {
// //                     console.log(`✅ Success: Stock Order ${orderId} updated.`);
// //                 }
// //             });
// //         } catch (dbError) {
// //             console.error("❌ Webhook DB Transaction Error:", dbError.message);
// //         }
// //     }

// //     res.status(200).send("OK");
// // };













const prisma = require("../config/prisma");
const paypal = require('@paypal/checkout-server-sdk');
const Stripe = require('stripe');
const { sendMail } = require("../functions/mailer");

// --- HELPER: PayPal Client ---
function getPaypalClient(tenant) {
    const environment = process.env.NODE_ENV === 'production'
        ? new paypal.core.LiveEnvironment(tenant.paypalClientId, tenant.paypalSecretKey)
        : new paypal.core.SandboxEnvironment(tenant.paypalClientId, tenant.paypalSecretKey);
    return new paypal.core.PayPalHttpClient(environment);
}

/**
 * 1. GET CATALOG & READY TO SELL
 * Catalog: BOM Products (ProductTree)
 * Ready to Sell: Unpaid Custom Orders
 */
exports.getOrderCatalogData = async (req, res) => {
    try {
        const { searchQuery } = req.query;
        const userId = req.user?.id;

        const catalogProducts = await prisma.partNumber.findMany({
            where: {
                isDeleted: false,
                components: { some: {} }, 
                OR: searchQuery ? [
                    { partNumber: { contains: searchQuery } },
                    { partDescription: { contains: searchQuery } }
                ] : undefined
            },
            select: { part_id: true, partNumber: true, partDescription: true, cost: true }
        });

        const readyCustomOrders = await prisma.customOrder.findMany({
            where: { isDeleted: false, paymentStatus: "PENDING" },
            orderBy: { createdAt: 'desc' }
        });

        const admin = await prisma.admin.findUnique({ where: { id: userId }, include: { tenant: true } });
        const tenant = admin?.tenant || await prisma.tenant.findFirst();

        return res.json({
            success: true,
            data: {
                catalogProducts: catalogProducts.map(p => ({
                    id: p.part_id,
                    name: p.partNumber,
                    description: p.partDescription,
                    price: parseFloat(p.cost) || 0,
                    type: 'BOM_PRODUCT'
                })),
                readyCustomOrders: readyCustomOrders.map(co => ({
                    id: co.id,
                    orderNumber: co.orderNumber,
                    customerName: co.customerName,
                    customerEmail: co.customerEmail,
                    totalAmount: parseFloat(co.totalCost),
                    type: 'CUSTOM'
                })),
                settings: { activeGateway: tenant?.activeGateway || "STRIPE" }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 2. CREATE PAYMENT
 */
// exports.createPayment = async (req, res) => {
//     try {
//         const { items, customerDetails, method, gateway } = req.body;
//         const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, include: { tenant: true } });
//         const tenant = admin?.tenant || await prisma.tenant.findFirst();

//         const internalId = String(items[0].id); // ID like '560195'
//         const orderType = items[0].type;
//         const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);

//         let paymentUrl = "";

//         if (gateway === 'STRIPE') {
//             const stripeClient = new Stripe(tenant.stripeSecretKey);
//             const session = await stripeClient.checkout.sessions.create({
//                 payment_method_types: ['card'],
//                 client_reference_id: internalId,
//                 metadata: { orderId: internalId, orderType, tenantId: tenant.id },
//                 line_items: items.map(item => ({
//                     price_data: { currency: 'usd', product_data: { name: item.name }, unit_amount: Math.round(item.price * 100) },
//                     quantity: item.quantity,
//                 })),
//                 mode: 'payment',
//                 customer_email: customerDetails.email,
//                 success_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&gateway=stripe`,
//                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
//             });
//             paymentUrl = session.url;
//         } 
//         else if (gateway === 'PAYPAL') {
//             const client = getPaypalClient(tenant);
//             const request = new paypal.orders.OrdersCreateRequest();
//             request.requestBody({
//                 intent: 'CAPTURE',
//                 purchase_units: [{
//                     reference_id: internalId,
//                     amount: { currency_code: 'USD', value: totalAmount },
//                     custom_id: JSON.stringify({ orderId: internalId, orderType, tenantId: tenant.id })
//                 }],
//                 application_context: {
//                     return_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&gateway=paypal`,
//                     cancel_url: `${process.env.FRONTEND_URL}/cancel`
//                 }
//             });
//             const response = await client.execute(request);
//             paymentUrl = response.result.links.find(link => link.rel === 'approve').href;
//         }

//         if (method === 'EMAIL') {
//             await sendMail("order-payment-link", { "%name%": customerDetails.name, "%amount%": totalAmount, "%paymentUrl%": paymentUrl, "%tenantName%": tenant.tenantName }, customerDetails.email);
//             return res.json({ success: true, message: "Link Emailed" });
//         }
//         return res.json({ success: true, url: paymentUrl });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };


// exports.createPayment = async (req, res) => {
//     try {
//         const { items, customerDetails, method, gateway } = req.body;
//         const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, include: { tenant: true } });
//         const tenant = admin?.tenant || await prisma.tenant.findFirst();

//         const internalId = String(items[0].id); 
//         const orderType = items[0].type;
//         const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);
        
//         // Metadata object (Sabse Important)
//         const metadataObj = { orderId: internalId, orderType, tenantId: tenant.id };

//         let paymentUrl = "";

//         if (gateway === 'STRIPE') {
//             const stripeClient = new Stripe(tenant.stripeSecretKey);
//             const session = await stripeClient.checkout.sessions.create({
//                 payment_method_types: ['card'],
//                 client_reference_id: internalId,
//                 metadata: metadataObj, // Stripe Metadata
//                 line_items: items.map(item => ({
//                     price_data: { currency: 'usd', product_data: { name: item.name }, unit_amount: Math.round(item.price * 100) },
//                     quantity: item.quantity,
//                 })),
//                 mode: 'payment',
//                 customer_email: customerDetails.email,
//                 success_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&gateway=stripe`,
//                 cancel_url: `${process.env.FRONTEND_URL}/cancel`,
//             });
//             paymentUrl = session.url;
//         } 
//         else if (gateway === 'PAYPAL') {
//             const client = getPaypalClient(tenant);
//             const request = new paypal.orders.OrdersCreateRequest();
//             request.requestBody({
//                 intent: 'CAPTURE',
//                 purchase_units: [{
//                     reference_id: internalId,
//                     amount: { currency_code: 'USD', value: totalAmount },
//                     custom_id: JSON.stringify(metadataObj) // PayPal Metadata
//                 }],
//                 application_context: {
//                     return_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&gateway=paypal`,
//                     cancel_url: `${process.env.FRONTEND_URL}/cancel`
//                 }
//             });
//             const response = await client.execute(request);
//             paymentUrl = response.result.links.find(link => link.rel === 'approve').href;
//         }

//         if (method === 'EMAIL') {
//             await sendMail("order-payment-link", { 
//                 "%name%": customerDetails.name || "Customer", 
//                 "%amount%": totalAmount, 
//                 "%paymentUrl%": paymentUrl, 
//                 "%tenantName%": tenant.tenantName 
//             }, customerDetails.email);
//             return res.json({ success: true, message: "Payment link sent to email." });
//         }
//         return res.json({ success: true, url: paymentUrl });
//     } catch (error) {
//         res.status(500).json({ success: false, message: error.message });
//     }
// };
exports.createPayment = async (req, res) => {
    try {
        const { items, customerDetails, method, gateway } = req.body;
        const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, include: { tenant: true } });
        const tenant = admin?.tenant || await prisma.tenant.findFirst();

        const internalId = String(items[0].id); 
        const orderType = items[0].type;
        const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);
        
        // Metadata mein email add kiya 👇
        const metadataObj = { 
            orderId: internalId, 
            orderType, 
            tenantId: tenant.id,
            customerEmail: customerDetails.email 
        };

        let paymentUrl = "";

        if (gateway === 'STRIPE') {
            const stripeClient = new Stripe(tenant.stripeSecretKey);
            const session = await stripeClient.checkout.sessions.create({
                payment_method_types: ['card'],
                client_reference_id: internalId,
                metadata: metadataObj,
                line_items: items.map(item => ({
                    price_data: { currency: 'usd', product_data: { name: item.name }, unit_amount: Math.round(item.price * 100) },
                    quantity: item.quantity,
                })),
                mode: 'payment',
                customer_email: customerDetails.email,
                success_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&gateway=stripe`,
                cancel_url: `${process.env.FRONTEND_URL}/cancel`,
            });
            paymentUrl = session.url;
        } 
        else if (gateway === 'PAYPAL') {
            const client = getPaypalClient(tenant);
            const request = new paypal.orders.OrdersCreateRequest();
            request.requestBody({
                intent: 'CAPTURE',
                purchase_units: [{
                    reference_id: internalId,
                    amount: { currency_code: 'USD', value: totalAmount },
                    custom_id: JSON.stringify(metadataObj)
                }],
                application_context: {
                    return_url: `${process.env.FRONTEND_URL}/success?id=${internalId}&gateway=paypal`,
                    cancel_url: `${process.env.FRONTEND_URL}/cancel`
                }
            });
            const response = await client.execute(request);
            paymentUrl = response.result.links.find(link => link.rel === 'approve').href;
        }

        // if (method === 'EMAIL') {
        //     await sendMail("order-payment-link", { 
        //         "%name%": customerDetails.name || "Customer", 
        //         "%amount%": totalAmount, 
        //         "%paymentUrl%": paymentUrl, 
        //         "%tenantName%": tenant.tenantName 
        //     }, customerDetails.email);
        //     return res.json({ success: true, message: "Payment link sent to email." });
        // }
// --- YEH BHI NAYA HAI ---
// --- YEH NAYA ADD KIYA GAYA HAI ---
const itemsRows = items.map(item => `
    <tr>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; color: #4a5568;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; color: #4a5568; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; color: #4a5568; text-align: right;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #edf2f7; font-size: 14px; color: #1a202c; text-align: right; font-weight: bold;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
`).join('');
const itemsTable = `
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
            <tr style="background-color: #f7fafc;">
                <th style="text-align: left; padding: 10px; border-bottom: 2px solid #e2e8f0;">Item</th>
                <th style="text-align: center; padding: 10px; border-bottom: 2px solid #e2e8f0;">Qty</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e2e8f0;">Price</th>
                <th style="text-align: right; padding: 10px; border-bottom: 2px solid #e2e8f0;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${itemsRows}
        </tbody>
    </table>
`;
        if (method === 'EMAIL') {
    await sendMail("order-payment-link", { 
        "%name%": customerDetails.name || "Customer", 
        "%amount%": totalAmount, 
        "%paymentUrl%": paymentUrl, 
        "%tenantName%": tenant.tenantName,
        "%items%": itemsTable // <--- YEH CHANGE SABSE IMPORTANT HAI
    }, customerDetails.email);
    
    return res.json({ success: true, message: "Payment link sent to email." });
}
        return res.json({ success: true, url: paymentUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
/**
 * 3. GET ORDER STATUS (The Fix for 404)
 */
// exports.getOrderStatus = async (req, res) => {
//     try {
//         const { id } = req.query;

//         // 1. Sabse pehle Transaction table mein check karein (Sabse accurate)
//         const transaction = await prisma.transaction.findFirst({
//             where: {
//                 OR: [
//                     { orderNumber: String(id) },
//                     { gatewayTransId: String(id) }
//                 ],
//                 status: 'PAID'
//             }
//         });

//         if (transaction) {
//             return res.json({ status: 'PAID' });
//         }

//         // 2. Agar Transaction nahi mila toh CustomOrder table check karein
//         const customOrder = await prisma.customOrder.findFirst({
//             where: {
//                 OR: [
//                     { id: String(id) },
//                     { orderNumber: String(id) }
//                 ]
//             },
//             select: { paymentStatus: true }
//         });

//         if (customOrder) {
//             return res.json({ status: customOrder.paymentStatus });
//         }

//         // 3. Agar kahin nahi mila
//         return res.status(404).json({ message: "Order or Transaction not found" });

//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };



// exports.getOrderStatus = async (req, res) => {
//     try {
//         const { id } = req.query;

//         // 1. Transaction check karein (PAID orders ke liye)
//         const transaction = await prisma.transaction.findFirst({
//             where: {
//                 OR: [
//                     { orderNumber: { contains: String(id) } }, // Partial match ke liye contains use karein
//                     { gatewayTransId: String(id) }
//                 ],
//                 status: 'PAID'
//             }
//         });

//         if (transaction) return res.json({ status: 'PAID' });

//         // 2. Custom Order check karein (Unpaid/Pending ke liye)
//         const customOrder = await prisma.customOrder.findFirst({
//             where: {
//                 OR: [
//                     { id: { contains: String(id) } },
//                     { orderNumber: { contains: String(id) } }
//                 ]
//             },
//             select: { paymentStatus: true }
//         });

//         if (customOrder) return res.json({ status: customOrder.paymentStatus });

//         return res.status(404).json({ message: "Order or Transaction not found" });
//     } catch (error) {
//         res.status(500).json({ error: error.message });
//     }
// };
exports.getOrderStatus = async (req, res) => {
    try {
        const { id } = req.query;

        // Transaction table mein dhundein (Partial ID search)
        const transaction = await prisma.transaction.findFirst({
            where: {
                OR: [
                    { orderNumber: { contains: String(id) } }, 
                    { gatewayTransId: String(id) }
                ],
                status: 'PAID'
            }
        });

        if (transaction) return res.json({ status: 'PAID' });

        // Custom Order table mein dhundein
        const customOrder = await prisma.customOrder.findFirst({
            where: {
                OR: [
                    { id: { contains: String(id) } },
                    { orderNumber: { contains: String(id) } }
                ]
            },
            select: { paymentStatus: true }
        });

        if (customOrder) return res.json({ status: customOrder.paymentStatus });

        return res.status(404).json({ message: "Order or Transaction not found" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
/**
 * 4. WEBHOOKS & CAPTURE
 */
// exports.handleStripeWebhook = async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     const stripePlatform = new Stripe(process.env.STRIPE_SECRET_KEY);
//     let event;

//     try {
//         event = stripePlatform.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//     } catch (err) { return res.status(400).send(err.message); }

//     if (event.type === 'checkout.session.completed') {
//         const session = event.data.object;
//         const orderId = session.client_reference_id;
//         const orderType = session.metadata.orderType;

//         try {
//             await prisma.$transaction(async (tx) => {
//                 // Hamesha Transaction log karein
//                 await tx.transaction.create({
//                     data: {
//                         orderNumber: String(orderId),
//                         orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                         amount: session.amount_total / 100,
//                         gateway: "STRIPE",
//                         status: 'PAID',
//                         tenantId: session.metadata.tenantId
//                     }
//                 });

//                 // Sirf Custom Order ho toh table update karein
//                 if (orderType === 'CUSTOM') {
//                     await tx.customOrder.updateMany({
//                         where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 }
//             });
//         } catch (e) { console.error("Webhook Error", e.message); }
//     }
//     res.json({ received: true });
// };
// exports.handleStripeWebhook = async (req, res) => {
//     const sig = req.headers['stripe-signature'];
//     const stripePlatform = new Stripe(process.env.STRIPE_SECRET_KEY);
//     let event;

//     try {
//         event = stripePlatform.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
//     } catch (err) { return res.status(400).send(err.message); }

//     if (event.type === 'checkout.session.completed') {
//         const session = event.data.object;
//         const orderId = session.client_reference_id;
//         const orderType = session.metadata.orderType;

//         try {
//             await prisma.$transaction(async (tx) => {
//                 await tx.transaction.create({
//                     data: {
//                         orderNumber: String(orderId),
//                         orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                         amount: session.amount_total / 100,
//                         gateway: "STRIPE",
//                         status: 'PAID',
//                         tenantId: session.metadata.tenantId
//                     }
//                 });

//                 if (orderType === 'CUSTOM') {
//                     await tx.customOrder.updateMany({
//                         where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 }
//             });
//         } catch (e) { console.error("Stripe Webhook Error", e.message); }
//     }
//     res.json({ received: true });
// };
exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripePlatform = new Stripe(process.env.STRIPE_SECRET_KEY);
    let event;

    try {
        event = stripePlatform.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) { return res.status(400).send(err.message); }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        // Metadata aur Session se details nikalna
        const orderId = session.client_reference_id || session.metadata?.orderId;
        const orderType = session.metadata?.orderType;
        const tenantId = session.metadata?.tenantId;

        try {
            await prisma.$transaction(async (tx) => {
                // Transaction Create karein saari fields ke saath
                await tx.transaction.create({
                    data: {
                        orderNumber: String(orderId),
                        orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
                        amount: session.amount_total / 100,
                        currency: session.currency?.toUpperCase() || "USD", // 👈 Added
                        gateway: "STRIPE",
                        gatewayOrderId: session.id, // 👈 Added (Stripe Session ID)
                        gatewayTransId: session.payment_intent, // 👈 Added (Payment Intent ID)
                        customerEmail: session.customer_details?.email || session.metadata?.customerEmail || null, // 👈 Added
                        status: 'PAID',
                        tenantId: tenantId
                    }
                });

                // Custom Order status update
                if (orderType === 'CUSTOM') {
                    await tx.customOrder.updateMany({
                        where: { OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }] },
                        data: { paymentStatus: 'PAID' }
                    });
                }
            });
            console.log(`✅ Stripe Success: Order ${orderId} processed with all fields.`);
        } catch (e) { 
            console.error("❌ Stripe Webhook DB Error:", e.message); 
        }
    }
    res.json({ received: true });
};





// exports.capturePaypalOrder = async (req, res) => {
//     try {
//         const { paypalToken } = req.body;
//         const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, include: { tenant: true } });
//         const tenant = admin?.tenant || await prisma.tenant.findFirst();
//         const client = getPaypalClient(tenant);

//         const request = new paypal.orders.OrdersCaptureRequest(paypalToken);
//         const capture = await client.execute(request);

//         if (capture.result.status === 'COMPLETED') {
//             const metadata = JSON.parse(capture.result.purchase_units[0].custom_id);
//             const { orderId, orderType } = metadata;

//             await prisma.$transaction(async (tx) => {
//                 await tx.transaction.create({
//                     data: {
//                         orderNumber: String(orderId),
//                         orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                         amount: capture.result.purchase_units[0].payments.captures[0].amount.value,
//                         gateway: "PAYPAL",
//                         status: 'PAID',
//                         tenantId: tenant.id
//                     }
//                 });

//                 if (orderType === 'CUSTOM') {
//                     await tx.customOrder.updateMany({
//                         where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 }
//             });
//             return res.json({ success: true });
//         }
//         res.status(400).json({ success: false });
//     } catch (e) { res.status(500).json({ message: e.message }); }
// };

// exports.capturePaypalOrder = async (req, res) => {
//     try {
//         const { paypalToken } = req.body;
        
//         // 1. Tenant/Admin fetch karein keys ke liye
//         const admin = await prisma.admin.findUnique({ 
//             where: { id: req.user.id }, 
//             include: { tenant: true } 
//         });
//         const tenant = admin?.tenant || await prisma.tenant.findFirst();
//         const client = getPaypalClient(tenant);

//         // 2. PayPal Capture Request taiyar karein
//         const request = new paypal.orders.OrdersCaptureRequest(paypalToken);
        
//         try {
//             const capture = await client.execute(request);

//             if (capture.result.status === 'COMPLETED') {
//                 const purchaseUnit = capture.result.purchase_units[0];
                
//                 // 🛑 FIXED: Pehle check karein ki custom_id exist karta hai ya nahi
//                 const rawMetadata = purchaseUnit.custom_id;
//                 let metadata = {};

//                 if (rawMetadata && rawMetadata !== "undefined") {
//                     try {
//                         metadata = JSON.parse(rawMetadata);
//                     } catch (e) {
//                         console.error("Metadata parsing failed, using raw string.");
//                         metadata = { orderId: rawMetadata }; // Fallback agar JSON nahi hai
//                     }
//                 }

//                 const orderId = metadata.orderId || purchaseUnit.reference_id;
//                 const orderType = metadata.orderType || "STOCK";

//                 await prisma.$transaction(async (tx) => {
//                     // Check duplicate transaction
//                     const captureId = purchaseUnit.payments.captures[0].id;
//                     const existing = await tx.transaction.findFirst({
//                         where: { gatewayTransId: captureId }
//                     });

//                     if (!existing) {
//                         await tx.transaction.create({
//                             data: {
//                                 orderNumber: String(orderId),
//                                 orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                                 amount: purchaseUnit.payments.captures[0].amount.value,
//                                 gateway: "PAYPAL",
//                                 gatewayTransId: captureId,
//                                 status: 'PAID',
//                                 tenantId: tenant.id
//                             }
//                         });

//                         // Sirf Custom Order table update karein
//                         if (orderType === 'CUSTOM') {
//                             await tx.customOrder.updateMany({
//                                 where: { OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }] },
//                                 data: { paymentStatus: 'PAID' }
//                             });
//                         }
//                     }
//                 });
//                 return res.json({ success: true });
//             }
//         } catch (paypalError) {
//             // Error string check karein bina JSON parse kiye
//             const msg = paypalError.message || "";
//             if (msg.includes("ORDER_ALREADY_CAPTURED")) {
//                 console.log("ℹ️ Order already captured, skipping.");
//                 return res.json({ success: true, message: "Already processed" });
//             }
//             throw paypalError;
//         }

//         res.status(400).json({ success: false, message: "Capture failed" });
//     } catch (e) { 
//         console.error("Capture Logic Error:", e.message);
//         res.status(500).json({ success: false, message: e.message }); 
//     }
// };
/**
 * Helper to handle database updates for both PayPal Capture and Webhooks
 */
// async function processOrderDBUpdate(captureResult, tenantId, gateway) {
//     const purchaseUnit = captureResult.purchase_units[0];
//     const rawMetadata = purchaseUnit.custom_id;
//     let metadata = {};

//     try {
//         metadata = JSON.parse(rawMetadata);
//     } catch (e) {
//         console.error("Failed to parse PayPal metadata JSON:", e.message);
//         // Fallback: if it's not JSON, assume the raw string is the orderId
//         metadata = { orderId: rawMetadata, orderType: 'STOCK' };
//     }

//     const { orderId, orderType, customerEmail } = metadata; // 👈 email yahan se nikalenge
//     const captureId = purchaseUnit.payments.captures[0].id;
//     const amount = purchaseUnit.payments.captures[0].amount.value;

//     // return await prisma.$transaction(async (tx) => {
//     //     // 1. Idempotency Check: Prevent duplicate transactions
//     //     const existing = await tx.transaction.findFirst({
//     //         where: { gatewayTransId: captureId }
//     //     });

//     //     if (existing) return existing;

//         // 2. Create Transaction Record
      

//     return await prisma.$transaction(async (tx) => {
//         const existing = await tx.transaction.findFirst({ where: { gatewayTransId: captureId } });
//         if (existing) return existing;

//         return await tx.transaction.create({
//             data: {
//                 orderNumber: String(orderId),
//                 orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                 amount: parseFloat(amount),
//                 gateway: gateway,
//                 gatewayTransId: captureId, // Capture ID (e.g. 44L66...)
//                 gatewayOrderId: paypalToken || captureResult.id, // 👈 PayPal Order ID yahan save hoga
//                 customerEmail: customerEmail || null, // 👈 Email yahan save hoga
//                 status: 'PAID',
//                 tenantId: tenantId
//             }
//         });
//         // 3. Update Custom Order Status (if applicable)
//         if (orderType === 'CUSTOM') {
//             await tx.customOrder.updateMany({
//                 where: { 
//                     OR: [
//                         { id: String(orderId) }, 
//                         { orderNumber: String(orderId) }
//                     ] 
//                 },
//                 data: { paymentStatus: 'PAID' }
//             });
//         }

//         return transaction;
//     });
// }

// async function processOrderDBUpdate(captureResult, tenantId, gateway) {
//     const purchaseUnit = captureResult.purchase_units[0];
//     const rawMetadata = purchaseUnit.custom_id;
//     let metadata = {};

//     try {
//         metadata = JSON.parse(rawMetadata);
//     } catch (e) {
//         metadata = { orderId: purchaseUnit.reference_id, orderType: 'STOCK' };
//     }

//     const { orderId, orderType, customerEmail } = metadata;
//     const captureId = purchaseUnit.payments.captures[0].id; // Transaction ID
//     const amount = purchaseUnit.payments.captures[0].amount.value;

//     return await prisma.$transaction(async (tx) => {
//         // Idempotency check
//         const existing = await tx.transaction.findFirst({ where: { gatewayTransId: captureId } });
//         if (existing) return existing;

//         const transaction = await tx.transaction.create({
//             data: {
//                 orderNumber: String(orderId),
//                 orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                 amount: parseFloat(amount),
//                 currency: purchaseUnit.amount.currency_code || "USD",
//                 gateway: gateway,
//                 gatewayTransId: captureId, // e.g. 44L66...
//                 gatewayOrderId: captureResult.id, // 👈 PayPal Order ID fix
//                 customerEmail: customerEmail || null, // 👈 Customer Email fix
//                 status: 'PAID',
//                 tenantId: tenantId
//             }
//         });

//         if (orderType === 'CUSTOM') {
//             await tx.customOrder.updateMany({
//                 where: { OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }] },
//                 data: { paymentStatus: 'PAID' }
//             });
//         }
//         return transaction;
//     });
// }


// async function processOrderDBUpdate(captureResult, tenantId, gateway) {
//     // 1. Safe access check karein takay undefined error na aaye
//     const purchaseUnit = captureResult.purchase_units?.[0];
//     if (!purchaseUnit) {
//         console.error("❌ PayPal Response Structure Error: purchase_units missing");
//         throw new Error("Invalid PayPal response structure");
//     }

//     const rawMetadata = purchaseUnit.custom_id;
//     let metadata = {};

//     try {
//         metadata = JSON.parse(rawMetadata);
//     } catch (e) {
//         console.error("Failed to parse PayPal metadata:", e.message);
//         metadata = { orderId: purchaseUnit.reference_id, orderType: 'STOCK' };
//     }

//     const { orderId, orderType, customerEmail } = metadata;
    
//     // 2. Capture details nikalne ka safe tareeka
//     const capture = purchaseUnit.payments?.captures?.[0];
//     const captureId = capture?.id || captureResult.id; 
//     const amountValue = capture?.amount?.value || purchaseUnit.amount?.value || "0.00";
    
//     // 🛑 ERROR FIX: Currency code ko safely access karein
//     const currencyCode = capture?.amount?.currency_code || purchaseUnit.amount?.currency_code || "USD";

//     return await prisma.$transaction(async (tx) => {
//         // Idempotency check: Duplicate entry se bachne ke liye
//         const existing = await tx.transaction.findFirst({ 
//             where: { gatewayTransId: captureId } 
//         });
        
//         if (existing) {
//             console.log("ℹ️ Transaction already exists. Skipping.");
//             return existing;
//         }

//         const transaction = await tx.transaction.create({
//             data: {
//                 orderNumber: String(orderId),
//                 orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                 amount: parseFloat(amountValue),
//                 currency: currencyCode, // Safe currency access
//                 gateway: gateway,
//                 gatewayTransId: captureId, 
//                 gatewayOrderId: captureResult.id, 
//                 customerEmail: customerEmail || null, 
//                 status: 'PAID',
//                 tenantId: tenantId
//             }
//         });

//         // 4. Order Status Update
//          if (orderType === 'CUSTOM') {
//             console.log('iii')
//             const updateResult = await tx.customOrder.updateMany({
//                 where: { 
//                     OR: [
//                         { id: String(orderId) }, 
//                         { orderNumber: String(orderId) }
//                     ] 
//                 },
//                 data: { paymentStatus: 'PAID' }
//             });
//             console.log(`📊 Custom Order Update Count: ${updateResult.count} for ID: ${orderId}`);
//         }
        
//         return transaction;
//     });
// }

async function processOrderDBUpdate(result, tenantId, gateway) {
    // 1. Metadata dhoondne ka "Deep Search" logic 👇
    // Ye line Webhook, Capture aur Redirect teeno structures ko handle karegi
    let rawMetadata = result.custom_id || 
                      result.purchase_units?.[0]?.custom_id || 
                      result.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id;

    console.log("📝 PayPal Raw Metadata found:", rawMetadata);

    let metadata = { orderId: null, orderType: 'STOCK', customerEmail: null, tenantId: tenantId };

    if (rawMetadata && rawMetadata !== "undefined") {
        try {
            // Check agar ye JSON string hai
            if (typeof rawMetadata === 'string' && rawMetadata.trim().startsWith('{')) {
                const parsed = JSON.parse(rawMetadata);
                metadata = { ...metadata, ...parsed };
            } else {
                // Agar sirf ID string hai
                metadata.orderId = rawMetadata;
            }
        } catch (e) {
            console.error("❌ Metadata Parse Error:", e.message);
            metadata.orderId = rawMetadata;
        }
    }

    // Fallback: Agar metadata mein ID nahi mili toh reference_id uthayein
    if (!metadata.orderId) {
        metadata.orderId = result.purchase_units?.[0]?.reference_id || result.id;
    }

    const { orderId, orderType, customerEmail } = metadata;
    
    // 2. IDs aur Amount extraction
    const capture = result.purchase_units?.[0]?.payments?.captures?.[0] || result;
    const captureId = capture.id;
    const amountValue = capture.amount?.value || "0.00";

    console.log(`🚀 PROCESSING -> Type: ${orderType}, ID: ${orderId}, Email: ${customerEmail}`);

    return await prisma.$transaction(async (tx) => {
        // Idempotency Check
        const existing = await tx.transaction.findFirst({ where: { gatewayTransId: captureId } });
        if (existing) {
            console.log("ℹ️ Transaction already processed.");
            return existing;
        }

        // Transaction table save
        await tx.transaction.create({
            data: {
                orderNumber: String(orderId),
                orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
                amount: parseFloat(amountValue),
                currency: capture.amount?.currency_code || "USD",
                gateway: gateway,
                gatewayTransId: captureId,
                gatewayOrderId: result.id || null,
                customerEmail: customerEmail || null,
                status: 'PAID',
                tenantId: tenantId || metadata.tenantId
            }
        });

        // ✅ IMPORTANT: CustomOrder Table Update
        if (orderType === 'CUSTOM') {
            const updateResult = await tx.customOrder.updateMany({
                where: { 
                    OR: [
                        { id: String(orderId) }, 
                        { orderNumber: String(orderId) }
                    ] 
                },
                data: { paymentStatus: 'PAID' }
            });
            console.log(`✅ DATABASE UPDATED: CustomOrder ${orderId} is now PAID (Rows: ${updateResult.count})`);
        }
        
        return { success: true };
    });
}
exports.capturePaypalOrder = async (req, res) => {
    try {
        const { paypalToken } = req.body;
        const admin = await prisma.admin.findUnique({ 
            where: { id: req.user.id }, 
            include: { tenant: true } 
        });
        const tenant = admin?.tenant || await prisma.tenant.findFirst();
        const client = getPaypalClient(tenant);

        const request = new paypal.orders.OrdersCaptureRequest(paypalToken);
        
        try {
            const capture = await client.execute(request);
            if (capture.result.status === 'COMPLETED') {
                // This call will now work!
                await processOrderDBUpdate(capture.result, tenant.id, "PAYPAL");
                return res.json({ success: true });
            }
        } catch (err) {
            // Handle case where user refreshes the page and capture is already done
            if (err.message.includes("ORDER_ALREADY_CAPTURED")) {
                return res.json({ success: true, message: "Already processed" });
            }
            throw err;
        }
        res.status(400).json({ success: false, message: "Capture failed" });
    } catch (e) { 
        console.error("Capture Error:", e.message);
        res.status(500).json({ success: false, message: e.message }); 
    }
};
// exports.capturePaypalOrder = async (req, res) => {

//     try {
//         const { paypalToken } = req.body;
//         const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, include: { tenant: true } });
//         const tenant = admin?.tenant || await prisma.tenant.findFirst();
//         const client = getPaypalClient(tenant);

//         const request = new paypal.orders.OrdersCaptureRequest(paypalToken);
//         try {
//             const capture = await client.execute(request);
//             if (capture.result.status === 'COMPLETED') {
//                 await processOrderDBUpdate(capture.result, tenant.id, "PAYPAL");
//                 return res.json({ success: true });
//             }
//         } catch (err) {
//             if (err.message.includes("ORDER_ALREADY_CAPTURED")) return res.json({ success: true });
//             throw err;
//         }
//         res.status(400).json({ success: false });
//     } catch (e) { res.status(500).json({ message: e.message }); }
// };


// exports.handlePaypalWebhook = async (req, res) => {
//     const event = req.body;
//     if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
//         const resource = event.resource;
//         try {
//             const metadata = JSON.parse(resource.custom_id);
//             const { orderId, orderType, tenantId } = metadata;

//             await prisma.$transaction(async (tx) => {
//                 const existingTrans = await tx.transaction.findFirst({
//                     where: { gatewayTransId: resource.id }
//                 });
//                 if (existingTrans) return;

//                 await tx.transaction.create({
//                     data: {
//                         orderNumber: String(orderId),
//                         orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                         amount: parseFloat(resource.amount.value),
//                         currency: resource.amount.currency_code,
//                         gateway: "PAYPAL",
//                         gatewayTransId: resource.id,
//                         status: 'PAID',
//                         tenantId: tenantId
//                     }
//                 });

//                 // SIRF Custom Order ke liye status update
//                 if (orderType === 'CUSTOM') {
//                     await tx.customOrder.updateMany({
//                         where: { OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }] },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 }
//             });
//         } catch (err) { console.error("Webhook DB Error:", err.message); }
//     }
//     res.status(200).send("OK");
// };

exports.handlePaypalWebhook = async (req, res) => {
    const event = req.body;
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const resource = event.resource;
        try {
            const metadata = JSON.parse(resource.custom_id);
            console.log('metadata',metadata)
            // 1. Metadata se customerEmail nikala 👇
            const { orderId, orderType, tenantId, customerEmail } = metadata;

            await prisma.$transaction(async (tx) => {
                const existingTrans = await tx.transaction.findFirst({
                    where: { gatewayTransId: resource.id }
                });
                if (existingTrans) return;

                await tx.transaction.create({
                    data: {
                        orderNumber: String(orderId),
                        orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
                        amount: parseFloat(resource.amount.value),
                        currency: resource.amount.currency_code,
                        gateway: "PAYPAL",
                        gatewayTransId: resource.id, // Capture ID
                        customerEmail: customerEmail || null, // 👈 Email store ho raha hai
                        status: 'PAID',
                        tenantId: tenantId
                    }
                });

                // SIRF Custom Order ke liye status update
                if (orderType === 'CUSTOM') {
                    await tx.customOrder.updateMany({
                        where: { OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }] },
                        data: { paymentStatus: 'PAID' }
                    });
                }
            });
            console.log(`✅ PayPal Webhook: Order ${orderId} processed with Email: ${customerEmail}`);
        } catch (err) { 
            console.error("❌ Webhook DB Error:", err.message); 
        }
    }
    res.status(200).send("OK");
};
// exports.handlePaypalWebhook = async (req, res) => {
//     console.log('wwwwwww')
//     const event = req.body;

//     console.log("🔔 PayPal Webhook Received: ", event.event_type);

//     if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
//         const resource = event.resource;
//         const rawCustomId = resource.custom_id;

//         if (!rawCustomId) {
//             console.error("❌ Error: custom_id missing in PayPal event.");
//             return res.status(200).send("No custom_id");
//         }

//         try {
//             // 2. Metadata parse karein jo humne createPayment ke waqt bheja tha
//             const metadata = JSON.parse(rawCustomId);
//             const { orderId, orderType, tenantId } = metadata;

//             // 3. Database Transaction start karein
//             await prisma.$transaction(async (tx) => {
                
//                 // Idempotency check: Dekhein kahin ye transaction pehle se toh nahi exist karta?
//                 const existingTrans = await tx.transaction.findFirst({
//                     where: { gatewayTransId: resource.id }
//                 });

//                 if (existingTrans) {
//                     console.log("ℹ️ Transaction already processed. Skipping.");
//                     return;
//                 }

//                 // 4. Transaction Table mein entry karein
//                 await tx.transaction.create({
//                     data: {
//                         orderNumber: String(orderId),
//                         orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                         amount: parseFloat(resource.amount.value),
//                         currency: resource.amount.currency_code,
//                         gateway: "PAYPAL",
//                         gatewayTransId: resource.id, // PayPal Capture ID
//                         status: 'PAID',
//                         tenantId: tenantId
//                     }
//                 });

//                 // 5. Order Table Update karein (paymentStatus = 'PAID')
//                 if (orderType === 'CUSTOM') {
//                     await tx.customOrder.updateMany({
//                         where: { 
//                             OR: [
//                                 { id: String(orderId) }, 
//                                 { orderNumber: String(orderId) }
//                             ] 
//                         },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 } else {
//                     await tx.stockOrder.updateMany({
//                         where: { 
//                             OR: [
//                                 { id: String(orderId) }, 
//                                 { orderNumber: String(orderId) }
//                             ] 
//                         },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 }
//             });

//             console.log(`✅ Success: PayPal Webhook processed for Order ${orderId}`);
//         } catch (err) {
//             console.error("❌ PayPal Webhook DB Error:", err.message);
//         }
//     }

//     // PayPal ko hamesha 200 OK bhejna zaroori hai
//     res.status(200).send("Webhook Handled");
// };
// exports.handlePaypalWebhook = async (req, res) => {
//     const { event_type, resource } = req.body;
//     if (event_type === 'PAYMENT.CAPTURE.COMPLETED') {
//         try {
//             const metadata = JSON.parse(resource.custom_id);
//             await prisma.$transaction(async (tx) => {
//                 await tx.transaction.create({
//                     data: {
//                         orderNumber: String(metadata.orderId),
//                         orderType: metadata.orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
//                         amount: parseFloat(resource.amount.value),
//                         gateway: "PAYPAL",
//                         gatewayTransId: resource.id,
//                         status: 'PAID',
//                         tenantId: metadata.tenantId
//                     }
//                 });
//                 if (metadata.orderType === 'CUSTOM') {
//                     await tx.customOrder.updateMany({
//                         where: { OR: [{ id: metadata.orderId }, { orderNumber: metadata.orderId }] },
//                         data: { paymentStatus: 'PAID' }
//                     });
//                 }
//             });
//         } catch (e) { console.error(e.message); }
//     }
//     res.status(200).send("OK");
// };