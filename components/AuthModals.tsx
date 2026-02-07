import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Eye, EyeOff, Mail, Lock, User, Phone, CircleAlert as AlertCircle, CheckCircle, Briefcase, Users } from 'lucide-react-native';
import { authService } from '@/services/auth';
import { scrollUtils } from '@/utils/scrollUtils';

type AuthFlow = 'customer' | 'employee';

interface AuthModalsProps {
  visible: boolean;
  mode: 'signin' | 'signup';
  onClose: () => void;
  onSuccess: () => void;
  onSwitchMode: (mode: 'signin' | 'signup') => void;
}

export const AuthModals: React.FC<AuthModalsProps> = ({
  visible,
  mode,
  onClose,
  onSuccess,
  onSwitchMode,
}) => {
  const [authFlow, setAuthFlow] = useState<AuthFlow>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showThankYou, setShowThankYou] = useState(false);
  const [showEmailBanner, setShowEmailBanner] = useState(false);
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');

  React.useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible, mode]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowThankYou(false);
    setShowEmailBanner(false);
    setResetPasswordSuccess(false);
    setResetPasswordError('');
  };

  const switchFlow = (flow: AuthFlow) => {
    resetForm();
    setAuthFlow(flow);
    if (flow === 'employee') {
      onSwitchMode('signin');
    }
  };

  const validateEmail = (value: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const validatePassword = (value: string): boolean => {
    return value.length >= 6;
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(password)) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    const isSignUp = (authFlow === 'customer' && mode === 'signup') ||
                     (authFlow === 'employee' && mode === 'signup');

    if (isSignUp) {
      if (!firstName) newErrors.firstName = 'First name is required';
      if (!lastName) newErrors.lastName = 'Last name is required';
      if (!phone) newErrors.phone = 'Phone number is required';
      if (!confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const isSignUp = (authFlow === 'customer' && mode === 'signup') ||
                       (authFlow === 'employee' && mode === 'signup');

      if (isSignUp) {
        await authService.signUp(email, password, firstName, lastName, phone);
        setShowEmailBanner(true);
        setTimeout(() => {
          setShowEmailBanner(false);
          setShowThankYou(true);
          setTimeout(() => {
            setShowThankYou(false);
            onSuccess();
          }, 2000);
        }, 10000);
      } else {
        await authService.signIn(email, password);
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            window.scrollTo?.({ top: 0, behavior: 'smooth' });
          }
        }, 100);
        onSuccess();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      if (errorMessage.includes('Invalid login credentials')) {
        setErrors({ general: 'Invalid email or password. Please try again.' });
      } else if (errorMessage.includes('User already registered')) {
        setErrors({ email: 'An account with this email already exists' });
      } else if (errorMessage.includes('Password should be at least 6 characters')) {
        setErrors({ password: 'Password must be at least 6 characters' });
      } else {
        setErrors({ general: errorMessage });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setResetPasswordSuccess(false);
    setResetPasswordError('');

    if (!email) {
      setResetPasswordError('Please enter your email address first.');
      return;
    }
    if (!validateEmail(email)) {
      setResetPasswordError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(email);
      setResetPasswordSuccess(true);
      setTimeout(() => setResetPasswordSuccess(false), 8000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send reset email';
      setResetPasswordError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isSignUp = (authFlow === 'customer' && mode === 'signup') ||
                   (authFlow === 'employee' && mode === 'signup');

  const getTitle = () => {
    if (authFlow === 'employee') {
      return mode === 'signup' ? 'Employee Registration' : 'Employee Sign In';
    }
    return mode === 'signup' ? 'Create Account' : 'Welcome Back';
  };

  const getSubtitle = () => {
    if (authFlow === 'employee') {
      return mode === 'signup'
        ? 'Register your employee account for IN&OUT Moving'
        : 'Sign in with your company credentials';
    }
    return mode === 'signup'
      ? 'Join IN&OUT Moving for seamless relocation services'
      : 'Sign in to manage your moves and track progress';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {showEmailBanner && (
          <View style={styles.emailBanner}>
            <Text style={styles.emailBannerTitle}>Check Your Email!</Text>
            <Text style={styles.emailBannerText}>
              We've sent a verification link to {email}. Please check your email and click the link to verify your account.
            </Text>
          </View>
        )}

        {showThankYou ? (
          <View style={styles.thankYouContainer}>
            <View style={styles.thankYouContent}>
              <Text style={styles.thankYouTitle}>Thank You!</Text>
              <Text style={styles.thankYouMessage}>
                Thank you, {firstName}, for completing the form. Please check your email to verify your account.
              </Text>
              <Text style={styles.thankYouSubtext}>
                Redirecting you to sign in...
              </Text>
            </View>
          </View>
        ) : (
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.scrollInner}>
            <View style={styles.header}>
              <Text style={styles.title}>{getTitle()}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.subtitle}>{getSubtitle()}</Text>

            <View style={styles.flowToggle}>
              <TouchableOpacity
                style={[styles.flowButton, authFlow === 'customer' && styles.flowButtonActive]}
                onPress={() => switchFlow('customer')}
              >
                <Users size={18} color={authFlow === 'customer' ? '#ffffff' : '#64748b'} />
                <Text style={[styles.flowButtonText, authFlow === 'customer' && styles.flowButtonTextActive]}>
                  Customer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.flowButton, authFlow === 'employee' && styles.flowButtonActive]}
                onPress={() => switchFlow('employee')}
              >
                <Briefcase size={18} color={authFlow === 'employee' ? '#ffffff' : '#64748b'} />
                <Text style={[styles.flowButtonText, authFlow === 'employee' && styles.flowButtonTextActive]}>
                  Team Member
                </Text>
              </TouchableOpacity>
            </View>

            {errors.general && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#dc2626" />
                <Text style={styles.errorText}>{errors.general}</Text>
              </View>
            )}

            {resetPasswordSuccess && (
              <View style={styles.successContainer}>
                <CheckCircle size={16} color="#059669" />
                <Text style={styles.successText}>
                  Password reset link sent! Check your email for instructions.
                </Text>
              </View>
            )}

            {resetPasswordError && (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#dc2626" />
                <Text style={styles.errorText}>{resetPasswordError}</Text>
              </View>
            )}

            <View style={styles.form}>
              {isSignUp && (
                <>
                  <View style={styles.nameRow}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.inputLabel}>First Name *</Text>
                      <View style={styles.inputContainer}>
                        <User size={20} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, styles.inputWithIcon]}
                          value={firstName}
                          onChangeText={setFirstName}
                          placeholder="John"
                          placeholderTextColor="#94a3b8"
                          autoCapitalize="words"
                        />
                      </View>
                      {errors.firstName && <Text style={styles.fieldError}>{errors.firstName}</Text>}
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.inputLabel}>Last Name *</Text>
                      <View style={styles.inputContainer}>
                        <User size={20} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                          style={[styles.input, styles.inputWithIcon]}
                          value={lastName}
                          onChangeText={setLastName}
                          placeholder="Doe"
                          placeholderTextColor="#94a3b8"
                          autoCapitalize="words"
                        />
                      </View>
                      {errors.lastName && <Text style={styles.fieldError}>{errors.lastName}</Text>}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Phone Number *</Text>
                    <View style={styles.inputContainer}>
                      <Phone size={20} color="#64748b" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+1 (555) 123-4567"
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                      />
                    </View>
                    {errors.phone && <Text style={styles.fieldError}>{errors.phone}</Text>}
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address *</Text>
                <View style={styles.inputContainer}>
                  <Mail size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder={authFlow === 'employee' ? 'you@inandoutmovin.com' : 'your@email.com'}
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>
                {errors.email && <Text style={styles.fieldError}>{errors.email}</Text>}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password *</Text>
                <View style={styles.inputContainer}>
                  <Lock size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#64748b" />
                    ) : (
                      <Eye size={20} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>
                {errors.password && <Text style={styles.fieldError}>{errors.password}</Text>}
              </View>

              {isSignUp && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password *</Text>
                  <View style={styles.inputContainer}>
                    <Lock size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, styles.inputWithIcon, styles.passwordInput]}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm your password"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={20} color="#64748b" />
                      ) : (
                        <Eye size={20} color="#64748b" />
                      )}
                    </TouchableOpacity>
                  </View>
                  {errors.confirmPassword && <Text style={styles.fieldError}>{errors.confirmPassword}</Text>}
                </View>
              )}

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading
                    ? 'Please wait...'
                    : isSignUp
                      ? (authFlow === 'employee' ? 'Register' : 'Create Account')
                      : 'Sign In'
                  }
                </Text>
              </TouchableOpacity>

              {mode === 'signin' && (
                <TouchableOpacity style={styles.forgotButton} onPress={handleForgotPassword}>
                  <Text style={styles.forgotButtonText}>Forgot Password?</Text>
                </TouchableOpacity>
              )}

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>
                  {mode === 'signup'
                    ? 'Already have an account? '
                    : "Don't have an account? "
                  }
                </Text>
                <TouchableOpacity
                  onPress={() => onSwitchMode(mode === 'signup' ? 'signin' : 'signup')}
                >
                  <Text style={styles.switchButtonText}>
                    {mode === 'signup' ? 'Sign In' : 'Sign Up'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  thankYouContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  thankYouContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    maxWidth: 400,
    width: '100%',
  },
  thankYouTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#059669',
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  thankYouMessage: {
    fontSize: 18,
    color: '#1e293b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
  },
  thankYouSubtext: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
  },
  scrollInner: {
    width: '100%',
    maxWidth: 480,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    fontFamily: 'Inter-Bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
    marginBottom: 24,
    lineHeight: 24,
  },
  flowToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  flowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  flowButtonActive: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  flowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    fontFamily: 'Inter-SemiBold',
  },
  flowButtonTextActive: {
    color: '#ffffff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
    flex: 1,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    fontSize: 14,
    color: '#059669',
    fontFamily: 'Inter-Medium',
    marginLeft: 8,
    flex: 1,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  nameRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    fontFamily: 'Inter-Regular',
    flex: 1,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  fieldError: {
    fontSize: 12,
    color: '#dc2626',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: 'Inter-SemiBold',
  },
  forgotButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  forgotButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontFamily: 'Inter-Medium',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  switchText: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'Inter-Regular',
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    fontFamily: 'Inter-SemiBold',
  },
  emailBanner: {
    backgroundColor: '#dbeafe',
    borderWidth: 1,
    borderColor: '#2563eb',
    padding: 16,
    margin: 20,
    borderRadius: 12,
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  emailBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  emailBannerText: {
    fontSize: 14,
    color: '#1e40af',
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
});
