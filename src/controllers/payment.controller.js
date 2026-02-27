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

