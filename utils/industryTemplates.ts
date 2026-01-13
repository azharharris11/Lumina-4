import { Package, WorkflowAutomation, ProjectStatus } from '../types';

export interface IndustryTemplate {
    packages: Partial<Package>[];
    automations: Partial<WorkflowAutomation>[];
    contractSnippet: string;
}

export const INDUSTRY_TEMPLATES: Record<string, IndustryTemplate> = {
    WEDDING: {
        packages: [
            { name: 'Wedding Essentials', price: 15000000, duration: 8, features: ['1 Photographer', '1 Assistant', 'Full Day Coverage', 'All Raw Files', '50 Edited Photos'], turnaroundDays: 30 },
            { name: 'Premium Wedding', price: 25000000, duration: 12, features: ['2 Photographers', 'Cinema Video', 'Luxury Album', 'Pre-Wedding Shoot Included'], turnaroundDays: 45 }
        ],
        automations: [
            { triggerStatus: 'BOOKED', tasks: ['Send Wedding Questionnaire', 'Create Moodboard', 'Confirm Venue Details'] },
            { triggerStatus: 'SHOOTING', tasks: ['Backup Memory Cards', 'Upload Previews to Social'] },
            { triggerStatus: 'REVIEW', tasks: ['Send Proofing Link', 'Ask for Album Selections'] }
        ],
        contractSnippet: "1. Retention: 50% deposit required to hold the date.\n2. Delivery: Edited photos within 45 days.\n3. Copyright: Photographer retains copyright for marketing purposes."
    },
    COMMERCIAL: {
        packages: [
            { name: 'Half Day Commercial', price: 5000000, duration: 4, features: ['Commercial Usage Rights', 'High-Res Digital Files', 'Basic Retouching'], turnaroundDays: 7 },
            { name: 'Full Day Production', price: 12000000, duration: 10, features: ['Extended Usage Rights', 'Creative Direction', 'Advanced Post-Production'], turnaroundDays: 14 }
        ],
        automations: [
            { triggerStatus: 'BOOKED', tasks: ['Review Brand Guidelines', 'Schedule Tech Scout', 'Finalize Crew List'] },
            { triggerStatus: 'REVIEW', tasks: ['Send Invoice for Final Payment', 'Obtain Usage Rights Signature'] }
        ],
        contractSnippet: "1. Usage Rights: Licensed for Digital and Social Media for 2 years.\n2. Payment: Net-15 from date of delivery.\n3. Expenses: Any props or rentals are billed separately."
    },
    PORTRAIT: {
        packages: [
            { name: 'Family Session', price: 1500000, duration: 1, features: ['10 Edited Photos', 'Studio or Outdoor', 'Online Gallery'], turnaroundDays: 5 },
            { name: 'Personal Branding', price: 3000000, duration: 2, features: ['20 Edited Photos', 'Multiple Outfit Changes', 'Commercial Headshot'], turnaroundDays: 5 }
        ],
        automations: [
            { triggerStatus: 'BOOKED', tasks: ['Send Styling Guide', 'Confirm Location Address'] },
            { triggerStatus: 'SHOOTING', tasks: ['Show Previews during shoot'] },
            { triggerStatus: 'REVIEW', tasks: ['Set up Upsell Gallery', 'Send Thank You message'] }
        ],
        contractSnippet: "1. Rescheduling: Allowed once with 48h notice.\n2. Selection: Client must select photos within 7 days."
    },
    RENTAL: {
        packages: [
            { name: 'Hourly Studio Rental', price: 350000, duration: 1, features: ['Standard Lighting Equipment', 'Wifi Access', 'Cleaning Fee Included'], turnaroundDays: 1 },
            { name: 'Full Day Rental', price: 3000000, duration: 10, features: ['Exclusive Use of Space', 'All Equipment Included', 'Free Coffee/Tea'], turnaroundDays: 1 }
        ],
        automations: [
            { triggerStatus: 'BOOKED', tasks: ['Send Entry Code', 'Verify Equipment List Needed'] },
            { triggerStatus: 'COMPLETED', tasks: ['Inspect Gear for Damage', 'Reset Studio Lights'] }
        ],
        contractSnippet: "1. Gear: Client is responsible for any damage to equipment.\n2. Overtime: Billed at 1.5x hourly rate.\n3. Capacity: Max 10 people in studio."
    }
};
