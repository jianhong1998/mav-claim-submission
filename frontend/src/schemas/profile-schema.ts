import { z } from 'zod';

const emailPreferenceSchema = z.object({
  type: z.enum(['cc', 'bcc'], {
    message: 'Type must be either "cc" or "bcc"',
  }),
  emailAddress: z
    .string()
    .email({ message: 'Email address must be a valid email format' }),
});

export const profileSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: 'Name must be at least 1 character long' }),
    emailPreferences: z.array(emailPreferenceSchema),
  })
  .refine(
    (data) => {
      const emails = data.emailPreferences.map((pref) => pref.emailAddress);
      return emails.length === new Set(emails).size;
    },
    {
      message: 'Email addresses must be unique',
      path: ['emailPreferences'],
    },
  );

export type ProfileFormData = z.infer<typeof profileSchema>;
