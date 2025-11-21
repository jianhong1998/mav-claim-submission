'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { profileSchema, type ProfileFormData } from '@/schemas/profile-schema';
import {
  updateUserProfile,
  type UpdateUserResponse,
} from '@/api/users/update-profile';
import { Trash2, Plus } from 'lucide-react';

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    emailPreferences?: Array<{
      id: string;
      type: 'cc' | 'bcc';
      emailAddress: string;
    }>;
  };
  onSuccess?: (updatedUser: UpdateUserResponse) => void;
}

export function ProfileForm({ user, onSuccess }: ProfileFormProps) {
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      emailPreferences: user.emailPreferences || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'emailPreferences',
  });

  // Separate CC and BCC fields
  const ccFields = fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => field.type === 'cc');

  const bccFields = fields
    .map((field, index) => ({ field, index }))
    .filter(({ field }) => field.type === 'bcc');

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const updatedUser = await updateUserProfile(user.id, {
        name: data.name,
        emailPreferences: data.emailPreferences.map((pref) => ({
          type: pref.type,
          emailAddress: pref.emailAddress,
        })),
      });

      toast.success('Profile updated successfully');
      onSuccess?.(updatedUser);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update profile';
      toast.error(errorMessage);
    }
  };

  const addCCEmail = () => {
    append({ type: 'cc', emailAddress: '' });
  };

  const addBCCEmail = () => {
    append({ type: 'bcc', emailAddress: '' });
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        {/* Display Name Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Display Name</h3>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter your display name"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* CC Emails Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">CC Emails</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCCEmail}
              disabled={isSubmitting}
            >
              <Plus className="size-4" />
              Add CC Email
            </Button>
          </div>
          {ccFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No CC emails configured. Click &quot;Add CC Email&quot; to add
              one.
            </p>
          ) : (
            <div className="space-y-3">
              {ccFields.map(({ field, index }) => (
                <div
                  key={field.id}
                  className="flex gap-2"
                >
                  <FormField
                    control={form.control}
                    name={`emailPreferences.${index}.emailAddress`}
                    render={({ field: emailField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...emailField}
                            type="email"
                            placeholder="email@example.com"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                    aria-label={`Remove CC email ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* BCC Emails Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">BCC Emails</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addBCCEmail}
              disabled={isSubmitting}
            >
              <Plus className="size-4" />
              Add BCC Email
            </Button>
          </div>
          {bccFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No BCC emails configured. Click &quot;Add BCC Email&quot; to add
              one.
            </p>
          ) : (
            <div className="space-y-3">
              {bccFields.map(({ field, index }) => (
                <div
                  key={field.id}
                  className="flex gap-2"
                >
                  <FormField
                    control={form.control}
                    name={`emailPreferences.${index}.emailAddress`}
                    render={({ field: emailField }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            {...emailField}
                            type="email"
                            placeholder="email@example.com"
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    disabled={isSubmitting}
                    aria-label={`Remove BCC email ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form-level error message */}
        {form.formState.errors.emailPreferences?.message && (
          <p className="text-sm text-destructive">
            {form.formState.errors.emailPreferences.message}
          </p>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
