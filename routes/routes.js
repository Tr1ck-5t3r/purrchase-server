import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import Pet from "../models/Pet.js";
import Wishlist from "../models/Wishlist.js";
import Order from "../models/Orders.js";
import Razorpay from "razorpay";
import crypto from "crypto";
const router = express.Router();

dotenv.config();

// --- Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; 

  if (token == null) {
    // No token provided
    return res.status(401).json({ error: "Unauthorized: No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      // Token is invalid (expired, wrong secret, etc.)
      console.error("JWT Verification Error:", err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Unauthorized: Token expired" });
      }
      return res.status(403).json({ error: "Forbidden: Invalid token" }); // Or 401
    }
    req.user = decoded;
    next();
  });
};

router.get("/", (req, res) => {
  res.send("Hello World!");
});

router.post("/register", async (req, res) => {

  try {
    const { username, email, password, address, phone } = req.body;
      console.log("Registration Request",username);
    // Check if username or email already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      address,
      phone,
      profilePicture: `https://eu.ui-avatars.com/api/?name=${username}&size=128&background=random`,
      createdAt: new Date(),
    });

    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration Error:", error); 
    res
      .status(500)
      .json({ error: "Registration failed", details: error.message });
  }
});

router.post("/login", async (req, res) => {
  
  try {
    const { email, password } = req.body;
    console.log("Login Request:", email); 
    // Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Username and password are required" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return token + user info
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        address: user.address,
        phone: user.phone,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Login error:", error); // Log error for debugging
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/find", async (req, res) => {
  // Now you can optionally use req.user if needed, e.g., req.user.userId
  try {
    const pets = await Pet.find();
    res.json(pets);
  } catch (err) {
    console.error("Error fetching pets:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch pets", details: err.message });
  }
});


router.get("/gallery", async (req, res) => {
  try {
    const pets = await Pet.find().sort({ _id: -1 }).limit(20);
    res.json(pets);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "An error occurred while fetching the gallery.",
      details: err.message,
    }); 
  }
});


router.get("/find/:id", async (req, res) => {
  const { id } = req.params;
  const pet = await Pet.findById(id); // Or however you're querying
  res.json(pet);
});

// Fetches the current logged-in user's profile data
router.get("/profile", authenticateToken, async (req, res) => {
  try {

    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res
      .status(500)
      .json({ error: "Failed to fetch profile", details: error.message });
  }
});

router.get("/my-adopted-pets", authenticateToken, async (req, res) => {
  const userId = req.user.userId; 
  console.log(`Fetching adopted pets for User ${userId}`);

  try {
    const paidOrders = await Order.find({
      user: userId,
      paymentStatus: "paid", 
    }).select("pet"); 

    const petIds = paidOrders.map((order) => order.pet);

    const adoptedPets = await Pet.find({
      _id: { $in: petIds }, 
      owner: userId, 
    }).sort({ adoptionDate: -1 }); 

    res.status(200).json(adoptedPets);
  } catch (error) {
    console.error(`Error fetching adopted pets for User ${userId}:`, error);
    res
      .status(500)
      .json({ error: "Failed to fetch adopted pets.", details: error.message });
  }
});


router.put("/profile", authenticateToken, async (req, res) => {
  const { username, email, address, phone } = req.body;
  const userId = req.user.userId; 

  if (!username || !email) {
    return res.status(400).json({ error: "Username and email are required." });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
      _id: { $ne: userId },
    });

    if (existingUser) {
      let errorMessage = "Update failed: ";
      if (existingUser.username === username) {
        errorMessage += "Username already taken by another user.";
      } else if (existingUser.email === email) {
        errorMessage += "Email already registered by another user.";
      }
      return res.status(400).json({ error: errorMessage });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true, context: "query" } 
    ).select("-password"); 

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found for update" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ error: "Validation failed", details: error.errors });
    }
    res
      .status(500)
      .json({ error: "Profile update failed", details: error.message });
  }
});

