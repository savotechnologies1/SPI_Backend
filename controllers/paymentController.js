
const prisma = require("../config/prisma");
const paypal = require('@paypal/checkout-server-sdk');
const Stripe = require('stripe');
const { sendMail } = require("../functions/mailer");

function getPaypalClient(tenant) {
    const environment = process.env.NODE_ENV === 'production'
        ? new paypal.core.LiveEnvironment(tenant.paypalClientId, tenant.paypalSecretKey)
        : new paypal.core.SandboxEnvironment(tenant.paypalClientId, tenant.paypalSecretKey);
    return new paypal.core.PayPalHttpClient(environment);
}

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



exports.createPayment = async (req, res) => {
    try {
        const { items, customerDetails, method, gateway,frontendUrl } = req.body;
        const admin = await prisma.admin.findUnique({ where: { id: req.user.id }, include: { tenant: true } });
        const tenant = admin?.tenant || await prisma.tenant.findFirst();

        const internalId = String(items[0].id); 
        const orderType = items[0].type;
        const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2);
        
        const metadataObj = { 
            orderId: internalId, 
            orderType, 
            tenantId: tenant.id,
            customerEmail: customerDetails.email 
        };

                const baseUrl = frontendUrl || req.headers.origin || process.env.FRONTEND_URL;

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
                success_url: `${baseUrl}/success?id=${internalId}&gateway=stripe`,
                cancel_url: `${baseUrl}/cancel`,
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
        "%items%": itemsTable 
    }, customerDetails.email);
    
    return res.json({ success: true, message: "Payment link sent to email." });
}
        return res.json({ success: true, url: paymentUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOrderStatus = async (req, res) => {
    try {
        const { id } = req.query;

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

exports.handleStripeWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const stripePlatform = new Stripe(process.env.STRIPE_SECRET_KEY);
    let event;

    try {
        event = stripePlatform.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) { return res.status(400).send(err.message); }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        
        const orderId = session.client_reference_id || session.metadata?.orderId;
        const orderType = session.metadata?.orderType;
        const tenantId = session.metadata?.tenantId;

        try {
            await prisma.$transaction(async (tx) => {
                await tx.transaction.create({
                    data: {
                        orderNumber: String(orderId),
                        orderType: orderType === 'CUSTOM' ? 'CUSTOM' : 'STOCK',
                        amount: session.amount_total / 100,
                        currency: session.currency?.toUpperCase() || "USD", 
                        gateway: "STRIPE",
                        gatewayOrderId: session.id,
                        gatewayTransId: session.payment_intent, 
                        customerEmail: session.customer_details?.email || session.metadata?.customerEmail || null,
                        status: 'PAID',
                        tenantId: tenantId
                    }
                });

                if (orderType === 'CUSTOM') {
                    await tx.customOrder.updateMany({
                        where: { OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }] },
                        data: { paymentStatus: 'PAID' }
                    });
                }
            });
        } catch (e) { 
            console.error("❌ Stripe Webhook DB Error:", e.message); 
        }
    }
    res.json({ received: true });
};

async function processOrderDBUpdate(result, tenantId, gateway) {
    let rawMetadata = result.custom_id || 
                      result.purchase_units?.[0]?.custom_id || 
                      result.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id;


    let metadata = { orderId: null, orderType: 'STOCK', customerEmail: null, tenantId: tenantId };

    if (rawMetadata && rawMetadata !== "undefined") {
        try {
            if (typeof rawMetadata === 'string' && rawMetadata.trim().startsWith('{')) {
                const parsed = JSON.parse(rawMetadata);
                metadata = { ...metadata, ...parsed };
            } else {
                metadata.orderId = rawMetadata;
            }
        } catch (e) {
            metadata.orderId = rawMetadata;
        }
    }

    if (!metadata.orderId) {
        metadata.orderId = result.purchase_units?.[0]?.reference_id || result.id;
    }

    const { orderId, orderType, customerEmail } = metadata;
    
    const capture = result.purchase_units?.[0]?.payments?.captures?.[0] || result;
    const captureId = capture.id;
    const amountValue = capture.amount?.value || "0.00";


    return await prisma.$transaction(async (tx) => {
        const existing = await tx.transaction.findFirst({ where: { gatewayTransId: captureId } });
        if (existing) {
            return existing;
        }

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
                await processOrderDBUpdate(capture.result, tenant.id, "PAYPAL");
                return res.json({ success: true });
            }
        } catch (err) {
            if (err.message.includes("ORDER_ALREADY_CAPTURED")) {
                return res.json({ success: true, message: "Already processed" });
            }
            throw err;
        }
        res.status(400).json({ success: false, message: "Capture failed" });
    } catch (e) { 
        res.status(500).json({ success: false, message: e.message }); 
    }
};


exports.handlePaypalWebhook = async (req, res) => {
    const event = req.body;
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const resource = event.resource;
        try {
            const metadata = JSON.parse(resource.custom_id);
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
                        gatewayTransId: resource.id,
                        customerEmail: customerEmail || null,
                        status: 'PAID',
                        tenantId: tenantId
                    }
                });

                if (orderType === 'CUSTOM') {
                    await tx.customOrder.updateMany({
                        where: { OR: [{ id: String(orderId) }, { orderNumber: String(orderId) }] },
                        data: { paymentStatus: 'PAID' }
                    });
                }
            });
        } catch (err) { 
            console.error("❌ Webhook DB Error:", err.message); 
        }
    }
    res.status(200).send("OK");
};
