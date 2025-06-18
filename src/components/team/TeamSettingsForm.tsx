
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useFormStatus, useFormState } from "react-dom";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { Team, User as AppUser } from "@/types";
import { updateTeamProfile as serverUpdateTeamProfile } from '@/app/teams/actions';
import { Loader2, Save, Palette, Settings as SettingsIcon, Image as ImageIcon } from "lucide-react"; // Renamed Settings to SettingsIcon

const formSchema = z.object({
  teamName: z.string().min(3, { message: "Team name must be at least 3 characters." }).max(50),
  logoUrl: z.string().url({ message: "Please enter a valid URL for the logo." }).optional().or(z.literal('')),
  primaryColor: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, { message: "Enter a valid hex color (e.g., #RRGGBB or #RGB)."}).optional().or(z.literal('')),
  secondaryColor: z.string().regex(/^#([0-9A-Fa-f]{3}){1,2}$/, { message: "Enter a valid hex color (e.g., #RRGGBB or #RGB)."}).optional().or(z.literal('')),
  fontPrimary: z.string().max(50, {message: "Font name too long."}).optional().or(z.literal('')),
  fontSecondary: z.string().max(50, {message: "Font name too long."}).optional().or(z.literal('')),
  allowGuestEdits: z.boolean().optional(),
  aiFeaturesEnabled: z.boolean().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

interface TeamSettingsFormProps {
  team: Team;
  currentUser: AppUser;
  onTeamUpdated: (updatedTeam: Team) => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      Save Team Settings
    </Button>
  );
}

export function TeamSettingsForm({ team, currentUser, onTeamUpdated }: TeamSettingsFormProps) {
  const { toast } = useToast();

  const [formState, formAction] = useFormState(
    async (prevState: any, formData: FormData) => {
      formData.append('teamId', team.id);
      return serverUpdateTeamProfile(prevState, formData);
    },
    { success: false, message: "", updatedTeam: null }
  );

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamName: team.name || "",
      logoUrl: team.branding?.logoUrl || "",
      primaryColor: team.branding?.primaryColor || "#3F51B5",
      secondaryColor: team.branding?.secondaryColor || "#FFC107",
      fontPrimary: team.branding?.fontPrimary || "Space Grotesk",
      fontSecondary: team.branding?.fontSecondary || "PT Sans",
      allowGuestEdits: team.settings?.allowGuestEdits || false,
      aiFeaturesEnabled: team.settings?.aiFeaturesEnabled === undefined ? true : team.settings.aiFeaturesEnabled,
    },
  });

  useEffect(() => {
    if (formState.message) {
      if (formState.success && formState.updatedTeam) {
        toast({
          title: "Team Settings Updated",
          description: formState.message,
        });
        onTeamUpdated(formState.updatedTeam as Team);
        // form.reset(formState.updatedTeam as FormSchemaType); // Re-sync form if needed
      } else if (!formState.success) {
        toast({
          title: "Update Failed",
          description: formState.message,
          variant: "destructive",
        });
      }
    }
  }, [formState, toast, onTeamUpdated, form]);

  const canEdit = team.members[currentUser.id]?.role === 'owner' || team.members[currentUser.id]?.role === 'admin';

  if (!canEdit) {
    return <p className="text-muted-foreground">You do not have permission to edit these settings.</p>;
  }

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-8">
        <FormField
          control={form.control}
          name="teamName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Name</FormLabel>
              <FormControl>
                <Input placeholder="Your Awesome Team" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-6 pt-6 border-t">
            <h3 className="text-lg font-semibold flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" />Branding</h3>
            <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
                <FormItem>
                <FormLabel className="flex items-center"><ImageIcon className="mr-2 h-4 w-4"/>Logo URL</FormLabel>
                <FormControl>
                    <Input placeholder="https://example.com/logo.png" {...field} />
                </FormControl>
                <FormDescription>Link to your team's logo image.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Primary Color</FormLabel>
                    <div className="flex items-center gap-2">
                        <Input type="color" value={field.value} onChange={field.onChange} className="w-12 h-10 p-1"/>
                        <Input placeholder="#3F51B5" {...field} />
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="secondaryColor"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Secondary Color</FormLabel>
                     <div className="flex items-center gap-2">
                        <Input type="color" value={field.value} onChange={field.onChange} className="w-12 h-10 p-1"/>
                        <Input placeholder="#FFC107" {...field} />
                    </div>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="fontPrimary"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Primary Font</FormLabel>
                    <FormControl>
                        <Input placeholder="Space Grotesk" {...field} />
                    </FormControl>
                     <FormDescription>e.g., 'Arial', 'Verdana', 'Space Grotesk'</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="fontSecondary"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Secondary Font</FormLabel>
                    <FormControl>
                        <Input placeholder="PT Sans" {...field} />
                    </FormControl>
                    <FormDescription>e.g., 'Times New Roman', 'PT Sans'</FormDescription>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
        </div>


        <div className="space-y-6 pt-6 border-t">
            <h3 className="text-lg font-semibold flex items-center"><SettingsIcon className="mr-2 h-5 w-5 text-primary"/>General Settings</h3>
            <FormField
            control={form.control}
            name="allowGuestEdits"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">Allow Guest Edits</FormLabel>
                    <FormDescription>
                    Permit users not formally in your team to edit public presentations (if link is shared).
                    </FormDescription>
                </div>
                <FormControl>
                    <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    name={field.name} // Ensure name is passed for form submission
                    />
                </FormControl>
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="aiFeaturesEnabled"
            render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm bg-card">
                <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable AI Features</FormLabel>
                    <FormDescription>
                    Allow team members to use AI-powered assistance for content and design.
                    </FormDescription>
                </div>
                <FormControl>
                    <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    name={field.name} // Ensure name is passed for form submission
                    />
                </FormControl>
                </FormItem>
            )}
            />
        </div>
        
        <div className="pt-6 border-t">
            <SubmitButton />
            {formState?.message && !formState.success && (
                <p className="text-sm font-medium text-destructive pt-2 text-center">{formState.message}</p>
            )}
        </div>
      </form>
    </Form>
  );
}
