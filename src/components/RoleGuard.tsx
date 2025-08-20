import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db, ROLES } from '../lib/firebase';
import toast from 'react-hot-toast';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

interface UserProfile {
  role: string;
  permissions: string[];
}

const RoleGuard: React.FC<RoleGuardProps> = ({ 
  children, 
  allowedRoles, 
  fallback = null 
}) => {
  const { user } = useAuthStore();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Try to get user from 'users' collection first
        let userDoc = await getDoc(doc(db, 'users', user.uid));
        
        // If not found, try 'employees' collection
        if (!userDoc.exists()) {
          userDoc = await getDoc(doc(db, 'employees', user.uid));
        }

        if (userDoc.exists()) {
          const userData = userDoc.data() as UserProfile;
          const role = userData.role || 'member'; // Default to member if no role
          setUserRole(role);
          
          // Check if user's role is in allowed roles
          const access = allowedRoles.includes(role) || 
                        allowedRoles.includes('all') ||
                        (role === ROLES.SUPER_ADMIN); // Super admin always has access
          
          setHasAccess(access);
          
          if (!access) {
            toast.error('You do not have permission to access this page.');
          }
        } else {
          // User document doesn't exist, assume basic member role
          setUserRole('member');
          setHasAccess(allowedRoles.includes('member') || allowedRoles.includes('all'));
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole('member');
        setHasAccess(allowedRoles.includes('member') || allowedRoles.includes('all'));
      }
      
      setLoading(false);
    };

    checkUserRole();
  }, [user, allowedRoles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto p-6 mt-10">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <div className="text-red-600 dark:text-red-400 text-6xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">
            Access Denied
          </h2>
          <p className="text-red-600 dark:text-red-400 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Current role: <span className="font-medium">{userRole}</span>
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Required roles: <span className="font-medium">{allowedRoles.join(', ')}</span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default RoleGuard;
