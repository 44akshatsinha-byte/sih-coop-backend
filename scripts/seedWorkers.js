require("dotenv").config();
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const connectDB = require("../config/db");

const dummyWorkers = [
  {
    name: "Ramesh Kumar",
    email: "ramesh.kumar@coop.com",
    password: "Password1234",
    phone: "+919811100001",
    skills: ["plumbing", "technician"],
    latitude: 12.9716,
    longitude: 77.5946,
    rating: 4.8,
    ratingCount: 24,
    completedJobs: 28,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Suresh Verma",
    email: "suresh.verma@coop.com",
    password: "Password1234",
    phone: "+919811100002",
    skills: ["electrical", "technician"],
    latitude: 12.9352,
    longitude: 77.6245,
    rating: 4.9,
    ratingCount: 42,
    completedJobs: 46,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Pooja Sharma",
    email: "pooja.sharma@coop.com",
    password: "Password1234",
    phone: "+919811100003",
    skills: ["cleaning", "domestic"],
    latitude: 12.9784,
    longitude: 77.6408,
    rating: 4.7,
    ratingCount: 31,
    completedJobs: 35,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Rajesh Patel",
    email: "rajesh.patel@coop.com",
    password: "Password1234",
    phone: "+919811100004",
    skills: ["carpentry", "general"],
    latitude: 12.9698,
    longitude: 77.7500,
    rating: 4.6,
    ratingCount: 18,
    completedJobs: 20,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Sunita Devi",
    email: "sunita.devi@coop.com",
    password: "Password1234",
    phone: "+919811100005",
    skills: ["caregiving", "domestic"],
    latitude: 12.9250,
    longitude: 77.5938,
    rating: 4.9,
    ratingCount: 50,
    completedJobs: 54,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Manoj Yadav",
    email: "manoj.yadav@coop.com",
    password: "Password1234",
    phone: "+919811100006",
    skills: ["painting", "general"],
    latitude: 12.9121,
    longitude: 77.6446,
    rating: 4.5,
    ratingCount: 15,
    completedJobs: 17,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Deepak Singh",
    email: "deepak.singh@coop.com",
    password: "Password1234",
    phone: "+919811100007",
    skills: ["driving", "general"],
    latitude: 12.9166,
    longitude: 77.6101,
    rating: 4.8,
    ratingCount: 38,
    completedJobs: 41,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Anita Rao",
    email: "anita.rao@coop.com",
    password: "Password1234",
    phone: "+919811100008",
    skills: ["gardening", "cleaning"],
    latitude: 13.0031,
    longitude: 77.5643,
    rating: 4.7,
    ratingCount: 20,
    completedJobs: 23,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Vikram Joshi",
    email: "vikram.joshi@coop.com",
    password: "Password1234",
    phone: "+919811100009",
    skills: ["electrical", "plumbing"],
    latitude: 13.0358,
    longitude: 77.5970,
    rating: 4.6,
    ratingCount: 12,
    completedJobs: 14,
    isAvailable: true,
    verificationStatus: "pending"
  },
  {
    name: "Kavita Nair",
    email: "kavita.nair@coop.com",
    password: "Password1234",
    phone: "+919811100010",
    skills: ["cleaning", "domestic", "caregiving"],
    latitude: 12.8399,
    longitude: 77.6770,
    rating: 4.8,
    ratingCount: 29,
    completedJobs: 33,
    isAvailable: true,
    verificationStatus: "pending"
  },
  {
    name: "Arun Gupta",
    email: "arun.gupta@coop.com",
    password: "Password1234",
    phone: "+919811100011",
    skills: ["technician", "electrical"],
    latitude: 12.9982,
    longitude: 77.5530,
    rating: 4.9,
    ratingCount: 35,
    completedJobs: 39,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Gita Murthy",
    email: "gita.murthy@coop.com",
    password: "Password1234",
    phone: "+919811100012",
    skills: ["caregiving", "domestic"],
    latitude: 12.9591,
    longitude: 77.6974,
    rating: 4.7,
    ratingCount: 22,
    completedJobs: 25,
    isAvailable: true,
    verificationStatus: "pending"
  },
  {
    name: "Santosh Das",
    email: "santosh.das@coop.com",
    password: "Password1234",
    phone: "+919811100013",
    skills: ["painting", "carpentry"],
    latitude: 12.9255,
    longitude: 77.5468,
    rating: 4.4,
    ratingCount: 10,
    completedJobs: 11,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Pravin Shinde",
    email: "pravin.shinde@coop.com",
    password: "Password1234",
    phone: "+919811100014",
    skills: ["driving", "general"],
    latitude: 12.9304,
    longitude: 77.6784,
    rating: 4.8,
    ratingCount: 40,
    completedJobs: 44,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Meena Kumari",
    email: "meena.kumari@coop.com",
    password: "Password1234",
    phone: "+919811100015",
    skills: ["cleaning", "domestic"],
    latitude: 12.9817,
    longitude: 77.6285,
    rating: 4.6,
    ratingCount: 16,
    completedJobs: 18,
    isAvailable: true,
    verificationStatus: "pending"
  },
  {
    name: "Harish Reddy",
    email: "harish.reddy@coop.com",
    password: "Password1234",
    phone: "+919811100016",
    skills: ["plumbing", "general"],
    latitude: 13.1007,
    longitude: 77.5963,
    rating: 4.5,
    ratingCount: 19,
    completedJobs: 21,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Shobha Hegde",
    email: "shobha.hegde@coop.com",
    password: "Password1234",
    phone: "+919811100017",
    skills: ["gardening", "caregiving"],
    latitude: 12.9422,
    longitude: 77.5753,
    rating: 4.9,
    ratingCount: 45,
    completedJobs: 49,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Kamal Nayan",
    email: "kamal.nayan@coop.com",
    password: "Password1234",
    phone: "+919811100018",
    skills: ["carpentry", "painting"],
    latitude: 12.9968,
    longitude: 77.6131,
    rating: 4.3,
    ratingCount: 8,
    completedJobs: 9,
    isAvailable: true,
    verificationStatus: "pending"
  },
  {
    name: "Naveen Prasad",
    email: "naveen.prasad@coop.com",
    password: "Password1234",
    phone: "+919811100019",
    skills: ["electrical", "technician"],
    latitude: 12.8600,
    longitude: 77.7860,
    rating: 4.7,
    ratingCount: 28,
    completedJobs: 30,
    isAvailable: true,
    verificationStatus: "verified"
  },
  {
    name: "Lakshmi Bai",
    email: "lakshmi.bai@coop.com",
    password: "Password1234",
    phone: "+919811100020",
    skills: ["domestic", "cleaning", "caregiving"],
    latitude: 12.9609,
    longitude: 77.6387,
    rating: 5.0,
    ratingCount: 52,
    completedJobs: 58,
    isAvailable: true,
    verificationStatus: "verified"
  }
];

async function seedWorkers() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    for (const w of dummyWorkers) {
      const email = w.email.toLowerCase().trim();
      const existingUser = await User.findOne({ email });

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(w.password, salt);
      const isVerified = w.verificationStatus === "verified";

      const workerData = {
        name: w.name,
        email,
        password: hashedPassword,
        role: "worker",
        phone: w.phone,
        skills: w.skills,
        latitude: w.latitude,
        longitude: w.longitude,
        rating: w.rating,
        ratingCount: w.ratingCount,
        completedJobs: w.completedJobs,
        isAvailable: w.isAvailable,
        isVerified,
        verificationStatus: w.verificationStatus,
        verificationNote: isVerified ? "Government ID & trade credentials verified" : "Pending document verification"
      };

      if (existingUser) {
        Object.assign(existingUser, workerData);
        await existingUser.save();
        console.log(`Updated worker: ${w.name} (${email})`);
      } else {
        await User.create(workerData);
        console.log(`Created worker: ${w.name} (${email})`);
      }
    }

    console.log(`Successfully seeded ${dummyWorkers.length} workers.`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed workers:", error);
    process.exit(1);
  }
}

seedWorkers();
