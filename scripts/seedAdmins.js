require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const connectDB = require("../config/db");

const adminUsers = [
  {
    name: "Aditya Raj",
    email: "adityaraj9864@gmail.com",
    password: "Password1234",
    role: "admin"
  },
  {
    name: "Akshat Sinha",
    email: "akshatsinha44@gmail.com",
    password: "Password1234",
    role: "admin"
  },
  {
    name: "Tejas V Iyer",
    email: "tejasviyer2007@gmail.com",
    password: "Password1234",
    role: "admin"
  },
  {
    name: "Sonam Chand",
    email: "sonamchand1717@gmail.com",
    password: "Password1234",
    role: "admin"
  },
  {
    name: "Krupa N",
    email: "krupanyadav@gmail.com",
    password: "Password1234",
    role: "admin"
  }
];

async function seedAdmins() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    for (const admin of adminUsers) {
      const email = admin.email.toLowerCase().trim();
      const existingUser = await User.findOne({ email });

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(admin.password, salt);

      if (existingUser) {
        existingUser.name = admin.name;
        existingUser.password = hashedPassword;
        existingUser.role = "admin";
        existingUser.isVerified = true;
        existingUser.verificationStatus = "verified";
        await existingUser.save();
        console.log(`Updated admin: ${admin.name} (${email})`);
      } else {
        await User.create({
          name: admin.name,
          email,
          password: hashedPassword,
          role: "admin",
          isVerified: true,
          verificationStatus: "verified"
        });
        console.log(`Created admin: ${admin.name} (${email})`);
      }
    }

    console.log("All 5 admins processed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed admins:", error);
    process.exit(1);
  }
}

seedAdmins();
