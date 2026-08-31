require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const User = require("./models/User");
const Gig = require("./models/Gig");
const CooperativePool = require("./models/CooperativePool");

const app = express();

app.use(express.json());


// CONNECT TO MONGODB

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB connected successfully!");
    })
    .catch((error) => {
        console.log("MongoDB connection error:", error);
    });


// TEST ROUTE

app.get("/", (req, res) => {
    res.send("Cooperative Gig Services API is running!");
});


// CREATE USER

app.post("/users", async (req, res) => {
    try {
        const user = await User.create(req.body);

        res.status(201).json({
            message: "User created successfully",
            user: user
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});


// CREATE GIG

app.post("/gigs", async (req, res) => {
    try {
        const gig = await Gig.create(req.body);

        res.status(201).json({
            message: "Gig created successfully",
            gig: gig
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});


// GET ALL GIGS

app.get("/gigs", async (req, res) => {
    try {
        const gigs = await Gig.find()
            .populate("customer")
            .populate("worker");

        res.json(gigs);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});


// UPDATE GIG

app.put("/gigs/:id", async (req, res) => {
    try {
        const updatedGig = await Gig.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!updatedGig) {
            return res.status(404).json({
                message: "Gig not found"
            });
        }

        res.json({
            message: "Gig updated successfully",
            gig: updatedGig
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});


// COMPLETE GIG + 85/15 PAYMENT SPLIT

app.put("/gigs/:id/complete", async (req, res) => {
    try {
        const gig = await Gig.findById(req.params.id);

        if (!gig) {
            return res.status(404).json({
                message: "Gig not found"
            });
        }

        if (gig.status === "completed") {
            return res.status(400).json({
                message: "Gig already completed"
            });
        }


        // Calculate payment split

        const workerAmount = gig.totalAmount * 0.85;
        const cooperativeAmount = gig.totalAmount * 0.15;


        // Add 85% to worker balance

        if (gig.worker) {
            await User.findByIdAndUpdate(
                gig.worker,
                {
                    $inc: {
                        balance: workerAmount
                    }
                }
            );
        }


        // Find the cooperative pool

        let pool = await CooperativePool.findOne();


        // Create it if it doesn't exist

        if (!pool) {
            pool = await CooperativePool.create({
                totalBalance: cooperativeAmount
            });
        } else {

            // Add 15% to existing pool

            pool.totalBalance += cooperativeAmount;

            await pool.save();
        }


        // Mark gig as completed

        gig.status = "completed";
        gig.paymentStatus = "paid";

        await gig.save();


        res.json({
            message: "Gig completed and payment distributed successfully!",
            totalAmount: gig.totalAmount,
            workerAmount: workerAmount,
            cooperativeAmount: cooperativeAmount,
            gig: gig
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});


// GET COOPERATIVE POOL

app.get("/cooperative-pool", async (req, res) => {
    try {
        let pool = await CooperativePool.findOne();

        if (!pool) {
            pool = await CooperativePool.create({
                totalBalance: 0
            });
        }

        res.json(pool);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});


// START SERVER

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});