import { supabase } from './supabase';
import { notificationService } from './notifications';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  preferredContactMethod: string;
  totalJobs: number;
  totalSpent: number;
  averageRating: number;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  customerId: string;
  jobNumber: string;
  serviceType: 'loading' | 'unloading' | 'loading_unloading';
  jobDate: string;
  timeSlot: string;
  crewSize: number;
  estimatedHours?: number;
  actualHours?: number;
  fromAddress?: string;
  toAddress?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  estimatedCost?: number;
  actualCost?: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  serviceProviderNotes?: string;
  customerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerReview {
  id: string;
  customerId: string;
  jobId: string;
  overallRating: number;
  communicationRating: number;
  professionalismRating: number;
  serviceRating: number;
  satisfactionRating: number;
  customerComments?: string;
  reviewDate: string;
  isFeatured: boolean;
  createdAt: string;
}

export interface CRMCustomerData extends Customer {
  jobs: Job[];
  reviews: CustomerReview[];
  latestJob?: Job;
  latestReview?: CustomerReview;
}

export const crmService = {
  // Create new customer from app data
  createCustomer: async (customerData: Omit<Customer, 'id' | 'totalJobs' | 'totalSpent' | 'averageRating' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          address: customerData.address,
          city: customerData.city,
          state: customerData.state,
          zip_code: customerData.zipCode,
          preferred_contact_method: customerData.preferredContactMethod,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create customer error:', error);
      throw error;
    }
  },

  // Create job from quote data
  createJob: async (jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>, sendConfirmation = true) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          customer_id: jobData.customerId,
          job_number: jobData.jobNumber,
          service_type: jobData.serviceType,
          job_date: jobData.jobDate,
          time_slot: jobData.timeSlot,
          crew_size: jobData.crewSize,
          estimated_hours: jobData.estimatedHours,
          from_address: jobData.fromAddress,
          to_address: jobData.toAddress,
          status: jobData.status,
          estimated_cost: jobData.estimatedCost,
          payment_status: jobData.paymentStatus,
          customer_notes: jobData.customerNotes,
        })
        .select()
        .single();

      if (error) throw error;

      // Send booking confirmation email if status is 'confirmed' or 'scheduled'
      if (sendConfirmation && data && (jobData.status === 'confirmed' || jobData.status === 'scheduled')) {
        try {
          await notificationService.notifyJobBooked(data.id, jobData.status);
        } catch (emailError) {
          console.error('Failed to send booking confirmation email:', emailError);
          // Don't throw - job creation should succeed even if email fails
        }
      }

      return data;
    } catch (error) {
      console.error('Create job error:', error);
      throw error;
    }
  },

  // Update job status and trigger notifications
  updateJobStatus: async (
    jobId: string,
    newStatus: 'lead' | 'quoted' | 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
    options: { sendConfirmation?: boolean } = { sendConfirmation: true }
  ) => {
    try {
      const { data: job, error } = await supabase
        .from('jobs')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .select()
        .single();

      if (error) throw error;

      // Send booking confirmation email if status changed to 'confirmed' or 'scheduled'
      if (options.sendConfirmation && (newStatus === 'confirmed' || newStatus === 'scheduled')) {
        try {
          await notificationService.notifyJobBooked(jobId, newStatus);
        } catch (emailError) {
          console.error('Failed to send booking confirmation email:', emailError);
          // Don't throw - status update should succeed even if email fails
        }
      }

      return job;
    } catch (error) {
      console.error('Update job status error:', error);
      throw error;
    }
  },

  // Submit customer review
  submitReview: async (reviewData: Omit<CustomerReview, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase
        .from('customer_reviews')
        .insert({
          customer_id: reviewData.customerId,
          job_id: reviewData.jobId,
          overall_rating: reviewData.overallRating,
          communication_rating: reviewData.communicationRating,
          professionalism_rating: reviewData.professionalismRating,
          service_rating: reviewData.serviceRating,
          satisfaction_rating: reviewData.satisfactionRating,
          customer_comments: reviewData.customerComments,
          review_date: reviewData.reviewDate,
          is_featured: reviewData.isFeatured,
        })
        .select()
        .single();

      if (error) throw error;

      // Update customer's average rating
      await crmService.updateCustomerRating(reviewData.customerId);

      return data;
    } catch (error) {
      console.error('Submit review error:', error);
      throw error;
    }
  },

  // Get all customers with their jobs and reviews
  getAllCustomers: async (): Promise<CRMCustomerData[]> => {
    try {
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select(`
          *,
          jobs (*),
          customer_reviews (*)
        `)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      return customers?.map(customer => ({
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        city: customer.city,
        state: customer.state,
        zipCode: customer.zip_code,
        preferredContactMethod: customer.preferred_contact_method,
        totalJobs: customer.total_jobs,
        totalSpent: customer.total_spent,
        averageRating: customer.average_rating,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
        jobs: customer.jobs?.map((job: any) => ({
          id: job.id,
          customerId: job.customer_id,
          jobNumber: job.job_number,
          serviceType: job.service_type,
          jobDate: job.job_date,
          timeSlot: job.time_slot,
          crewSize: job.crew_size,
          estimatedHours: job.estimated_hours,
          actualHours: job.actual_hours,
          fromAddress: job.from_address,
          toAddress: job.to_address,
          status: job.status,
          estimatedCost: job.estimated_cost,
          actualCost: job.actual_cost,
          paymentStatus: job.payment_status,
          serviceProviderNotes: job.service_provider_notes,
          customerNotes: job.customer_notes,
          createdAt: job.created_at,
          updatedAt: job.updated_at,
        })) || [],
        reviews: customer.customer_reviews?.map((review: any) => ({
          id: review.id,
          customerId: review.customer_id,
          jobId: review.job_id,
          overallRating: review.overall_rating,
          communicationRating: review.communication_rating,
          professionalismRating: review.professionalism_rating,
          serviceRating: review.service_rating,
          satisfactionRating: review.satisfaction_rating,
          customerComments: review.customer_comments,
          reviewDate: review.review_date,
          isFeatured: review.is_featured,
          createdAt: review.created_at,
        })) || [],
        latestJob: customer.jobs?.[0],
        latestReview: customer.customer_reviews?.[0],
      })) || [];
    } catch (error) {
      console.error('Get all customers error:', error);
      return [];
    }
  },

  // Get single customer with full details
  getCustomer: async (customerId: string): Promise<CRMCustomerData | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          jobs (*),
          customer_reviews (*)
        `)
        .eq('id', customerId)
        .single();

      if (error) throw error;

      if (!data) return null;

      return {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip_code,
        preferredContactMethod: data.preferred_contact_method,
        totalJobs: data.total_jobs,
        totalSpent: data.total_spent,
        averageRating: data.average_rating,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        jobs: data.jobs?.map((job: any) => ({
          id: job.id,
          customerId: job.customer_id,
          jobNumber: job.job_number,
          serviceType: job.service_type,
          jobDate: job.job_date,
          timeSlot: job.time_slot,
          crewSize: job.crew_size,
          estimatedHours: job.estimated_hours,
          actualHours: job.actual_hours,
          fromAddress: job.from_address,
          toAddress: job.to_address,
          status: job.status,
          estimatedCost: job.estimated_cost,
          actualCost: job.actual_cost,
          paymentStatus: job.payment_status,
          serviceProviderNotes: job.service_provider_notes,
          customerNotes: job.customer_notes,
          createdAt: job.created_at,
          updatedAt: job.updated_at,
        })) || [],
        reviews: data.customer_reviews?.map((review: any) => ({
          id: review.id,
          customerId: review.customer_id,
          jobId: review.job_id,
          overallRating: review.overall_rating,
          communicationRating: review.communication_rating,
          professionalismRating: review.professionalism_rating,
          serviceRating: review.service_rating,
          satisfactionRating: review.satisfaction_rating,
          customerComments: review.customer_comments,
          reviewDate: review.review_date,
          isFeatured: review.is_featured,
          createdAt: review.created_at,
        })) || [],
        latestJob: data.jobs?.[0],
        latestReview: data.customer_reviews?.[0],
      };
    } catch (error) {
      console.error('Get customer error:', error);
      return null;
    }
  },

  // Update customer rating based on reviews
  updateCustomerRating: async (customerId: string) => {
    try {
      const { data: reviews, error } = await supabase
        .from('customer_reviews')
        .select('overall_rating')
        .eq('customer_id', customerId);

      if (error) throw error;

      if (reviews && reviews.length > 0) {
        const averageRating = reviews.reduce((sum, review) => sum + review.overall_rating, 0) / reviews.length;
        
        await supabase
          .from('customers')
          .update({
            average_rating: Math.round(averageRating * 100) / 100,
            total_jobs: reviews.length,
            updated_at: new Date().toISOString(),
          })
          .eq('id', customerId);
      }
    } catch (error) {
      console.error('Update customer rating error:', error);
    }
  },

  // Generate job number
  generateJobNumber: () => {
    const prefix = 'JB-';
    const randomSuffix = Math.random().toString(36).substring(2, 10);
    return prefix + randomSuffix;
  },

  // Process quote form data into CRM
  processQuoteData: async (formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    fromAddress: string;
    toAddress: string;
    serviceType: 'loading' | 'unloading' | 'loading_unloading';
    moveDate: string;
    timeSlot: string;
    notes?: string;
  }) => {
    try {
      // Create or update customer
      let customer = await crmService.getCustomerByEmail(formData.email);
      
      if (!customer) {
        const customerData = await crmService.createCustomer({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          preferredContactMethod: 'email',
        });
        customer = customerData;
      }

      if (!customer) {
        throw new Error('Failed to create or find customer');
      }

      // Create job
      const jobData: Omit<Job, 'id' | 'createdAt' | 'updatedAt'> = {
        customerId: customer.id,
        jobNumber: crmService.generateJobNumber(),
        serviceType: formData.serviceType,
        jobDate: formData.moveDate,
        timeSlot: formData.timeSlot,
        crewSize: 2,
        fromAddress: formData.fromAddress,
        toAddress: formData.toAddress,
        status: 'scheduled',
        paymentStatus: 'pending',
        customerNotes: formData.notes,
      };

      const job = await crmService.createJob(jobData);
      return { customer, job };
    } catch (error) {
      console.error('Process quote data error:', error);
      throw error;
    }
  },

  // Get customer by email
  getCustomerByEmail: async (email: string): Promise<Customer | null> => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) return null;

      return {
        id: data.id,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zip_code,
        preferredContactMethod: data.preferred_contact_method,
        totalJobs: data.total_jobs,
        totalSpent: data.total_spent,
        averageRating: data.average_rating,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Get customer by email error:', error);
      return null;
    }
  },
};