import React, { useEffect, useState, useRef } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import toast from "react-hot-toast";

// Type definitions
interface PayslipData {
  gross: number;
  adjusted: number;
  extraPay: number;
  pf: number;
  proTax: number;
  incomeTax: number;
  penalty: number;
  deductions: number;
  net: number;
  stdHrs: number;
  totalHrs: number;
  extraHrs: number;
  presentDays: number;
  absentDays: number;
  leavesTaken: number;
  totalWorkingDays: number;
  totalWorkedHours: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  month: string;
  notes: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  panNumber: string;
  esicNumber: string;
  uan: string;
  createdAt: string;
  payslipHTML?: string;
}

const EmployeePayslipViewer = () => {
  const [month, setMonth] = useState("");
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmployeeId, setUserEmployeeId] = useState("");
  const [availablePayslips, setAvailablePayslips] = useState<string[]>([]);
  const payslipRef = useRef<HTMLDivElement>(null);

  const fetchPayslip = async (uid: string, selectedMonth: string) => {
    setLoading(true);
    try {
      console.log("🔍 Fetching payslip for user:", uid, "month:", selectedMonth);

      // First, get the user's employee ID from their profile
      const userDocRef = doc(db, "employees", uid);
      const userSnap = await getDoc(userDocRef);

      let employeeId = uid; // fallback to uid
      if (userSnap.exists()) {
        const userData = userSnap.data();
        employeeId = userData.employeeId || uid;
        setUserEmployeeId(employeeId);
        console.log("✅ Found employee data, employeeId:", employeeId);
      } else {
        console.log("⚠️ No employee document found, using uid as employeeId:", employeeId);
      }

      // Fetch payslip data using employee ID
      const payslipDocId = `${employeeId}_${selectedMonth}`;
      console.log("🔎 Looking for payslip document:", payslipDocId);

      // First try direct document lookup
      const docRef = doc(db, "salaryDetails", payslipDocId);
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data() as PayslipData;
        console.log("✅ Payslip found successfully by ID:", data);
        setPayslipData(data);
        toast.success("Payslip loaded successfully!");
        return;
      }

      // If not found by ID, try querying by employeeId and month fields
      console.log("🔎 Trying to find payslip by query...");
      const salaryDetailsRef = collection(db, "salaryDetails");
      const q = query(
        salaryDetailsRef, 
        where("employeeId", "==", employeeId),
        where("month", "==", selectedMonth)
      );
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        // Use the first matching document
        const data = querySnap.docs[0].data() as PayslipData;
        console.log("✅ Payslip found successfully by query:", data);
        setPayslipData(data);
        toast.success("Payslip loaded successfully!");
      } else {
        console.log("❌ No payslip document found for:", payslipDocId);
        setPayslipData(null);
        toast.error(`No payslip found for ${selectedMonth}. Please contact HR if this is an error.`);
      }
    } catch (err) {
      console.error("❌ Error fetching payslip:", err);
      toast.error("Error fetching payslip. Please try again.");
      setPayslipData(null);
    }
    setLoading(false);
  };

  const fetchAvailablePayslips = async (employeeId: string) => {
    try {
      console.log("🔍 Fetching available payslips for employee:", employeeId);

      // Get all salary details documents for this employee
      const salaryDetailsRef = collection(db, "salaryDetails");
      
      // First try with employeeId field
      const q1 = query(salaryDetailsRef, where("employeeId", "==", employeeId));
      const snapshot1 = await getDocs(q1);
      
      // Also try with document ID pattern matching
      const q2 = query(salaryDetailsRef);
      const snapshot2 = await getDocs(q2);
      
      // Combine results from both queries
      const allDocs = [...snapshot1.docs];
      
      // Add docs that match the pattern employeeId_YYYY-MM but weren't in the first query
      snapshot2.docs.forEach(doc => {
        const docId = doc.id;
        if (docId.startsWith(`${employeeId}_`) && !allDocs.some(d => d.id === docId)) {
          allDocs.push(doc);
        }
      });
      
      const months = allDocs.map(doc => {
        const data = doc.data();
        // If month field exists in the document, use it
        if (data.month) {
          return data.month;
        }
        // Otherwise try to extract from document ID (format: employeeId_YYYY-MM)
        const docId = doc.id;
        const parts = docId.split('_');
        if (parts.length === 2 && parts[1].match(/^\d{4}-\d{2}$/)) {
          return parts[1];
        }
        return null;
      }).filter(Boolean) // Remove null/undefined values
        .filter((month, index, array) => array.indexOf(month) === index) // Remove duplicates
        .sort().reverse(); // Sort latest first

      console.log("✅ Found payslips for months:", months);
      setAvailablePayslips(months);

      // If no month is selected and payslips exist, select the latest month
      if (!month && months.length > 0) {
        setMonth(months[0]);
      }
    } catch (error) {
      console.error("❌ Error fetching available payslips:", error);
    }
  };

  const downloadPDF = async () => {
    if (!payslipRef.current) {
      toast.error("No payslip to download");
      return;
    }
    
    try {
      toast.loading("Generating PDF...");
      const canvas = await html2canvas(payslipRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff"
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      const imgWidth = 190;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 10;
      
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `payslip_${payslipData?.name?.replace(/\s+/g, '_')}_${month}.pdf`;
      pdf.save(fileName);
      toast.dismiss();
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast.dismiss();
      toast.error("Failed to download PDF. Please try again.");
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);

        // Get employee ID first
        try {
          const userDocRef = doc(db, "employees", user.uid);
          const userSnap = await getDoc(userDocRef);

          let employeeId = user.uid;
          if (userSnap.exists()) {
            const userData = userSnap.data();
            employeeId = userData.employeeId || user.uid;
            setUserEmployeeId(employeeId);
          }

          // Fetch available payslips for this employee
          await fetchAvailablePayslips(employeeId);

          // If month is selected, fetch that payslip
          if (month) {
            fetchPayslip(user.uid, month);
          }
        } catch (error) {
          console.error("Error getting employee info:", error);
        }
      }
    });
    return () => unsubscribe();
  }, [month]);

  return (
    <div className="max-w-6xl mx-auto p-4 transition-colors duration-500 dark:bg-gray-900 dark:text-white bg-gradient-to-br from-blue-50 to-indigo-100 text-black min-h-screen">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
        <h2 className="text-center text-2xl font-bold mb-6 text-blue-700 dark:text-blue-300 transition-all duration-300">
          📄 My Payslip
        </h2>
        
        <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
          <img src="/logo.jpg" alt="Company Logo" className="h-16 rounded-lg" />
          <div className="text-right">
            <p className="text-lg font-semibold">Enkonix Software Services Pvt Ltd</p>
            <p className="text-sm opacity-90">Bangalore, Novel Office</p>
            <p className="text-sm opacity-90">hr@enkonix.in</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Select Month</label>
            <input
              type="month"
              className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              className={`w-full transition-all duration-300 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 ${
                loading 
                  ? 'bg-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
              onClick={() => userId && month && fetchPayslip(userId, month)}
              disabled={loading || !month}
            >
              {loading ? '⏳ Loading...' : '🔍 View Payslip'}
            </button>
          </div>
        </div>

        {/* Available Payslips */}
        {availablePayslips.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
              📋 Available Payslips ({availablePayslips.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {availablePayslips.map((availableMonth, index) => (
                <button
                  key={`payslip-${availableMonth}-${index}`}
                  onClick={() => setMonth(availableMonth)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                    month === availableMonth
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-700'
                  }`}
                >
                  {new Date(availableMonth + "-01").toLocaleString("default", {
                    month: "short",
                    year: "numeric"
                  })}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No Payslips Message */}
        {availablePayslips.length === 0 && userEmployeeId && (
          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="text-yellow-800 dark:text-yellow-200">
              <p className="text-sm font-medium">📄 No payslips found</p>
              <p className="text-xs mt-1">
                Employee ID: <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">{userEmployeeId}</code>
              </p>
              <p className="text-xs mt-1">
                Contact HR if you believe payslips should be available for your account.
              </p>
            </div>
          </div>
        )}
      </div>

      {payslipData && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Payslip Preview</h3>
            <div className="flex gap-2">
              
            </div>
          </div>

          <div
            ref={payslipRef}
            className="relative bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-lg shadow-lg overflow-hidden"
          >
            {/* Background watermark */}
            <div
              className="absolute inset-0 z-0 pointer-events-none opacity-5"
              style={{
                backgroundImage: 'url("/logo.jpg")',
                backgroundRepeat: "repeat",
                backgroundSize: "100px",
                transform: "rotate(-45deg)",
                transformOrigin: "center",
              }}
            ></div>

            {/* Payslip content */}
            <div className="relative z-10">
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src="/logo.jpg"
                      alt="Enkonix Logo"
                      className="h-12 w-auto rounded"
                    />
                    <div>
                      <h1 className="text-xl font-bold">ENKONIX SOFTWARE SERVICES PVT LTD</h1>
                      <p className="text-sm opacity-90">Bangalore, Novel Office</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">hr@enkonix.in</p>
                  </div>
                </div>
              </div>

              {/* Payslip Title */}
              <div className="bg-gray-100 dark:bg-gray-700 border-b-2 border-gray-300 dark:border-gray-600 text-center py-3">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  Payslip For {new Date(month + "-01")
                    .toLocaleString("default", { month: "long", year: "numeric" })
                    .toUpperCase()}
                </h2>
              </div>

              {/* Employee Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 border-b-2 border-gray-300 dark:border-gray-600">
                <div className="border-r-2 border-gray-300 dark:border-gray-600">
                  {[
                    ["Personnel No.", payslipData.employeeId],
                    ["Bank", payslipData.bankName],
                    ["DOJ", "-"],
                    ["PF No.", payslipData.uan || "-"],
                    ["Location", "-"],
                    ["Department", payslipData.department || "-"],
                  ].map(([label, value]) => (
                    <div className="grid grid-cols-2 border-b border-gray-200 dark:border-gray-600" key={label}>
                      <div className="bg-blue-50 dark:bg-blue-900 font-semibold p-3 border-r border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white">
                        {label}
                      </div>
                      <div className="p-3 text-gray-800 dark:text-white">
                        {value || "-"}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  {[
                    ["Name", payslipData.name],
                    ["Bank A/c No.", payslipData.accountNumber],
                    ["LOP Days", payslipData.absentDays > 0 ? payslipData.absentDays - 1 : 0],
                    ["Scheduled Work Days", payslipData.totalWorkingDays],
                    ["Worked Days", payslipData.presentDays + 1],
                    ["Designation", payslipData.department || "-"],
                  ].map(([label, value]) => (
                    <div className="grid grid-cols-2 border-b border-gray-200 dark:border-gray-600" key={label}>
                      <div className="bg-blue-50 dark:bg-blue-900 font-semibold p-3 border-r border-gray-200 dark:border-gray-600 text-gray-800 dark:text-white">
                        {label}
                      </div>
                      <div className="p-3 text-gray-800 dark:text-white">
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Earnings & Deductions */}
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Earnings */}
                <div className="border-r-2 border-gray-300 dark:border-gray-600">
                  <div className="bg-green-100 dark:bg-green-900 border-b-2 border-gray-300 dark:border-gray-600 p-3">
                    <h3 className="font-bold text-green-800 dark:text-green-200 text-center">Earnings</h3>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-600">
                    <div className="grid grid-cols-2 p-3 text-gray-800 dark:text-white">
                      <div className="font-medium">BASIC</div>
                      <div className="text-right font-semibold">
                        ₹{(payslipData?.gross ? Math.round(payslipData.gross * 0.7) : 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-gray-800 dark:text-white">
                      <div className="font-medium">HOUSE RENT ALLOWANCE</div>
                      <div className="text-right font-semibold">
                        ₹{(payslipData?.gross ? Math.round(payslipData.gross * 0.2) : 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-gray-800 dark:text-white">
                      <div className="font-medium">SPECIAL ALLOWANCE</div>
                      <div className="text-right font-semibold">
                        ₹{(payslipData?.gross ? Math.round(payslipData.gross * 0.1) : 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-gray-800 dark:text-white">
                      <div className="font-medium">HOT SKILL BONUS</div>
                      <div className="text-right font-semibold">
                        ₹{(payslipData?.gross ? Math.round(payslipData.gross * 0.0) : 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 p-3 bg-green-50 dark:bg-green-900 font-bold text-gray-800 dark:text-white">
                      <div>GROSS EARNING</div>
                      <div className="text-right text-green-700 dark:text-green-300">
                        ₹{(payslipData?.gross || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <div className="bg-red-100 dark:bg-red-900 border-b-2 border-gray-300 dark:border-gray-600 p-3">
                    <h3 className="font-bold text-red-800 dark:text-red-200 text-center">Deductions</h3>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-600">
                    <div className="grid grid-cols-2 p-3 text-gray-800 dark:text-white">
                      <div className="font-medium">PROVIDENT FUND</div>
                      <div className="text-right font-semibold">
                        ₹{(payslipData?.pf || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-gray-800 dark:text-white">
                      <div className="font-medium">PROFESSIONAL TAX</div>
                      <div className="text-right font-semibold">
                        ₹{(payslipData?.proTax || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 p-3 text-gray-800 dark:text-white">
                      <div className="font-medium">INCOME TAX</div>
                      <div className="text-right font-semibold">
                        ₹{(payslipData?.incomeTax || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                    {payslipData?.penalty > 0 && (
                      <div className="grid grid-cols-2 p-3 text-gray-800 dark:text-white">
                        <div className="font-medium">PENALTY</div>
                        <div className="text-right font-semibold">
                          ₹{(payslipData?.penalty || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 p-3 bg-red-50 dark:bg-red-900 font-bold text-gray-800 dark:text-white">
                      <div>GROSS DEDUCTIONS</div>
                      <div className="text-right text-red-700 dark:text-red-300">
                        ₹{(payslipData?.deductions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 text-center">
                <div className="text-2xl font-bold">
                  NET PAY ₹{(payslipData?.net || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
              </div>

              {/* Notes */}
              {payslipData?.notes && (
                <div className="bg-yellow-50 dark:bg-yellow-900 p-4 border-b-2 border-gray-300 dark:border-gray-600">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Notes:</h4>
                  <p className="text-yellow-700 dark:text-yellow-300 text-sm">{payslipData.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 text-center">
                <p className="text-sm italic text-gray-600 dark:text-gray-300">
                  ** This is a computer generated payslip and does not require signature and stamp.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !payslipData && month && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 text-center">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-lg mb-2">📄 No payslip found</p>
            <p>No payslip was found for the selected month. Please contact HR if you believe this is an error.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeePayslipViewer;
