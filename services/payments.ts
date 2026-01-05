import { supabase } from './supabase';
import { createPaymentIntent as createStripePaymentIntent, formatAmount } from './stripe';

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  job_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_intent_id?: string;
  payment_method?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Invoice {
  id: string;
  job_id: string;
  invoice_number: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  issued_at: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export const paymentService = {
  createPaymentIntent: async (
    jobId: string,
    amount: number,
    description?: string
  ): Promise<{ success: boolean; clientSecret?: string; error?: string }> => {
    try {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('job_number, customer_id')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      const paymentIntent = await createStripePaymentIntent(jobId, amount, 'usd', {
        job_number: job.job_number,
        description: description || `Payment for job ${job.job_number}`,
      });

      if (!paymentIntent) {
        throw new Error('Failed to create payment intent');
      }

      const { error: dbError } = await supabase.from('payments').insert({
        job_id: jobId,
        amount,
        currency: 'usd',
        status: 'pending',
        payment_intent_id: paymentIntent.id,
      });

      if (dbError) {
        console.error('Failed to record payment in database:', dbError);
      }

      return {
        success: true,
        clientSecret: paymentIntent.clientSecret,
      };
    } catch (error) {
      console.error('Payment intent creation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment creation failed',
      };
    }
  },

  updatePaymentStatus: async (
    paymentIntentId: string,
    status: PaymentStatus,
    paymentMethod?: string
  ): Promise<boolean> => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'completed') {
        updateData.paid_at = new Date().toISOString();
      }

      if (paymentMethod) {
        updateData.payment_method = paymentMethod;
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('payment_intent_id', paymentIntentId);

      return !error;
    } catch (error) {
      console.error('Failed to update payment status:', error);
      return false;
    }
  },

  getPaymentsByJobId: async (jobId: string): Promise<Payment[]> => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      return [];
    }
  },

  getTotalPaidForJob: async (jobId: string): Promise<number> => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('job_id', jobId)
        .eq('status', 'completed');

      if (error) throw error;

      return data?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
    } catch (error) {
      console.error('Failed to calculate total paid:', error);
      return 0;
    }
  },

  createInvoice: async (
    jobId: string,
    amount: number,
    tax: number,
    dueDate: string
  ): Promise<Invoice | null> => {
    try {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('job_number')
        .eq('id', jobId)
        .single();

      if (jobError || !job) {
        throw new Error('Job not found');
      }

      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');

      const { data: existingInvoices } = await supabase
        .from('invoices')
        .select('invoice_number')
        .like('invoice_number', `INV-${year}${month}-%`)
        .order('created_at', { ascending: false })
        .limit(1);

      let sequence = 1;
      if (existingInvoices && existingInvoices.length > 0) {
        const lastInvoiceNumber = existingInvoices[0].invoice_number;
        const lastSequence = parseInt(lastInvoiceNumber.split('-')[2], 10);
        sequence = lastSequence + 1;
      }

      const invoiceNumber = `INV-${year}${month}-${String(sequence).padStart(4, '0')}`;

      const { data, error } = await supabase
        .from('invoices')
        .insert({
          job_id: jobId,
          invoice_number: invoiceNumber,
          amount,
          tax,
          total: amount + tax,
          status: 'draft',
          due_date: dueDate,
          issued_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to create invoice:', error);
      return null;
    }
  },

  getInvoicesByJobId: async (jobId: string): Promise<Invoice[]> => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
      return [];
    }
  },

  markInvoiceAsPaid: async (invoiceId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      return !error;
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
      return false;
    }
  },

  formatPaymentAmount: (amountInCents: number): string => {
    return formatAmount(amountInCents);
  },
};
