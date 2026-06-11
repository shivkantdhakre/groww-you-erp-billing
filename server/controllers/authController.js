import jwt from 'jsonwebtoken';
import { comparePassword, hashPassword } from '../utils/password.js';
import prisma from '../utils/prisma.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Verify the user exists
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user account is deactivated
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account deactivated. Please contact your administrator.' });
    }

    // 2. Verify the password matches the hash
    const isPasswordValid = await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 3. Generate the JWT with the Tenant ID (companyId)
    const token = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
        subRole: user.subRole,
        companyId: user.companyId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '12h' } // Token expires in 12 hours
    );

    // 4. Send the successful response (never send the password back!)
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        subRole: user.subRole,
        companyId: user.companyId
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// POST /api/auth/forgot-password (with Tenant Verification Factor)
export const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword, gstNumber, mobileNumber } = req.body;

    if (!email || !newPassword || (!gstNumber && !mobileNumber)) {
      return res.status(400).json({ error: "Email, new password, and company verification factor (GST or Mobile) are required" });
    }

    // Find user and company details
    const user = await prisma.user.findUnique({
      where: { email },
      include: { company: true },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or verification factor" });
    }

    // Tenant identity verification
    const company = user.company;
    let verified = false;
    if (gstNumber && company.gstNumber === gstNumber) {
      verified = true;
    }
    if (mobileNumber && company.mobileNumber === mobileNumber) {
      verified = true;
    }

    if (!verified) {
      return res.status(400).json({ error: "Invalid email or verification factor" });
    }

    // Hash password and update user record
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
