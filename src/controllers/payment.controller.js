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

exports.getServiceHistoryCustomer = async (req, res) => {
    try {
        
        const history = await stripe.paymentIntents.list({
            limit: 10,
        });

        res.status(200).json({
            success: true,
            role: "customer",
            services: history.data.map(item => ({
                id: item.id,
                amount: item.amount,
                currency: item.currency,
                date: new Date(item.created * 1000).toLocaleDateString(),
                status: item.status,
                description: item.description || "Vehicle Service"
            })),
            message: "Customer service history retrieved successfully"
        });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getServiceHistoryMechanic = async (req, res) => {
    try {
        const history = await stripe.paymentIntents.list({
            limit: 10,
        });

        res.status(200).json({
            success: true,
            role: "mechanic",
            jobs: history.data.map(item => ({
                jobId: item.id,
                earnings: item.amount, 
                currency: item.currency,
                completedAt: new Date(item.created * 1000).toLocaleString(),
                status: item.status,
                customerNote: item.description || "General Repair"
            })),
            message: "Mechanic service history retrieved successfully"
        });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.submitRating = async (req, res) => {
    try {
        const { serviceId, rating, comment } = req.body;

        if (!serviceId || !rating) {
            return res.status(400).json({ 
                success: false, 
                message: "Service ID and rating (1-5) are required" 
            });
        }

        console.log(`New Rating for ${serviceId}: ${rating} stars - "${comment}"`);

        res.status(201).json({
            success: true,
            data: {
                serviceId,
                rating,
                comment,
                submittedAt: new Date().toISOString()
            },
            message: "Rating and review submitted successfully!"
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};