
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFormStatus, useFormState } from "react-dom"; // Changed from React.useActionState
import React, { useEffect } from "react";

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
import { sendPasswordReset, AuthResponse } from "@/app/(auth)/actions"; // Updated action name

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

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

  const [formState, formAction] = useFormState<AuthResponse, FormData>(sendPasswordReset, { // Updated action name
    success: false,
    message: "",
  });

  const form = useForm<z.infer<typeof formSchema>>({
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
        form.reset(); // Clear form on success
      } else {
        toast({
          title: "Error",
          description: formState.message,
          variant: "destructive",
        });
      }
    }
  }, [formState, toast, form]);

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
          {/* 
            The form.handleSubmit wrapper is usually for client-side validation before calling formAction.
            Since useFormState handles server-side responses, direct formAction is fine.
            However, to ensure client-side validation fires, we can keep it.
          */}
          <form action={formAction} onSubmit={form.handleSubmit(() => form.control._formAction(form.getValues() as any))} className="space-y-6">
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
