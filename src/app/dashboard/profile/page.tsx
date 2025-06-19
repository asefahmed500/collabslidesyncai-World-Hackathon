
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { SiteHeader } from '@/components/shared/SiteHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label'; // No longer needed if using FormLabel consistently
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfileServer, changePasswordServer, deleteUserAccountServer, AuthResponse } from '@/app/(auth)/actions';
import { useFormState, useFormStatus } from 'react-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form'; // Added FormDescription
import { Loader2, User, Save, KeyRound, ShieldAlert, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
  profilePictureUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, {message: "Current password is required."}),
  newPassword: z.string().min(8, { message: "New password must be at least 8 characters." }),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
});
type PasswordFormValues = z.infer<typeof passwordFormSchema>;


function ProfileSubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save Profile</Button>;
}
function PasswordSubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Change Password</Button>;
}


export default function ProfilePage() {
  const { currentUser, firebaseUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Profile Form
  const [profileFormState, profileFormAction] = useFormState(
    (prevState: any, formData: FormData) => updateUserProfileServer(currentUser!.id, formData),
    { success: false, message: "", user: null }
  );
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { name: currentUser?.name || "", profilePictureUrl: currentUser?.profilePictureUrl || "" },
  });

  // Password Form
  const [passwordFormState, passwordFormAction] = useFormState(
     (prevState: any, formData: FormData) => changePasswordServer(currentUser!.id, formData),
    { success: false, message: "" }
  );
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
    } else if (currentUser) {
      profileForm.reset({
        name: currentUser.name || "",
        profilePictureUrl: currentUser.profilePictureUrl || "",
      });
    }
  }, [currentUser, authLoading, router, profileForm]);

  useEffect(() => {
    if (profileFormState.message) {
      toast({ title: profileFormState.success ? "Success" : "Error", description: profileFormState.message, variant: profileFormState.success ? "default" : "destructive" });
      if (profileFormState.success) router.refresh(); // To reflect changes in useAuth hook
    }
  }, [profileFormState, toast, router]);

  useEffect(() => {
    if (passwordFormState.message) {
      toast({ title: passwordFormState.success ? "Success" : "Error", description: passwordFormState.message, variant: passwordFormState.success ? "default" : "destructive" });
      if (passwordFormState.success) passwordForm.reset();
      if (passwordFormState.requiresReauth) router.push('/login?reauth=true');
    }
  }, [passwordFormState, toast, passwordForm, router]);
  
  const handleDeleteAccount = async () => {
    if (!currentUser) return;
    // Simple confirmation, real app might need password re-auth for this
    const result = await deleteUserAccountServer(currentUser.id);
    if (result.success) {
      toast({ title: "Account Deleted", description: "Your account has been successfully deleted." });
      // Firebase signOut is called in useAuth on user deletion in firebase
      router.push('/'); 
    } else {
      toast({ title: "Deletion Failed", description: result.message, variant: "destructive" });
      if (result.requiresReauth) router.push('/login?reauth=true&next=/dashboard/profile');
    }
    setIsDeleteDialogOpen(false);
  };


  if (authLoading) {
    return <div className="flex min-h-screen flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  if (!currentUser) {
     return <div className="flex min-h-screen flex-col items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <SiteHeader />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-headline text-4xl font-bold text-primary flex items-center">
            <User className="mr-3 h-10 w-10" /> Profile & Settings
          </h1>
          <p className="text-muted-foreground">Manage your account details and preferences.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Profile Information Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your name and profile picture.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={currentUser.profilePictureUrl || `https://placehold.co/80x80.png?text=${currentUser.name?.charAt(0).toUpperCase()}`} alt={currentUser.name || "User"} data-ai-hint="user avatar large" />
                  <AvatarFallback>{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-semibold">{currentUser.name}</p>
                  <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                </div>
              </div>
              <Form {...profileForm}>
                <form action={profileFormAction} className="space-y-4">
                  <FormField control={profileForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="Your full name" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={profileForm.control} name="profilePictureUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profile Picture URL</FormLabel>
                      <FormControl><Input placeholder="https://example.com/image.png" {...field} /></FormControl>
                      <FormDescription>Enter a URL for your new profile picture.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <ProfileSubmitButton />
                  {profileFormState.message && !profileFormState.success && <p className="text-sm text-destructive mt-2">{profileFormState.message}</p>}
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Security Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your account security settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Change Password */}
              <div>
                <h3 className="text-md font-semibold mb-2">Change Password</h3>
                 {firebaseUser?.providerData.some(p => p.providerId === 'password') ? (
                    <Form {...passwordForm}>
                        <form action={passwordFormAction} className="space-y-4">
                        <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                            <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormDescription>Must be at least 8 characters.</FormDescription>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={passwordForm.control} name="confirmNewPassword" render={({ field }) => (
                            <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl><Input type="password" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <PasswordSubmitButton />
                        {passwordFormState.message && !passwordFormState.success && <p className="text-sm text-destructive mt-2">{passwordFormState.message}</p>}
                        </form>
                    </Form>
                 ) : (
                    <p className="text-sm text-muted-foreground">You signed in using a social provider. Password management is handled by your social provider.</p>
                 )}
              </div>
              <hr/>
              {/* 2FA - Placeholder */}
              <div>
                <h3 className="text-md font-semibold mb-2">Two-Factor Authentication (2FA)</h3>
                <p className="text-sm text-muted-foreground mb-3">Enhance your account security by enabling 2FA.</p>
                <Button variant="outline" disabled>Enable 2FA (Coming Soon)</Button>
              </div>
               <hr/>
              {/* Account Deletion */}
              <div>
                <h3 className="text-md font-semibold mb-2 text-destructive flex items-center"><ShieldAlert className="mr-2 h-5 w-5"/>Danger Zone</h3>
                 <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your account and all associated data from CollabSlideSyncAI.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        {/* TODO: Consider adding a password confirmation field here for extra safety */}
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            Yes, delete my account
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-muted-foreground mt-2">Permanently delete your account and all data.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <footer className="text-center p-4 text-muted-foreground text-sm border-t">
        © {new Date().getFullYear()} CollabSlideSyncAI.
      </footer>
    </div>
  );
}
