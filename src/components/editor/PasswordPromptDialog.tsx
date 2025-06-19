
"use client";

import { useState, useEffect, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { Presentation } from "@/types";
import { verifyPasswordAction } from '@/app/editor/actions';
import { KeyRound, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface PasswordPromptDialogProps {
  presentationId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPasswordVerified: () => void;
}

const formSchema = z.object({
  passwordAttempt: z.string().min(1, { message: "Password cannot be empty." }),
});
type FormSchemaType = z.infer<typeof formSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Unlock Presentation"}
    </Button>
  );
}

export function PasswordPromptDialog({ presentationId, isOpen, onOpenChange, onPasswordVerified }: PasswordPromptDialogProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  const [state, formAction] = useActionState(verifyPasswordAction, { 
    success: false,
    message: "",
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passwordAttempt: "",
    },
  });
  
  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast({ title: "Access Granted", description: state.message });
        onPasswordVerified();
        onOpenChange(false); 
      } else {
        toast({ title: "Access Denied", description: state.message, variant: "destructive" });
        form.resetField("passwordAttempt");
      }
    }
  }, [state, toast, onOpenChange, onPasswordVerified, form]);

  const handleDialogClose = () => {
    onOpenChange(false);
    if (!state?.success) { 
        toast({ title: "Access Required", description: "Password verification is needed to view this presentation.", variant: "info" });
        router.push('/dashboard'); 
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}> 
      <DialogContent className="sm:max-w-md" onEscapeKeyDown={handleDialogClose} onPointerDownOutside={(e)=> e.preventDefault()}> 
        <DialogHeader>
          <DialogTitle className="flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary"/> Password Required</DialogTitle>
          <DialogDescription>
            This presentation is password protected. Please enter the password to view its content.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4 py-2">
            <input type="hidden" name="presentationId" value={presentationId} />
            <div>
                <Label htmlFor="passwordAttempt">Password</Label>
                <Input 
                    id="passwordAttempt" 
                    name="passwordAttempt" 
                    type="password"
                    {...form.register("passwordAttempt")}
                    className="mt-1"
                    autoFocus
                />
                {form.formState.errors.passwordAttempt && <p className="text-xs text-destructive mt-1">{form.formState.errors.passwordAttempt.message}</p>}
            </div>
            <DialogFooter className="pt-2">
                 <SubmitButton />
            </DialogFooter>
             {state?.message && !state.success && (
                <p className="text-sm text-destructive text-center pt-1">{state.message}</p>
            )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
