import { supabase } from './supabase';

export type DocumentType =
  | 'contract'
  | 'policy'
  | 'invoice'
  | 'receipt'
  | 'quote'
  | 'photo'
  | 'signature'
  | 'other';

export interface Document {
  id: string;
  job_id: string;
  document_type: DocumentType;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  is_signed?: boolean;
  signed_at?: string;
  signed_by?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

const STORAGE_BUCKET = 'documents';

export const documentService = {
  uploadDocument: async (
    jobId: string,
    file: File | Blob,
    fileName: string,
    documentType: DocumentType,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; document?: Document; error?: string }> => {
    try {
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const path = `jobs/${jobId}/${documentType}/${timestamp}_${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const fileSize = file instanceof File ? file.size : file.size;
      const mimeType = file instanceof File ? file.type : 'application/octet-stream';

      const { data: document, error: dbError } = await supabase
        .from('documents')
        .insert({
          job_id: jobId,
          document_type: documentType,
          file_name: sanitizedFileName,
          file_path: path,
          file_size: fileSize,
          mime_type: mimeType,
          uploaded_by: userId,
          metadata,
        })
        .select()
        .single();

      if (dbError) {
        await supabase.storage.from(STORAGE_BUCKET).remove([path]);
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      return { success: true, document };
    } catch (error) {
      console.error('Document upload error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  },

  getDocumentUrl: async (filePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(filePath, 3600);

      if (error || !data) {
        console.error('Failed to create signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Get document URL error:', error);
      return null;
    }
  },

  getDocumentsByJobId: async (jobId: string, documentType?: DocumentType): Promise<Document[]> => {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('job_id', jobId);

      if (documentType) {
        query = query.eq('document_type', documentType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      return [];
    }
  },

  deleteDocument: async (documentId: string): Promise<boolean> => {
    try {
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (fetchError || !document) {
        throw new Error('Document not found');
      }

      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([document.file_path]);

      if (storageError) {
        console.error('Storage deletion failed:', storageError);
      }

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);

      return !dbError;
    } catch (error) {
      console.error('Document deletion error:', error);
      return false;
    }
  },

  markDocumentAsSigned: async (
    documentId: string,
    signedBy: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          is_signed: true,
          signed_at: new Date().toISOString(),
          signed_by: signedBy,
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return !error;
    } catch (error) {
      console.error('Failed to mark document as signed:', error);
      return false;
    }
  },

  getContractsByJobId: async (jobId: string): Promise<Document[]> => {
    return documentService.getDocumentsByJobId(jobId, 'contract');
  },

  getPoliciesByJobId: async (jobId: string): Promise<Document[]> => {
    return documentService.getDocumentsByJobId(jobId, 'policy');
  },

  getInvoicesByJobId: async (jobId: string): Promise<Document[]> => {
    return documentService.getDocumentsByJobId(jobId, 'invoice');
  },

  getSignedDocumentsByJobId: async (jobId: string): Promise<Document[]> => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('job_id', jobId)
        .eq('is_signed', true)
        .order('signed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to fetch signed documents:', error);
      return [];
    }
  },

  downloadDocument: async (filePath: string, fileName: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(filePath);

      if (error || !data) {
        throw new Error('Download failed');
      }

      if (typeof window !== 'undefined') {
        const url = URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      return true;
    } catch (error) {
      console.error('Document download error:', error);
      return false;
    }
  },

  generatePDFFromHTML: async (
    html: string,
    fileName: string,
    jobId: string,
    documentType: DocumentType,
    userId: string
  ): Promise<{ success: boolean; document?: Document; error?: string }> => {
    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          fileName,
        }),
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      const blob = await response.blob();

      return await documentService.uploadDocument(
        jobId,
        blob,
        fileName,
        documentType,
        userId,
        { generated: true, generatedAt: new Date().toISOString() }
      );
    } catch (error) {
      console.error('PDF generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed',
      };
    }
  },
};

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getDocumentIcon(documentType: DocumentType): string {
  const icons: Record<DocumentType, string> = {
    contract: '📄',
    policy: '📋',
    invoice: '🧾',
    receipt: '🧾',
    quote: '💰',
    photo: '📷',
    signature: '✍️',
    other: '📎',
  };

  return icons[documentType] || '📎';
}