router.get("/wishlist", authenticateToken, async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user.userId }).populate(
      "pets"
    );

    return res.status(200).json({
      pets: wishlist?.pets || [],
      message: wishlist ? "Wishlist fetched" : "Wishlist is empty",
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch wishlist", details: error.message });
  }
});


router.post("/wishlist/items/:petId", authenticateToken, async (req, res) => {
  const { petId } = req.params;
  const { userId } = req.user;

  try {
    const pet = await Pet.findById(petId);
    if (!pet) return res.status(404).json({ error: "Pet not found" });

    let wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, pets: [petId] });
    } else {
      const alreadyInWishlist = wishlist.pets.some(
        (id) => id.toString() === petId
      );
      if (alreadyInWishlist) {
        return res.status(400).json({ message: "Pet already in wishlist" });
      }
      wishlist.pets.push(petId);
    }

    await wishlist.save();
    return res.status(200).json({ message: "Pet added to wishlist", wishlist });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    return res
      .status(500)
      .json({ error: "Failed to add to wishlist", details: error.message });
  }
});

router.delete("/wishlist/items/:petId", authenticateToken, async (req, res) => {
  const { petId } = req.params;
  const { userId } = req.user;

  try {
    const wishlist = await Wishlist.findOne({ user: userId });

    if (!wishlist) {
      return res.status(404).json({ error: "Wishlist not found for user" });
    }

    const originalLength = wishlist.pets.length;
    wishlist.pets = wishlist.pets.filter((id) => id.toString() !== petId);

    if (wishlist.pets.length === originalLength) {
      return res.status(404).json({ message: "Pet not found in wishlist" });
    }

    await wishlist.save();
    return res
      .status(200)
      .json({ message: "Pet removed from wishlist", wishlist });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return res.status(500).json({
      error: "Failed to remove from wishlist",
      details: error.message,
    });
  }
});

// Initialize Razorpay Instance
const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create Razorpay Order 
router.post('/orders/create/:petId', authenticateToken, async (req, res) => {
    const { petId } = req.params;
    const userId = req.user.userId;
    console.log(`Create Order Request: User ${userId}, Pet ${petId}`);

    let newOrder = null;

    try {
        // Fetch Pet & Validate Availability
        const pet = await Pet.findById(petId);
        if (!pet) {
            return res.status(404).json({ success: false, error: "Pet not found." });
        }
        if (!pet.available) {
            console.warn(`Attempt to order already adopted pet: Pet ${petId}, User ${userId}`);
            return res.status(400).json({ success: false, error: "Sorry, this pet has already been adopted." });
        }

        // Create Initial Order Record in Your Database
        newOrder = new Order({ 
            user: userId,
            pet: petId,
            amount: pet.price,
            currency: 'INR', 
            paymentStatus: 'created', 
        });
        await newOrder.save();
        const amountInPaise = Math.round(pet.price * 100);
        const currency = 'INR';
        const receiptId = newOrder._id.toString();

        const razorpayOrderOptions = {
            amount: amountInPaise,
            currency: currency,
            receipt: receiptId, 
            notes: { 
                dbPetId: petId,
                dbUserId: userId,
                dbOrderId: newOrder._id.toString() 
            }
        };

        // Create Order with Razorpay
        const razorpayOrder = await razorpayInstance.orders.create(razorpayOrderOptions);
        if (!razorpayOrder) {
             throw new Error("Razorpay failed to create order");
        }

        // Add the Razorpay Order ID back to your saved Order record
        newOrder.razorpayOrderId = razorpayOrder.id;
        await newOrder.save(); // Save the update

        // Send Necessary Details to Frontend for Checkout Initialization
        res.status(200).json({
            success: true,
            keyId: process.env.RAZORPAY_KEY_ID, 
            amount: razorpayOrder.amount,       
            currency: razorpayOrder.currency,
            orderId: razorpayOrder.id,          
            petName: pet.name,                  
             prefill: {                         
                name: req.user.username,       
            }
        });

    } catch (error) {
        console.error("Error Creating Razorpay Order:", error);
        if (newOrder && newOrder._id && !newOrder.razorpayOrderId) {
            try {
                 await Order.findByIdAndUpdate(newOrder._id, { paymentStatus: 'failed' });
                 console.log(`Marked DB Order ${newOrder._id} as failed due to Razorpay creation error.`);
            } catch (dbError) {
                console.error(`Failed to mark order ${newOrder._id} as failed after Razorpay error:`, dbError);
            }
        }
        res.status(500).json({ success: false, error: "Could not initiate payment.", details: error.message });
    }
});


