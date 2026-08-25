const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  // 1. Check if the request has an Authorization header
  const authHeader = req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  // 2. Extract the token (Remove the word "Bearer ")
  const token = authHeader.split(" ")[1];

  try {
    // 3. Verify the token using the EXACT same secret key from your login route
    const decoded = jwt.verify(token, "super_secret_hackathon_key");
    
    // 4. Attach the user's ID and role to the request so the next route can use it
    req.user = decoded; 
    
    // 5. The "next()" function tells Express: "This guy is legit, let him through to the route!"
    next(); 
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

module.exports = authMiddleware;