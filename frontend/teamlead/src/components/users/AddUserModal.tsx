import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, UserStatus } from '../../types/user';
import { X, UserPlus, AlertCircle, Eye, EyeOff, CheckCircle2, Copy, Check, Mail, ExternalLink, ArrowRight } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSuccess }) => {
  if (!isOpen) return null;

  const navigate = useNavigate();
  const { addUser } = useAuth();

  const [step, setStep] = useState<'form' | 'success'>('form');

  // Form Fields
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [role] = useState<UserRole>('employee');
  const [status, setStatus] = useState<UserStatus>('Active');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [globalError, setGlobalError] = useState('');

  // Created Employee info for Success step
  const [createdEmployee, setCreatedEmployee] = useState<{
    name: string;
    email: string;
    department: string;
    role: string;
    invitationLink: string;
  } | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const validatePassword = (passStr: string) => {
    if (passStr.length < 8) return 'Password must be at least 8 characters long.';
    if (!/[A-Z]/.test(passStr)) return 'Password must contain at least one uppercase letter (A-Z).';
    if (!/[a-z]/.test(passStr)) return 'Password must contain at least one lowercase letter (a-z).';
    if (!/[0-9]/.test(passStr)) return 'Password must contain at least one number (0-9).';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGlobalError('');

    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Employee Name is required.';
    if (!employeeId.trim()) newErrors.employeeId = 'Employee ID is required.';
    if (!email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!validateEmail(email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. user@company.com).';
    }
    if (!department.trim()) newErrors.department = 'Department is required.';

    if (phone && phone.trim().length > 0 && phone.trim().length !== 10) {
      newErrors.phone = 'Phone number must be exactly 10 digits.';
    }

    // Password Validation
    if (!password) {
      newErrors.password = 'Password is required.';
    } else {
      const passErr = validatePassword(password);
      if (passErr) newErrors.password = passErr;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Password and Confirm Password must match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Add user to Supabase with verification token and custom password
    const inviteToken = `inv-${Math.random().toString(36).substring(2, 10)}`;
    const result: any = await addUser({
      id: employeeId.trim(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      department: department.trim(),
      role: 'employee',
      status: 'Pending Invitation',
      invite_token: inviteToken,
      password: password.trim(),
    } as any);

    if (!result.success) {
      setGlobalError(result.error || 'Failed to add employee.');
      return;
    }

    if (onSuccess) {
      onSuccess(`Employee ${name.trim()} (${employeeId.trim()}) added successfully.`);
    }

    const realInviteLink = `http://localhost:4173/signin?email=${encodeURIComponent(email.trim())}`;

    // Set Created Employee details for Step 2
    setCreatedEmployee({
      name: name.trim(),
      email: email.trim(),
      department: department.trim(),
      role: 'Employee',
      invitationLink: realInviteLink,
    });

    // Move to Success Step
    setStep('success');
  };

  const handleCopyLink = () => {
    if (!createdEmployee) return;
    navigator.clipboard.writeText(createdEmployee.invitationLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleResetForm = () => {
    setName('');
    setEmployeeId('');
    setEmail('');
    setPhone('');
    setDepartment('');
    setPassword('');
    setConfirmPassword('');
    setStatus('Active');
    setErrors({});
    setGlobalError('');
    setCreatedEmployee(null);
    setCopiedLink(false);
    setStep('form');
  };

  const handleViewEmployeeList = () => {
    onClose();
    navigate('/teamlead/employees');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col my-8 animate-in zoom-in-95 duration-150">
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-600 font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Add New Employee</h2>
                  <p className="text-xs text-slate-500">Create an employee account for system access</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Global Duplicate / Error Alert */}
            {globalError && (
              <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {globalError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Employee Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Employee Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Kumar"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 ${
                      errors.name ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                    }`}
                  />
                  {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
                </div>

                {/* Employee ID */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Employee ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    placeholder="e.g. EMP008"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 font-mono ${
                      errors.employeeId ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                    }`}
                  />
                  {errors.employeeId && <p className="text-[10px] text-rose-500 mt-1">{errors.employeeId}</p>}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="rahul.kumar@company.com"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 ${
                      errors.email ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                    }`}
                  />
                  {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email}</p>}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    maxLength={10}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 ${
                      errors.phone ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                    }`}
                  />
                  {errors.phone && <p className="text-[10px] text-rose-500 mt-1">{errors.phone}</p>}
                </div>

                {/* Department */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="IT Support, DevOps, Engineering..."
                    className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 ${
                      errors.department ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                    }`}
                  />
                  {errors.department && <p className="text-[10px] text-rose-500 mt-1">{errors.department}</p>}
                </div>

                {/* System Role (Fixed to Employee) */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    System Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={role}
                    disabled
                    className="w-full px-3 py-2 text-xs bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-not-allowed"
                  >
                    <option value="employee">Employee</option>
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars (A-Z, a-z, 0-9)"
                      className={`w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 ${
                        errors.password ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-rose-500 mt-1">{errors.password}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className={`w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white text-slate-800 ${
                        errors.confirmPassword ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-sky-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-[10px] text-rose-500 mt-1">{errors.confirmPassword}</p>}
                </div>

                {/* Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 focus:bg-white text-slate-800 font-medium"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all duration-200 cursor-pointer hover:shadow-lg"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Employee
                </button>
              </div>
            </form>
          </>
        ) : (
          /* Step 2: Employee Successfully Created Screen */
          <div className="p-8 flex flex-col items-center text-center animate-in fade-in duration-200">
            {/* Green Checkmark Badge */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
              ✓ Employee Successfully Created!
            </h2>
            <p className="text-xs text-slate-600 mb-6">
              Account created for <span className="font-bold text-slate-900">{createdEmployee?.name}</span> ({createdEmployee?.role}) in <span className="font-semibold text-slate-800">{createdEmployee?.department}</span>.
            </p>

            {/* Invitation Link Box */}
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6 text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Share Invitation Link
                </span>
                {copiedLink && (
                  <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-in fade-in duration-150">
                    Invitation link copied!
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={createdEmployee?.invitationLink}
                  className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all duration-200 cursor-pointer hover:shadow-md shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => createdEmployee && window.open(createdEmployee.invitationLink, '_blank')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-all duration-200 cursor-pointer hover:shadow-md shrink-0"
                  title="Open employee portal login page"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Portal</span>
                </button>
              </div>

              {/* Email Status Indicator */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1.5 text-slate-500">
                  <Mail className="w-3.5 h-3.5 text-sky-600" />
                  <span>Login credentials & link sent to: <strong className="text-slate-800">{createdEmployee?.email}</strong></span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold tracking-wide">
                  Email Sent
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 w-full">
              <button
                type="button"
                onClick={handleResetForm}
                className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <UserPlus className="w-4 h-4 text-sky-600" />
                <span>Add Another User</span>
              </button>
              <button
                type="button"
                onClick={handleViewEmployeeList}
                className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-sky-600/20 transition-all duration-200 cursor-pointer hover:shadow-lg flex items-center justify-center space-x-1.5"
              >
                <span>View Employee List</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