// Validate Payment (Called by Frontend after Razorpay success)
router.post('/orders/validate', authenticateToken, async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
    } = req.body;
    const userId = req.user.userId;

    console.log(`Validate Payment Request: User ${userId}, Razorpay Order ${razorpay_order_id}`);

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ success: false, error: 'Missing payment validation details.' });
    }

    const body_data = razorpay_order_id + "|" + razorpay_payment_id;

    try {
        // Verify Signature
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body_data.toString())
            .digest('hex');

        const isAuthentic = expectedSignature === razorpay_signature;

        if (!isAuthentic) {
            console.warn(`Invalid Signature during validation: Order ${razorpay_order_id}, User ${userId}`);
            return res.status(400).json({ success: false, error: 'Transaction Signature Invalid.' });
        }

        // Find the corresponding Order in *your* DB
        const order = await Order.findOne({
            razorpayOrderId: razorpay_order_id,
            user: userId // Security Check: Match user
        });

        if (!order) {
            console.error(`Validation Error: DB Order not found or doesn't belong to user. Razorpay Order: ${razorpay_order_id}, User: ${userId}`);
            return res.status(404).json({ success: false, error: 'Order not found for this user.' });
        }

        // Idempotency Check
        if (order.paymentStatus === 'paid') {
            console.log(`Order ${order._id} already marked as paid. Skipping update.`);
            return res.status(200).json({
                 success: true,
                 message: "Payment already verified.",
                 orderId: order._id,
                 petId: order.pet
            });
        }

        // Find Pet and check availability
        const pet = await Pet.findById(order.pet);
        if (!pet) {
             console.error(`Validation Error: Pet ${order.pet} not found for Order ${order._id}`);
             return res.status(404).json({ success: false, error: 'Associated pet not found.' });
        }
        if (!pet.available) {
            console.warn(`Validation Conflict: Pet ${order.pet} was already adopted when validating Order ${order._id}.`);
             order.paymentStatus = 'failed';
             order.razorpayPaymentId = razorpay_payment_id;
             order.razorpaySignature = razorpay_signature;
             await order.save();
            return res.status(400).json({ success: false, error: 'Pet was already adopted by the time payment was verified.' });
        }

        // Update Order and Pet records
        order.razorpayPaymentId = razorpay_payment_id;
        order.razorpaySignature = razorpay_signature;
        order.paymentStatus = 'paid';
        await order.save();

        pet.available = false;
        pet.owner = order.user;
        pet.adoptionDate = new Date();
        await pet.save();

        console.log(`Validation Success: Order ${order._id}, Pet ${pet._id} marked as adopted by User ${order.user}`);

        // Send Success Response
        res.json({
            success: true,
            message: "Payment verified successfully and pet marked as adopted.",
            orderId: order._id,
            petId: pet._id
        });

    } catch (err) {
        console.error("Error during payment validation:", err);
        res.status(500).json({ success: false, error: "Failed to validate payment or update records.", details: err.message });
    }
});


// Get User's Order History
router.get('/orders/my-history', authenticateToken, async (req,res) => {
     try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const orders = await Order.find({ user: userId })
                                .populate({
                                    path: 'pet',
                                    select: 'name species breed images price available' // Added available
                                 })
                                .sort({ createdAt: -1 })
                                .skip(skip)
                                .limit(limit);

        const totalOrders = await Order.countDocuments({ user: userId });

        res.status(200).json({
            orders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders
        });

    } catch (error) {
         console.error("Error fetching order history:", error);
        res.status(500).json({ error: "Failed to fetch order history.", details: error.message });
    }
});


export default router;
