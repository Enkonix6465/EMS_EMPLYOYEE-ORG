import React, { useState, useEffect } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, Download, Search, Calendar, Users } from 'lucide-react';

interface Employee {
  uid: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  ifscCode?: string;
  panNumber?: string;
  esicNumber?: string;
  uan?: string;
}

interface PayslipData {
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  month: string;
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
  notes: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  panNumber: string;
  esicNumber: string;
  uan: string;
  createdAt: string;
  updatedAt: string;
}

const AdminPayrollManagement = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [existingPayslips, setExistingPayslips] = useState<PayslipData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPayslip, setEditingPayslip] = useState<PayslipData | null>(null);
  
  const [formData, setFormData] = useState<Partial<PayslipData>>({
    gross: 0,
    adjusted: 0,
    extraPay: 0,
    pf: 0,
    proTax: 0,
    incomeTax: 0,
    penalty: 0,
    deductions: 0,
    net: 0,
    stdHrs: 8,
    totalHrs: 0,
    extraHrs: 0,
    presentDays: 0,
    absentDays: 0,
    leavesTaken: 0,
    totalWorkingDays: 22,
    totalWorkedHours: '0',
    notes: '',
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    ifscCode: '',
    panNumber: '',
    esicNumber: '',
    uan: ''
  });

  useEffect(() => {
    fetchEmployees();
    if (selectedMonth) {
      fetchExistingPayslips();
    }
  }, [selectedMonth]);

  useEffect(() => {
    // Calculate net pay automatically
    const totalDeductions = (formData.pf || 0) + (formData.proTax || 0) + (formData.incomeTax || 0) + (formData.penalty || 0);
    const netPay = (formData.adjusted || 0) + (formData.extraPay || 0) - totalDeductions;
    
    setFormData(prev => ({
      ...prev,
      deductions: totalDeductions,
      net: netPay
    }));
  }, [formData.adjusted, formData.extraPay, formData.pf, formData.proTax, formData.incomeTax, formData.penalty]);

  const fetchEmployees = async () => {
    try {
      const employeesSnapshot = await getDocs(collection(db, 'employees'));
      const employeesData = employeesSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as Employee[];
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast.error('Failed to load employees');
    }
  };

  const fetchExistingPayslips = async () => {
    if (!selectedMonth) return;
    
    setLoading(true);
    try {
      const payslips: PayslipData[] = [];
      
      // Fetch payslips for all employees for the selected month
      for (const employee of employees) {
        const payslipDoc = await getDoc(doc(db, 'salaryDetails', `${employee.employeeId}_${selectedMonth}`));
        if (payslipDoc.exists()) {
          payslips.push(payslipDoc.data() as PayslipData);
        }
      }
      
      setExistingPayslips(payslips);
    } catch (error) {
      console.error('Error fetching payslips:', error);
      toast.error('Failed to load existing payslips');
    }
    setLoading(false);
  };

  const openCreateForm = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditingPayslip(null);
    setFormData({
      ...formData,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      department: employee.department,
      month: selectedMonth,
      accountHolderName: employee.accountHolderName || '',
      accountNumber: employee.accountNumber || '',
      bankName: employee.bankName || '',
      ifscCode: employee.ifscCode || '',
      panNumber: employee.panNumber || '',
      esicNumber: employee.esicNumber || '',
      uan: employee.uan || ''
    });
    setShowForm(true);
  };

  const openEditForm = (payslip: PayslipData) => {
    setEditingPayslip(payslip);
    setSelectedEmployee(employees.find(emp => emp.employeeId === payslip.employeeId) || null);
    setFormData(payslip);
    setShowForm(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Days') || name.includes('Hrs') || name === 'totalWorkingDays' 
        ? parseInt(value) || 0 
        : ['gross', 'adjusted', 'extraPay', 'pf', 'proTax', 'incomeTax', 'penalty'].includes(name)
        ? parseFloat(value) || 0
        : value
    }));
  };

  const savePayslip = async () => {
    if (!selectedEmployee || !selectedMonth) {
      toast.error('Please select employee and month');
      return;
    }

    setLoading(true);
    try {
      const docId = `${selectedEmployee.employeeId}_${selectedMonth}`;
      const payslipData = {
        ...formData,
        employeeId: selectedEmployee.employeeId,
        name: selectedEmployee.name,
        email: selectedEmployee.email,
        phone: selectedEmployee.phone,
        department: selectedEmployee.department,
        month: selectedMonth,
        createdAt: editingPayslip?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'salaryDetails', docId), payslipData);
      
      toast.success(`Payslip ${editingPayslip ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
      fetchExistingPayslips();
    } catch (error) {
      console.error('Error saving payslip:', error);
      toast.error('Failed to save payslip');
    }
    setLoading(false);
  };

  const deletePayslip = async (employeeId: string) => {
    if (!selectedMonth) return;
    
    if (window.confirm('Are you sure you want to delete this payslip?')) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, 'salaryDetails', `${employeeId}_${selectedMonth}`));
        toast.success('Payslip deleted successfully!');
        fetchExistingPayslips();
      } catch (error) {
        console.error('Error deleting payslip:', error);
        toast.error('Failed to delete payslip');
      }
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const employeesWithPayslips = filteredEmployees.map(emp => ({
    ...emp,
    hasPayslip: existingPayslips.some(payslip => payslip.employeeId === emp.employeeId)
  }));

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 min-h-screen">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Payroll Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-600" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
        </div>

        {selectedMonth && (
          <>
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {existingPayslips.length} of {employees.length} payslips generated
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-blue-50 dark:bg-blue-900">
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold text-gray-800 dark:text-white">Employee ID</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold text-gray-800 dark:text-white">Name</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold text-gray-800 dark:text-white">Department</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold text-gray-800 dark:text-white">Status</th>
                    <th className="border border-gray-300 dark:border-gray-600 p-3 text-left font-semibold text-gray-800 dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesWithPayslips.map((employee) => (
                    <tr key={employee.uid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-800 dark:text-white">{employee.employeeId}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-800 dark:text-white">{employee.name}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3 text-gray-800 dark:text-white">{employee.department}</td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3">
                        {employee.hasPayslip ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Generated
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 p-3">
                        <div className="flex gap-2">
                          {employee.hasPayslip ? (
                            <>
                              <button
                                onClick={() => openEditForm(existingPayslips.find(p => p.employeeId === employee.employeeId)!)}
                                className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                                Edit
                              </button>
                              <button
                                onClick={() => deletePayslip(employee.employeeId)}
                                className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openCreateForm(employee)}
                              className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                            >
                              <Plus className="h-4 w-4" />
                              Create
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Payslip Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {editingPayslip ? 'Edit' : 'Create'} Payslip - {selectedEmployee?.name}
                </h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Employee Info */}
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Employee Information</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>ID:</strong> {selectedEmployee?.employeeId}</p>
                    <p><strong>Name:</strong> {selectedEmployee?.name}</p>
                    <p><strong>Department:</strong> {selectedEmployee?.department}</p>
                    <p><strong>Month:</strong> {selectedMonth}</p>
                  </div>
                </div>

                {/* Attendance & Hours */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Attendance & Hours</h3>
                  <input
                    type="number"
                    name="totalWorkingDays"
                    placeholder="Total Working Days"
                    value={formData.totalWorkingDays}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="number"
                    name="presentDays"
                    placeholder="Present Days"
                    value={formData.presentDays}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="number"
                    name="absentDays"
                    placeholder="Absent Days"
                    value={formData.absentDays}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="number"
                    name="leavesTaken"
                    placeholder="Leaves Taken"
                    value={formData.leavesTaken}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                </div>

                {/* Salary Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Salary Details</h3>
                  <input
                    type="number"
                    name="gross"
                    placeholder="Gross Salary"
                    value={formData.gross}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="number"
                    name="adjusted"
                    placeholder="Adjusted Salary"
                    value={formData.adjusted}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="number"
                    name="extraPay"
                    placeholder="Extra Pay"
                    value={formData.extraPay}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                </div>

                {/* Deductions */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Deductions</h3>
                  <input
                    type="number"
                    name="pf"
                    placeholder="Provident Fund"
                    value={formData.pf}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="number"
                    name="proTax"
                    placeholder="Professional Tax"
                    value={formData.proTax}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="number"
                    name="incomeTax"
                    placeholder="Income Tax"
                    value={formData.incomeTax}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="number"
                    name="penalty"
                    placeholder="Penalty"
                    value={formData.penalty}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                </div>

                {/* Bank Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800 dark:text-white">Bank Details</h3>
                  <input
                    type="text"
                    name="bankName"
                    placeholder="Bank Name"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="text"
                    name="accountNumber"
                    placeholder="Account Number"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                  <input
                    type="text"
                    name="ifscCode"
                    placeholder="IFSC Code"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                  />
                </div>

                {/* Summary */}
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">Summary</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Total Deductions:</strong> ₹{formData.deductions?.toLocaleString()}</p>
                    <p><strong>Net Pay:</strong> ₹{formData.net?.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Notes</h3>
                <textarea
                  name="notes"
                  placeholder="Additional notes or comments..."
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded"
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={savePayslip}
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-4 rounded transition-colors"
                >
                  {loading ? 'Saving...' : editingPayslip ? 'Update Payslip' : 'Create Payslip'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayrollManagement;
