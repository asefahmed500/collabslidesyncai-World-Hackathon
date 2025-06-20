
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom"; 
import React, { useEffect, useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Zap, Mail, Send } from "lucide-react";
import { sendPasswordReset, AuthResponse } from "@/app/(auth)/actions"; 

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});
type ForgotPasswordFormValues = z.infer<typeof formSchema>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending..." : <><Send className="mr-2 h-4 w-4" /> Send Reset Link</>}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();

  const [formState, formAction] = useActionState<AuthResponse, FormData>(sendPasswordReset, { 
    success: false,
    message: "",
  });

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    if (formState.message) {
      if (formState.success) {
        toast({
          title: "Password Reset Email Sent",
          description: formState.message,
        });
        form.reset(); 
      } else {
        toast({
          title: "Error",
          description: formState.message,
          variant: "destructive",
        });
      }
    }
  }, [formState, toast, form]);

  const processForm: SubmitHandler<ForgotPasswordFormValues> = (data) => {
    const formData = new FormData();
    formData.append('email', data.email);
    formAction(formData);
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="text-center">
        <Zap className="mx-auto h-12 w-12 text-primary mb-2" />
        <CardTitle className="font-headline text-3xl">Forgot Password?</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(processForm)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <SubmitButton />
            {formState?.message && !formState.success && (
              <p className="text-sm font-medium text-destructive pt-2 text-center">{formState.message}</p>
            )}
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Remember your password?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
