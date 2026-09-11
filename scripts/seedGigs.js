require("dotenv").config();
const bcrypt = require("bcryptjs");
const User = require("../models/user");
const Gig = require("../models/gig");
const connectDB = require("../config/db");

async function seedGigs() {
  try {
    console.log("Connecting to database...");
    await connectDB();

    // 1. Ensure dummy customers exist
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("Password1234", salt);

    const customersData = [
      {
        name: "Rahul Sharma",
        email: "rahul.sharma@example.com",
        password: hashedPassword,
        role: "customer",
        phone: "+919876500001",
        isVerified: true,
        verificationStatus: "verified"
      },
      {
        name: "Priya Menon",
        email: "priya.menon@example.com",
        password: hashedPassword,
        role: "customer",
        phone: "+919876500002",
        isVerified: true,
        verificationStatus: "verified"
      },
      {
        name: "Ananya Roy",
        email: "ananya.roy@example.com",
        password: hashedPassword,
        role: "customer",
        phone: "+919876500003",
        isVerified: true,
        verificationStatus: "verified"
      }
    ];

    const customerMap = {};
    for (const c of customersData) {
      let u = await User.findOne({ email: c.email });
      if (!u) {
        u = await User.create(c);
        console.log(`Created customer: ${u.name} (${u.email})`);
      }
      customerMap[c.email] = u._id;
    }

    // 2. Fetch available workers for assignments
    const workers = await User.find({ role: "worker" });
    const workerBySkill = (skill) =>
      workers.find((w) => (w.skills || []).includes(skill))?._id || workers[0]?._id;

    // 3. Define 12 realistic gigs with different urgency levels, categories, and coordinates
    const dummyGigs = [
      {
        title: "Emergency Kitchen Pipe Burst & Flooding",
        description: "Main kitchen supply pipe under the sink has ruptured and water is actively leaking. Need urgent emergency plumber to isolate valve and replace burst joint.",
        category: "plumbing",
        amount: 850,
        urgency: "emergency",
        status: "pending",
        paymentStatus: "pending",
        customerEmail: "rahul.sharma@example.com",
        location: "Flat 402, Oakwood Apts, 12th Main, Indiranagar, Bangalore",
        coordinates: [77.6408, 12.9784],
        images: []
      },
      {
        title: "Complete Electrical Short Circuit in Main MCB",
        description: "Entire ground floor power tripped with sparking sounds in the main distribution box. Emergency electrician needed to diagnose short circuit and replace faulty breaker.",
        category: "electrical",
        amount: 1200,
        urgency: "emergency",
        status: "accepted",
        paymentStatus: "pending",
        customerEmail: "priya.menon@example.com",
        workerId: workerBySkill("electrical"),
        location: "House 58, 4th Cross, Koramangala 4th Block, Bangalore",
        coordinates: [77.6245, 12.9352],
        images: []
      },
      {
        title: "Urgent Night Elder Patient Assistance",
        description: "Require an experienced caregiver immediately to assist elderly patient with mobility and overnight post-surgery support for tonight.",
        category: "caregiving",
        amount: 1500,
        urgency: "emergency",
        status: "pending",
        paymentStatus: "pending",
        customerEmail: "ananya.roy@example.com",
        location: "No. 12, 7th Main, Jayanagar 3rd Block, Bangalore",
        coordinates: [77.5938, 12.9250],
        images: []
      },
      {
        title: "Emergency Airport Drop (Flight at 6 AM)",
        description: "Urgent driver required early morning with luggage handling for urgent business trip to Kempegowda International Airport.",
        category: "driving",
        amount: 1100,
        urgency: "emergency",
        status: "in-progress",
        paymentStatus: "pending",
        customerEmail: "rahul.sharma@example.com",
        workerId: workerBySkill("driving"),
        location: "Tower 3, Prestige Palms, Whitefield, Bangalore",
        coordinates: [77.7500, 12.9698],
        images: []
      },
      {
        title: "AC Water Leakage & Cooling Gas Check",
        description: "Split AC in master bedroom is dripping water inside the room and not cooling properly. Need technician to service filters and check gas pressure.",
        category: "technician",
        amount: 750,
        urgency: "normal",
        status: "pending",
        paymentStatus: "pending",
        customerEmail: "priya.menon@example.com",
        location: "Villa 18, Palm Meadows, Marathahalli, Bangalore",
        coordinates: [77.6974, 12.9591],
        images: []
      },
      {
        title: "3BHK Full Apartment Deep Cleaning",
        description: "Post-renovation deep cleaning required for 3BHK flat including bathroom acid washing, kitchen degreasing, and balcony pressure cleaning.",
        category: "cleaning",
        amount: 2800,
        urgency: "normal",
        status: "pending",
        paymentStatus: "pending",
        customerEmail: "ananya.roy@example.com",
        location: "Apt 204, Green Glen Layout, Bellandur, Bangalore",
        coordinates: [77.6784, 12.9304],
        images: []
      },
      {
        title: "Living Room Accent Wall Texture Painting",
        description: "Need skilled painter to apply royal sheen texture paint on 12x10 living room feature wall. Paint and primer provided.",
        category: "painting",
        amount: 1800,
        urgency: "normal",
        status: "accepted",
        paymentStatus: "pending",
        customerEmail: "rahul.sharma@example.com",
        workerId: workerBySkill("painting"),
        location: "No. 88, 14th Main, HSR Layout Sector 3, Bangalore",
        coordinates: [77.6446, 12.9121],
        images: []
      },
      {
        title: "Custom Wooden Bookshelf & Cabinet Repair",
        description: "Fix sagging wooden bookshelf hinges, align sliding wardrobe door tracks, and assemble new study desk.",
        category: "carpentry",
        amount: 950,
        urgency: "normal",
        status: "pending",
        paymentStatus: "pending",
        customerEmail: "priya.menon@example.com",
        location: "B-501, Mantri Residency, Bannerghatta Road, Bangalore",
        coordinates: [77.5970, 12.8900],
        images: []
      },
      {
        title: "Terrace Garden Trimming & Lawn Maintenance",
        description: "Pruning of rose bushes, repotting 15 plants into fresh organic soil, and weeding terrace garden lawn.",
        category: "gardening",
        amount: 650,
        urgency: "normal",
        status: "completed",
        paymentStatus: "paid",
        customerEmail: "ananya.roy@example.com",
        workerId: workerBySkill("gardening"),
        location: "15 Temple Road, Malleshwaram 15th Cross, Bangalore",
        coordinates: [77.5643, 13.0031],
        review: {
          rating: 5,
          text: "Excellent gardening service! Very punctual and clean work.",
          createdAt: new Date()
        }
      },
      {
        title: "Ceiling Fan Installation & Switchboard Fix",
        description: "Installed two new BLDC ceiling fans and replaced three burnt switch sockets with modular switches.",
        category: "electrical",
        amount: 600,
        urgency: "normal",
        status: "completed",
        paymentStatus: "paid",
        customerEmail: "rahul.sharma@example.com",
        workerId: workerBySkill("electrical"),
        location: "House 24, 2nd Main, Rajajinagar 1st Block, Bangalore",
        coordinates: [77.5530, 12.9982],
        review: {
          rating: 5,
          text: "Very neat electrical installation. Took safety precautions properly.",
          createdAt: new Date()
        }
      },
      {
        title: "Emergency Bathroom Drain Jam & Overflow",
        description: "Severely clogged floor drain causing water overflow during morning rush. Emergency drain snake clearing required.",
        category: "plumbing",
        amount: 700,
        urgency: "emergency",
        status: "pending",
        paymentStatus: "pending",
        customerEmail: "priya.menon@example.com",
        location: "Flat 101, Lakeview Apts, BTM 2nd Stage, Bangalore",
        coordinates: [77.6101, 12.9166],
        images: []
      },
      {
        title: "Domestic Housekeeping & Wardrobe Organization",
        description: "Full day housekeeping, folding and organizing wardrobes, kitchen pantry reorganizing.",
        category: "domestic",
        amount: 1000,
        urgency: "normal",
        status: "pending",
        paymentStatus: "pending",
        customerEmail: "ananya.roy@example.com",
        location: "No. 405, Sterling Apts, Domlur Layout, Bangalore",
        coordinates: [77.6387, 12.9609],
        images: []
      }
    ];

    for (const g of dummyGigs) {
      const customerId = customerMap[g.customerEmail];
      const existing = await Gig.findOne({ title: g.title, customer: customerId });

      const gigDoc = {
        title: g.title,
        description: g.description,
        category: g.category,
        amount: g.amount,
        urgency: g.urgency,
        status: g.status,
        paymentStatus: g.paymentStatus,
        customer: customerId,
        worker: g.workerId || null,
        location: g.location,
        locationPoint: {
          type: "Point",
          coordinates: g.coordinates
        },
        images: g.images || [],
        review: g.review || undefined,
        completedAt: g.status === "completed" ? new Date() : null
      };

      if (existing) {
        Object.assign(existing, gigDoc);
        await existing.save();
        console.log(`Updated gig: "${g.title}" [${g.urgency.toUpperCase()}] (${g.status})`);
      } else {
        await Gig.create(gigDoc);
        console.log(`Created gig: "${g.title}" [${g.urgency.toUpperCase()}] (${g.status})`);
      }
    }

    console.log(`Successfully seeded ${dummyGigs.length} dummy jobs.`);
    process.exit(0);
  } catch (error) {
    console.error("Failed to seed gigs:", error);
    process.exit(1);
  }
}

seedGigs();
