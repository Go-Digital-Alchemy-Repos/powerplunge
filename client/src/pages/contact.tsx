import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, CheckCircle2, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomerAuth } from "@/hooks/use-customer-auth";
import SiteLayout from "@/components/SiteLayout";
import SeoHead from "@/components/SeoHead";

interface ContactForm {
  name: string;
  email: string;
  type: string;
  subject: string;
  message: string;
  honeypot?: string;
}

export default function ContactPage() {
  const { customer, isAuthenticated } = useCustomerAuth();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    type: "general",
    subject: "",
    message: "",
  });

  const [prefilled, setPrefilled] = useState(false);
  if (isAuthenticated && customer && !prefilled) {
    setForm((prev) => ({
      ...prev,
      name: prev.name || customer.name || "",
      email: prev.email || customer.email || "",
    }));
    setPrefilled(true);
  }

  const { data: siteSettings } = useQuery<{
    supportEmail?: string;
    supportPhone?: string;
    companyName?: string;
  }>({
    queryKey: ["/api/site-settings"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings");
      if (!res.ok) return {};
      return res.json();
    },
    staleTime: 60000,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send message");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    submitMutation.mutate(form);
  };

  if (submitted) {
    return (
      <SiteLayout>
        <SeoHead pageTitle="Contact Us" metaDescription="Get in touch with our support team" />
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2" data-testid="text-success-title">Message Sent!</h2>
              <p className="text-muted-foreground mb-6" data-testid="text-success-description">
                Thank you for reaching out. We've received your message and will get back to you as soon as possible.
              </p>
              <div className="flex flex-col gap-3">
                <Button onClick={() => { setSubmitted(false); setForm({ name: customer?.name || "", email: customer?.email || "", type: "general", subject: "", message: "" }); }} variant="outline" data-testid="button-send-another">
                  Send Another Message
                </Button>
                <Button onClick={() => window.location.href = "/"} data-testid="button-back-home">
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <SeoHead pageTitle="Contact Us" metaDescription="Get in touch with our support team" />
      <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold mb-3" data-testid="text-contact-title">Contact Us</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto" data-testid="text-contact-subtitle">
            Have a question, concern, or need help with an order? Fill out the form below and our team will get back to you.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Send Us a Message
                </CardTitle>
                <CardDescription>
                  All fields marked with * are required
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
                    <input
                      type="text"
                      name="website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.honeypot || ""}
                      onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="contact-name">Your Name *</Label>
                      <Input
                        id="contact-name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Doe"
                        maxLength={100}
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contact-email">Email Address *</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="you@example.com"
                        data-testid="input-contact-email"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="contact-type">What can we help you with?</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) => setForm({ ...form, type: value })}
                    >
                      <SelectTrigger id="contact-type" data-testid="select-contact-type">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="shipping">Shipping Question</SelectItem>
                        <SelectItem value="return">Return Request</SelectItem>
                        <SelectItem value="refund">Refund Request</SelectItem>
                        <SelectItem value="technical">Technical Support</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="contact-subject">Subject *</Label>
                    <Input
                      id="contact-subject"
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Brief description of your inquiry"
                      maxLength={200}
                      data-testid="input-contact-subject"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-message">Message *</Label>
                    <Textarea
                      id="contact-message"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Please describe your question or issue in detail..."
                      rows={6}
                      maxLength={5000}
                      data-testid="input-contact-message"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-contact"
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {(siteSettings?.supportEmail || siteSettings?.supportPhone) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Other Ways to Reach Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {siteSettings.supportEmail && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <a
                          href={`mailto:${siteSettings.supportEmail}`}
                          className="text-sm text-primary hover:underline"
                          data-testid="link-support-email"
                        >
                          {siteSettings.supportEmail}
                        </a>
                      </div>
                    </div>
                  )}
                  {siteSettings.supportPhone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <a
                          href={`tel:${siteSettings.supportPhone}`}
                          className="text-sm text-primary hover:underline"
                          data-testid="link-support-phone"
                        >
                          {siteSettings.supportPhone}
                        </a>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What to Expect</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>We typically respond within 24 hours</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>You'll receive a confirmation email</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Track your request from your account</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
