import { supabase } from './supabase';
import { messagingService } from './messaging';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  order: number;
  completedAt?: string;
  completedBy?: string;
}

export interface JobChecklist {
  id: string;
  jobId: string;
  customerId: string;
  checklistItems: ChecklistItem[];
  completedItems: string[];
  progressPercentage: number;
  lastUpdatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const jobChecklistService = {
  // Get job checklist
  getJobChecklist: async (jobId: string): Promise<JobChecklist | null> => {
    try {
      // Return mock checklist data since table doesn't exist yet
      const defaultItems: ChecklistItem[] = [
        {
          id: 'paperwork',
          title: 'Paperwork & Documentation',
          description: 'Complete moving contracts and insurance forms',
          completed: true,
          order: 1,
          completedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          completedBy: 'Mike Rodriguez',
        },
        {
          id: 'packing_prep',
          title: 'Packing Preparation',
          description: 'Organize and prepare items for packing',
          completed: true,
          order: 2,
          completedAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
          completedBy: 'Mike Rodriguez',
        },
        {
          id: 'packing_start',
          title: 'Professional Packing',
          description: 'Team begins packing your belongings',
          completed: true,
          order: 3,
          completedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          completedBy: 'Sarah Chen',
        },
        {
          id: 'packing_complete',
          title: 'Packing Complete',
          description: 'All items packed and ready for loading',
          completed: true,
          order: 4,
          completedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          completedBy: 'Sarah Chen',
        },
        {
          id: 'loading_start',
          title: 'Loading Begins',
          description: 'Team starts loading truck',
          completed: true,
          order: 5,
          completedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          completedBy: 'Mike Rodriguez',
        },
        {
          id: 'loading_complete',
          title: 'Loading Complete',
          description: 'All items loaded and secured',
          completed: true,
          order: 6,
          completedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          completedBy: 'Team Lead',
        },
        {
          id: 'departure',
          title: 'Departure',
          description: 'Truck departs for destination',
          completed: true,
          order: 7,
          completedAt: new Date().toISOString(),
          completedBy: 'Mike Rodriguez',
        },
        {
          id: 'arrival',
          title: 'Arrival at Destination',
          description: 'Team arrives at your new location',
          completed: false,
          order: 8,
        },
        {
          id: 'unloading_start',
          title: 'Unloading Begins',
          description: 'Team starts unloading your items',
          completed: false,
          order: 9,
        },
        {
          id: 'unloading_complete',
          title: 'Unloading Complete',
          description: 'All items unloaded and placed',
          completed: false,
          order: 10,
        },
        {
          id: 'completion',
          title: 'Move Complete',
          description: 'Final walkthrough and completion',
          completed: false,
          order: 11,
        },
      ];

      const completedItems = defaultItems.filter(item => item.completed).map(item => item.id);
      const progressPercentage = Math.round((completedItems.length / defaultItems.length) * 100);

      return {
        id: 'mock-checklist-id',
        jobId: jobId,
        customerId: 'mock-customer-id',
        checklistItems: defaultItems,
        completedItems: completedItems,
        progressPercentage: progressPercentage,
        lastUpdatedBy: 'Mike Rodriguez',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Get job checklist error:', error);
      return null;
    }
  },

  // Create default checklist for job
  createDefaultChecklist: async (jobId: string): Promise<JobChecklist | null> => {
    try {
      // Get job details to find customer
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('customer_id')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      const defaultItems: ChecklistItem[] = [
        {
          id: 'paperwork',
          title: 'Paperwork & Documentation',
          description: 'Complete moving contracts and insurance forms',
          completed: false,
          order: 1,
        },
        {
          id: 'packing_prep',
          title: 'Packing Preparation',
          description: 'Organize and prepare items for packing',
          completed: false,
          order: 2,
        },
        {
          id: 'packing_start',
          title: 'Professional Packing',
          description: 'Team begins packing your belongings',
          completed: false,
          order: 3,
        },
        {
          id: 'packing_complete',
          title: 'Packing Complete',
          description: 'All items packed and ready for loading',
          completed: false,
          order: 4,
        },
        {
          id: 'loading_start',
          title: 'Loading Begins',
          description: 'Team starts loading truck',
          completed: false,
          order: 5,
        },
        {
          id: 'loading_complete',
          title: 'Loading Complete',
          description: 'All items loaded and secured',
          completed: false,
          order: 6,
        },
        {
          id: 'departure',
          title: 'Departure',
          description: 'Truck departs for destination',
          completed: false,
          order: 7,
        },
        {
          id: 'arrival',
          title: 'Arrival at Destination',
          description: 'Team arrives at your new location',
          completed: false,
          order: 8,
        },
        {
          id: 'unloading_start',
          title: 'Unloading Begins',
          description: 'Team starts unloading your items',
          completed: false,
          order: 9,
        },
        {
          id: 'unloading_complete',
          title: 'Unloading Complete',
          description: 'All items unloaded and placed',
          completed: false,
          order: 10,
        },
        {
          id: 'completion',
          title: 'Move Complete',
          description: 'Final walkthrough and completion',
          completed: false,
          order: 11,
        },
      ];

      const { data, error } = await supabase
        .from('job_checklists')
        .insert({
          job_id: jobId,
          customer_id: job.customer_id,
          checklist_items: defaultItems,
          completed_items: [],
          progress_percentage: 0,
        })
        .select()
        .single();

      if (error) throw error;

      return data ? {
        id: data.id,
        jobId: data.job_id,
        customerId: data.customer_id,
        checklistItems: data.checklist_items || [],
        completedItems: data.completed_items || [],
        progressPercentage: data.progress_percentage || 0,
        lastUpdatedBy: data.last_updated_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } : null;
    } catch (error) {
      console.error('Create default checklist error:', error);
      return null;
    }
  },

  // Complete checklist item
  completeChecklistItem: async (
    checklistId: string, 
    itemId: string, 
    completedBy: string = 'system'
  ): Promise<boolean> => {
    try {
      // Get current checklist
      const { data: checklist, error: getError } = await supabase
        .from('job_checklists')
        .select('*')
        .eq('id', checklistId)
        .single();

      if (getError) throw getError;

      // Update the specific item
      const updatedItems = checklist.checklist_items.map((item: ChecklistItem) => {
        if (item.id === itemId) {
          return {
            ...item,
            completed: true,
            completedAt: new Date().toISOString(),
            completedBy,
          };
        }
        return item;
      });

      // Update completed items array
      const completedItems = [...(checklist.completed_items || [])];
      if (!completedItems.includes(itemId)) {
        completedItems.push(itemId);
      }

      // Calculate progress
      const progressPercentage = Math.round((completedItems.length / updatedItems.length) * 100);

      const { error: updateError } = await supabase
        .from('job_checklists')
        .update({
          checklist_items: updatedItems,
          completed_items: completedItems,
          progress_percentage: progressPercentage,
          last_updated_by: completedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', checklistId);

      if (updateError) throw updateError;

      // Create milestone update
      const completedItem = updatedItems.find((item: ChecklistItem) => item.id === itemId);
      if (completedItem) {
        await messagingService.createMilestoneUpdate(
          checklist.job_id,
          itemId as any,
          `${completedItem.title}: ${completedItem.description}`
        );
      }

      return true;
    } catch (error) {
      console.error('Complete checklist item error:', error);
      return false;
    }
  },

  // Get all job checklists for customer
  getCustomerChecklists: async (customerId: string): Promise<JobChecklist[]> => {
    try {
      const { data, error } = await supabase
        .from('job_checklists')
        .select(`
          *,
          jobs!inner(job_number, job_date, status)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(checklist => ({
        id: checklist.id,
        jobId: checklist.job_id,
        customerId: checklist.customer_id,
        checklistItems: checklist.checklist_items || [],
        completedItems: checklist.completed_items || [],
        progressPercentage: checklist.progress_percentage || 0,
        lastUpdatedBy: checklist.last_updated_by,
        createdAt: checklist.created_at,
        updatedAt: checklist.updated_at,
      })) || [];
    } catch (error) {
      console.error('Get customer checklists error:', error);
      return [];
    }
  },

  // Auto-complete items based on milestone updates
  autoCompleteFromMilestone: async (jobId: string, milestoneType: string): Promise<boolean> => {
    try {
      const checklist = await jobChecklistService.getJobChecklist(jobId);
      if (!checklist) return false;

      // Map milestone types to checklist item IDs
      const milestoneToItemMap: Record<string, string> = {
        'arrival': 'paperwork',
        'packing_start': 'packing_start',
        'packing_finish': 'packing_complete',
        'loading_start': 'loading_start',
        'loading_finish': 'loading_complete',
        'departure': 'departure',
        'delivery_arrival': 'arrival',
        'unloading_start': 'unloading_start',
        'unloading_finish': 'unloading_complete',
        'completion': 'completion',
      };

      const itemId = milestoneToItemMap[milestoneType];
      if (itemId) {
        await jobChecklistService.completeChecklistItem(checklist.id, itemId, 'system');
      }

      return true;
    } catch (error) {
      console.error('Auto-complete from milestone error:', error);
      return false;
    }
  },
};