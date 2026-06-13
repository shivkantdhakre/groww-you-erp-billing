import jwt from 'jsonwebtoken';
import { contextStorage } from '../utils/context.js';

// 1. JWT Authentication & 3. Tenant ID Extraction
export const verifyTokenAndTenant = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access Denied: No Token Provided' });
  }

  try {
    // Verify the user's identity
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Determine the branch ID: use x-branch-id header if admin, otherwise use token's branchId
    let branchId = decoded.branchId;
    
    if (req.headers['x-branch-id'] && (decoded.role === 'SUPER_ADMIN' || decoded.role === 'COMPANY_ADMIN')) {
      const headerBranchId = parseInt(req.headers['x-branch-id']);
      if (!isNaN(headerBranchId)) {
        branchId = headerBranchId;
      }
    }

    // Extract the tenant ID (companyId) and user details
    req.user = {
      id: decoded.id,
      role: decoded.role,
      subRole: decoded.subRole,
      companyId: decoded.companyId,
      branchId: branchId,
      subscription: decoded.subscription || null
    };

    contextStorage.run({ user: req.user }, () => {
      next();
    });
  } catch (error) {

    return res.status(403).json({ message: 'Invalid or Expired Token' });
  }
};

// 2. Role-Based Access Control (RBAC)
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: Insufficient Permissions' });
    }
    next();
  };
};
