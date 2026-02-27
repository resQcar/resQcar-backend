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