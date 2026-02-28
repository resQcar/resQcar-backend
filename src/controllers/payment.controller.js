const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'lkr' } = req.body;

        if (!amount) {
            return res.status(400).json({ success: false, error: "Amount is required" });
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, 
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
                allow_redirects: 'never'
            },
        });

        res.status(200).json({
            success: true,
            clientSecret: paymentIntent.client_secret,
            message: "Payment intent created successfully"
        });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        if (!paymentIntentId) return res.status(400).json({ success: false, error: "Payment Intent ID is required" });

        const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: 'pm_card_visa'
        });

        if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'requires_capture') {
            return res.status(200).json({ success: true, message: "Payment confirmed successfully!", paymentStatus: paymentIntent.status });
        } else {
            return res.status(400).json({ success: false, message: "Payment has not succeeded yet.", paymentStatus: paymentIntent.status });
        }
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPaymentStatus = async (req, res) => {
    try {
        const { id } = req.params; 

        if (!id) {
            return res.status(400).json({ success: false, error: "Payment Intent ID is required" });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(id);

        res.status(200).json({
            success: true,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency,
            message: "Payment status retrieved successfully"
        });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getPaymentHistory = async (req, res) => {
    try {
        
        const payments = await stripe.paymentIntents.list({
            limit: 10,
        });

        res.status(200).json({
            success: true,
            count: payments.data.length,
            history: payments.data.map(payment => ({
                id: payment.id,
                amount: payment.amount,
                currency: payment.currency,
                status: payment.status,
                date: new Date(payment.created * 1000).toLocaleString()
            })),
            message: "Payment history retrieved successfully"
        });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};