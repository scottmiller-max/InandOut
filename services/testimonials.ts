/**
 * Real customer testimonials for In&Out Moving.
 *
 * These are ACTUAL 5-star reviews pulled from Scott's U-Haul Moving Help provider
 * dashboard. Keep them verbatim and attributed. To refresh, add/replace entries here in
 * ONE place — every screen reads from this list, so nothing is ever hard-coded or recycled.
 *
 * Each screen shows a DIFFERENT review via getTestimonial(index):
 *   Home = 0, Services = 1, Quote = 2  (and the pool rotates if you add more).
 */

export interface Testimonial {
  /** Public display name as shown on the review (first name + last initial). */
  name: string;
  /** The review text, verbatim. */
  text: string;
  /** Star rating (all featured reviews are 5). */
  rating: number;
  /** Where the review came from, e.g. "U-Haul Moving Help" or "Angi". */
  source: string;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    name: 'Kevin R.',
    text:
      'Fantastic work from In and Out. The team showed up on time and ended early. They met all of my expectations and were very professional.',
    rating: 5,
    source: 'U-Haul Moving Help',
  },
  {
    name: 'Soyun J.',
    text:
      'Scott and Henry are amazing professionals. They handled everything with great care and made the move so much easier. I truly appreciated their clear communication and flexibility. You won’t regret hiring them. Highly recommended!',
    rating: 5,
    source: 'U-Haul Moving Help',
  },
  {
    name: 'Alan L.',
    text:
      'Scott was top notch in his communication. Always responsive and provided helpful advice for my move. Scott and his helper, Henry were on time and very professional. Both are hard workers, efficient and treated my property with care. I highly recommend Scott and In and Out Movers.',
    rating: 5,
    source: 'U-Haul Moving Help',
  },
  {
    name: 'Steven C.',
    text: 'Very awesome people, extremely professional, did more than what was expected.',
    rating: 5,
    source: 'U-Haul Moving Help',
  },
  {
    name: 'Jorge C.',
    text: 'Arrived on time and were fast, friendly and efficient.',
    rating: 5,
    source: 'U-Haul Moving Help',
  },
];

/** Get a testimonial by position; wraps around so an out-of-range index is always safe. */
export function getTestimonial(index: number): Testimonial {
  return TESTIMONIALS[((index % TESTIMONIALS.length) + TESTIMONIALS.length) % TESTIMONIALS.length];
}
