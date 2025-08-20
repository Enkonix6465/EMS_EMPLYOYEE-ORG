import React, { useState, useEffect } from "react";
import { User, Camera, Save, X, Mail, Phone, MapPin, Calendar, Building, UserCircle } from "lucide-react";
import { db } from "../lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { useAuthStore } from "../store/authStore";

interface EmployeeProfile {
  id: string;
  employeeId?: string; // Add specific employee ID field
  name: string;
  email: string;
  title?: string;
  department?: string;
  location?: string;
  phone?: string;
  dob?: string;
  joiningDate?: string;
  status?: string;
  type?: string;
  photo?: string;
}

export default function Profile() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editPhoto, setEditPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    if (user?.uid) {
      fetchProfile();
    }
  }, [user?.uid]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Fetch all employees from the collection
      const snapshot = await getDocs(collection(db, "employees"));
      
      // Find the employee with matching UID
      const employeeDoc = snapshot.docs.find(doc => doc.id === user!.uid);
      
      if (employeeDoc) {
        const employeeData = employeeDoc.data();
        setProfile({ 
          id: employeeDoc.id, 
          ...employeeData 
        } as EmployeeProfile);
      } else {
        setMessage("Profile not found. Please contact admin to add your profile.");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      setMessage("Error fetching profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpdate = async () => {
    if (!user?.uid || !photoUrl.trim()) {
      setMessage("Please enter a valid photo URL");
      return;
    }

    try {
      const docRef = doc(db, "employees", user.uid);
      await updateDoc(docRef, {
        photo: photoUrl.trim(),
      });

      setProfile(prev => prev ? { ...prev, photo: photoUrl.trim() } : null);
      setEditPhoto(false);
      setPhotoUrl("");
      setMessage("Photo updated successfully!");
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error updating photo:", error);
      setMessage("Error updating photo. Please try again.");
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not specified";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <UserCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Profile Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">My Profile</h1>
          <p className="text-muted">View your employee information</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.includes("successfully") 
              ? 'alert alert-success' 
              : 'alert alert-error'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="card-body text-center">
                <div className="relative inline-block mb-6">
                  {profile.photo && profile.photo !== "NA" ? (
                    <img
                      src={profile.photo}
                      alt={profile.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-blue-200 dark:border-blue-700 shadow-lg hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        // Hide the image and show initials instead
                        e.currentTarget.style.display = 'none';
                        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  {/* User initials */}
                  <div 
                    className={`w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center border-4 border-blue-200 dark:border-blue-700 shadow-lg ${profile.photo && profile.photo !== "NA" ? 'hidden' : ''}`}
                  >
                    <span className="text-4xl font-bold text-white">
                      {profile.name ? 
                        profile.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase() : 
                        'U'
                      }
                    </span>
                    </div>
                  
                  {editPhoto ? (
                    <div className="absolute -bottom-2 -right-2">
                      <button
                        onClick={() => setEditPhoto(false)}
                        className="bg-gradient-to-r from-rose-500 to-red-500 text-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="absolute -bottom-2 -right-2">
                      <button
                        onClick={() => setEditPhoto(true)}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
                        title="Edit Photo"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {editPhoto && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-700 dark:to-blue-900 rounded-xl">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                        placeholder="Enter photo URL"
                        className="input flex-1"
                      />
                      <button
                        onClick={handlePhotoUpdate}
                        className="btn btn-success flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                    <p className="text-xs text-muted mt-2">
                      Enter a valid image URL (e.g., https://example.com/photo.jpg)
                    </p>
                  </div>
                )}

                <h2 className="heading-2 mt-4">{profile.name}</h2>
                <p className="text-gradient-primary font-medium">{profile.title || "Employee"}</p>
                <p className="text-muted">{profile.department || "Department not specified"}</p>
              </div>

              <div className="card-footer">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-muted">
                    <Mail className="w-4 h-4" />
                    <span className="text-sm">{profile.email}</span>
                  </div>
                  {profile.phone && (
                    <div className="flex items-center gap-3 text-muted">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{profile.phone}</span>
                    </div>
                  )}
                  {profile.location && (
                    <div className="flex items-center gap-3 text-muted">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{profile.location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Card */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h3 className="heading-3">Employee Details</h3>
              </div>

              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Full Name</label>
                      <div className="text-body font-medium">
                        {profile.name}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Email Address</label>
                      <div className="text-body">
                        {profile.email}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Job Title</label>
                      <div className="text-body">
                        {profile.title || "Not specified"}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Department</label>
                      <div className="text-body">
                        {profile.department || "Not specified"}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Employee ID</label>
                      <div className="text-body font-mono">
                        {profile.employeeId || profile.id || "Not specified"}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Status</label>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${
                          profile.status === 'active' 
                            ? 'badge-success' : 'badge-warning'
                        }`}>
                          {profile.status || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Employee Type</label>
                      <div className="text-body">
                        {profile.type || "Not specified"}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Phone Number</label>
                      <div className="text-body">
                        {profile.phone || "Not specified"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="heading-4 mb-4">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">Date of Birth</label>
                      <div className="flex items-center gap-2 text-body">
                        <Calendar className="w-4 h-4" />
                        {formatDate(profile.dob || "")}
                      </div>
                    </div>

                    <div>
                      <label className="form-label">Joining Date</label>
                      <div className="flex items-center gap-2 text-body">
                        <Building className="w-4 h-4" />
                        {formatDate(profile.joiningDate || "")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 