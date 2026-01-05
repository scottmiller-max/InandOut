import { supabase } from './supabase';

/**
 * Professional Job Numbering System
 * Format: INO-{YYMM}-{XXXX}
 * Example: INO-2601-0001
 */

export async function generateJobNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `INO-${year}${month}`;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: existingJobs, error } = await supabase
    .from('jobs')
    .select('job_number')
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching existing jobs:', error);
    throw new Error('Failed to generate job number');
  }

  let sequenceNumber = 1;

  if (existingJobs && existingJobs.length > 0) {
    const lastJobNumber = existingJobs[0].job_number;
    if (lastJobNumber && lastJobNumber.startsWith(prefix)) {
      const lastSequence = parseInt(lastJobNumber.split('-')[2], 10);
      sequenceNumber = lastSequence + 1;
    }
  }

  const sequenceStr = sequenceNumber.toString().padStart(4, '0');
  return `${prefix}-${sequenceStr}`;
}

export async function generateMoveNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `INO-${year}${month}`;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: existingMoves, error } = await supabase
    .from('moves')
    .select('move_number')
    .gte('created_at', startOfMonth)
    .lte('created_at', endOfMonth)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching existing moves:', error);
    throw new Error('Failed to generate move number');
  }

  let sequenceNumber = 1;

  if (existingMoves && existingMoves.length > 0) {
    const lastMoveNumber = existingMoves[0].move_number;
    if (lastMoveNumber && lastMoveNumber.startsWith(prefix)) {
      const lastSequence = parseInt(lastMoveNumber.split('-')[2], 10);
      sequenceNumber = lastSequence + 1;
    }
  }

  const sequenceStr = sequenceNumber.toString().padStart(4, '0');
  return `${prefix}-${sequenceStr}`;
}

export function parseJobNumber(jobNumber: string): { year: number; month: number; sequence: number } | null {
  const parts = jobNumber.split('-');

  if (parts.length !== 3 || parts[0] !== 'INO') {
    return null;
  }

  const yearMonth = parts[1];
  const sequence = parts[2];

  if (yearMonth.length !== 4 || sequence.length !== 4) {
    return null;
  }

  const year = parseInt('20' + yearMonth.slice(0, 2), 10);
  const month = parseInt(yearMonth.slice(2, 4), 10);
  const sequenceNum = parseInt(sequence, 10);

  if (isNaN(year) || isNaN(month) || isNaN(sequenceNum)) {
    return null;
  }

  return { year, month, sequence: sequenceNum };
}

export function isValidJobNumber(jobNumber: string): boolean {
  return parseJobNumber(jobNumber) !== null;
}
